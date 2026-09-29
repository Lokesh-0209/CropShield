from typing import Dict, Any
from app.models.risk import RiskLevel
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResponse


class RiskService:
    """
    Deterministic rule-based risk calculation engine for CropShield.
    Computes a composite outbreak risk score (0-100) and categorized risk level
    (LOW, MEDIUM, HIGH) based on environmental parameters, host susceptibility,
    and local disease pressure.
    """

    # Highly blight/rot-susceptible crops
    SUSCEPTIBLE_CROPS = {"tomato", "potato", "pepper", "chilli", "eggplant", "brinjal"}

    def calculate_risk(self, request: RiskAnalysisRequest) -> RiskAnalysisResponse:
        """
        Calculates a deterministic risk score between 0 and 100 and maps it to a risk level.
        The score is a relative prototype indicator, NOT a scientifically calibrated probability.
        """
        temp_pts = self._score_temperature(request.temperature)
        humidity_pts = self._score_humidity(request.humidity)
        rainfall_pts = self._score_rainfall(request.rainfall)
        crop_stage_pts = self._score_crop_and_stage(request.crop, request.growth_stage)
        cases_pts = self._score_nearby_cases(request.nearby_verified_cases)

        raw_score = temp_pts + humidity_pts + rainfall_pts + crop_stage_pts + cases_pts

        # Ensure strictly bounded within [0, 100]
        final_score = int(min(100, max(0, round(raw_score))))

        # Map to defined risk level bands:
        # 0–39:   LOW
        # 40–69:  MEDIUM
        # 70–100: HIGH
        if final_score <= 39:
            level = RiskLevel.LOW
        elif final_score <= 69:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.HIGH

        return RiskAnalysisResponse(
            risk_score=final_score,
            risk_level=level,
        )

    def _score_temperature(self, temp: float) -> int:
        """Evaluates temperature favorability for foliar fungal/bacterial pathogens (max 20 pts)."""
        if 22.0 <= temp <= 29.0:
            return 20
        elif 18.0 <= temp < 22.0 or 29.0 < temp <= 33.0:
            return 15
        elif 14.0 <= temp < 18.0 or 33.0 < temp <= 37.0:
            return 8
        else:
            return 3

    def _score_humidity(self, humidity: float) -> int:
        """Evaluates relative humidity impact on spore germination and infection (max 26 pts)."""
        if humidity >= 85.0:
            return 26
        elif humidity >= 75.0:
            return 24
        elif humidity >= 65.0:
            return 18
        elif humidity >= 50.0:
            return 10
        else:
            return 2

    def _score_rainfall(self, rainfall: float) -> int:
        """Evaluates leaf wetness duration and splash-dispersal potential from rainfall (max 18 pts)."""
        if rainfall >= 25.0:
            return 18
        elif rainfall >= 10.0:
            return 14
        elif rainfall >= 3.0:
            return 8
        elif rainfall > 0.0:
            return 3
        else:
            return 0

    def _score_crop_and_stage(self, crop: str, growth_stage: str) -> int:
        """Evaluates physiological vulnerability based on crop species and stage (max 12 pts)."""
        stage_norm = growth_stage.strip().lower()
        if "flower" in stage_norm:
            stage_pts = 6
        elif "fruit" in stage_norm:
            stage_pts = 6
        elif "seedling" in stage_norm:
            stage_pts = 5
        elif "veg" in stage_norm:
            stage_pts = 4
        elif "mature" in stage_norm or "harvest" in stage_norm:
            stage_pts = 2
        else:
            stage_pts = 3

        crop_norm = crop.strip().lower()
        crop_bonus = 2 if crop_norm in self.SUSCEPTIBLE_CROPS else 0

        return stage_pts + crop_bonus

    def _score_nearby_cases(self, nearby_cases: int) -> int:
        """Evaluates pathogen reservoir pressure from verified nearby cases (max 22 pts)."""
        if nearby_cases <= 0:
            return 0
        return min(22, nearby_cases * 3)


def get_risk_service() -> RiskService:
    """Dependency provider for RiskService."""
    return RiskService()
