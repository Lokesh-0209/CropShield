from enum import Enum


class RiskLevel(str, Enum):
    """Categorical risk bands for crop disease outbreak potential."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
