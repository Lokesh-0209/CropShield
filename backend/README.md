# CropShield Backend API

CropShield backend service built with Python and FastAPI, using Supabase (PostgreSQL) for persistence.

---

## 1. Environment Variables

Create a `.env` file in the project or `backend/` directory based on `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `HOST` | Host address for local server | `127.0.0.1` |
| `PORT` | Port for local server | `8000` |
| `ENVIRONMENT` | Runtime environment (`development`, `production`) | `development` |
| `SUPABASE_URL` | Supabase project API URL | `https://your-project.supabase.co` |
| `SUPABASE_KEY` | Supabase Service Role Key or Anon Key | `eyJhbGciOi...` |
| `CROPSHIELD_MODEL_PATH` | Path to MobileNetV3 TFLite model file | `ai/models/cropshield_mobilenetv3.tflite` |
| `CROPSHIELD_LABELS_PATH` | Path to disease class labels (JSON or text) | `ai/models/labels.json` |

> **Security Note:** Never commit your `.env` file to source control. It is ignored by `.gitignore`.

---

## 2. Supabase Database Setup

To set up the `cases` table:

1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** in the left navigation.
3. Open or copy the contents of the migration file:
   `app/db/migrations/001_create_cases_table.sql`
4. Run the script. This creates:
   - `pgcrypto` extension (for UUID generation)
   - `cases` table with UUID primary key and all diagnostic/lifecycle fields
   - Indexes on `status`, `crop`, and `created_at`

### Schema Overview:

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | Primary Key (`gen_random_uuid()`) |
| `crop` | `VARCHAR(100)` | No | Name of crop (e.g., Tomato) |
| `growth_stage` | `VARCHAR(100)` | No | Growth stage (e.g., Flowering) |
| `latitude` | `DOUBLE PRECISION` | No | Valid range: -90.0 to 90.0 |
| `longitude` | `DOUBLE PRECISION` | No | Valid range: -180.0 to 180.0 |
| `location_name` | `VARCHAR(255)` | No | Human-readable location identifier |
| `symptoms` | `TEXT` | No | Observed field symptoms |
| `image_url` | `TEXT` | Yes | URL to uploaded image |
| `disease` | `VARCHAR(150)` | Yes | Assigned by diagnosis in future milestone |
| `confidence` | `DOUBLE PRECISION` | Yes | Confidence score (0.0 - 1.0) |
| `risk_score` | `DOUBLE PRECISION` | Yes | Outbreak risk score |
| `risk_level` | `VARCHAR(50)` | Yes | Risk categorization |
| `status` | `VARCHAR(50)` | No | Initial default: `PENDING_ANALYSIS` |
| `created_at` | `TIMESTAMPTZ` | No | UTC timestamp |
| `verified_at` | `TIMESTAMPTZ` | Yes | Populated when transitioned to `VERIFIED` |
| `officer_note` | `TEXT` | Yes | Field officer / review notes |

---

## 3. Case Lifecycle & Status Transitions

### Supported Statuses:
- `PENDING_ANALYSIS`: Default status of a newly created case.
- `ANALYZED`: Case has completed analysis.
- `NEEDS_VERIFICATION`: Case is queued for field officer review.
- `VERIFIED`: Case confirmed and verified by an officer (terminal state).
- `REJECTED`: Case rejected (terminal state).
- `MORE_INFO_REQUIRED`: Case requires additional field data/images before verification.

### Allowed Lifecycle Transitions:

| Current Status | Allowed Next Statuses | Notes |
| :--- | :--- | :--- |
| `PENDING_ANALYSIS` | `ANALYZED` | Normal progression from new case |
| `ANALYZED` | `NEEDS_VERIFICATION` | Progresses to review queue |
| `NEEDS_VERIFICATION` | `VERIFIED`, `REJECTED`, `MORE_INFO_REQUIRED` | Review outcomes |
| `MORE_INFO_REQUIRED` | `NEEDS_VERIFICATION` | Resubmitted after info provided |
| `VERIFIED` | *(None - terminal)* | Immutable final state |
| `REJECTED` | *(None - terminal)* | Immutable final state |

*Any unauthorized transition (e.g. `PENDING_ANALYSIS -> VERIFIED` or `VERIFIED -> PENDING_ANALYSIS`) is rejected with **HTTP 409 Conflict**.*

---

## 4. How to Run the API Locally

### Setup Environment

From the `backend/` directory:

```bash
# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Start FastAPI Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 5. API Endpoints

### 5.1 Health Check: `GET /api/health`

Verifies that the API service is active.

```bash
curl -X GET http://127.0.0.1:8000/api/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "CropShield API"
}
```

---

### 5.2 Create Case: `POST /api/cases`

Registers a new crop disease diagnostic case with status `PENDING_ANALYSIS`.

#### Request Example:
```bash
curl -X POST http://127.0.0.1:8000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "location_name": "Nashik Zone 3",
    "symptoms": "Brown spots appearing on lower leaves",
    "image_url": null
  }'
```

#### Response (201 Created):
```json
{
  "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
  "status": "PENDING_ANALYSIS",
  "created_at": "2026-09-29T14:59:42.114809+00:00"
}
```

---

### 5.3 List Cases: `GET /api/cases`

Returns a paginated list of cases, with optional filtering by status.

#### Query Parameters:
- `status` *(optional)*: Filter by exact status (`PENDING_ANALYSIS`, `ANALYZED`, `NEEDS_VERIFICATION`, `VERIFIED`, `REJECTED`, `MORE_INFO_REQUIRED`).
- `limit` *(optional, default: 20, min: 1, max: 100)*: Number of records to return.
- `offset` *(optional, default: 0, min: 0)*: Number of records to skip.

#### Request Example:
```bash
curl -X GET "http://127.0.0.1:8000/api/cases?status=NEEDS_VERIFICATION&limit=10&offset=0"
```

#### Response (200 OK):
```json
{
  "items": [
    {
      "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
      "crop": "Tomato",
      "growth_stage": "Flowering",
      "latitude": 19.9975,
      "longitude": 73.7898,
      "location_name": "Nashik Zone 3",
      "symptoms": "Brown spots appearing on lower leaves",
      "image_url": null,
      "disease": null,
      "confidence": null,
      "risk_score": null,
      "risk_level": null,
      "status": "NEEDS_VERIFICATION",
      "created_at": "2026-09-29T14:59:42.114809+00:00",
      "verified_at": null,
      "officer_note": null
    }
  ],
  "limit": 10,
  "offset": 0
}
```

---

### 5.4 Get Case Detail: `GET /api/cases/{case_id}`

Retrieves the complete state of a single case by its UUID.

#### Request Example:
```bash
curl -X GET http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799
```

#### Response (200 OK):
```json
{
  "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
  "crop": "Tomato",
  "growth_stage": "Flowering",
  "latitude": 19.9975,
  "longitude": 73.7898,
  "location_name": "Nashik Zone 3",
  "symptoms": "Brown spots appearing on lower leaves",
  "image_url": null,
  "disease": null,
  "confidence": null,
  "risk_score": null,
  "risk_level": null,
  "status": "PENDING_ANALYSIS",
  "created_at": "2026-09-29T14:59:42.114809+00:00",
  "verified_at": null,
  "officer_note": null
}
```

*Returns **404 Not Found** if the UUID does not exist.*

---

### 5.5 Update Status: `PATCH /api/cases/{case_id}/status`

Performs a validated lifecycle transition on a case.

#### Request Examples:

**Transition to ANALYZED:**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ANALYZED"
  }'
```

**Transition to MORE_INFO_REQUIRED with Officer Note:**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "MORE_INFO_REQUIRED",
    "officer_note": "Please upload a clearer image of the affected leaves."
  }'
```

**Transition to VERIFIED (automatically sets `verified_at`):**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "VERIFIED"
  }'
```

#### Response (200 OK):
```json
{
  "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
  "crop": "Tomato",
  "growth_stage": "Flowering",
  "latitude": 19.9975,
  "longitude": 73.7898,
  "location_name": "Nashik Zone 3",
  "symptoms": "Brown spots appearing on lower leaves",
  "image_url": null,
  "disease": null,
  "confidence": null,
  "risk_score": null,
  "risk_level": null,
  "status": "VERIFIED",
  "created_at": "2026-09-29T14:59:42.114809+00:00",
  "verified_at": "2026-09-29T15:00:11.441738+00:00",
  "officer_note": null
}
```

*Returns **409 Conflict** if the transition is not allowed.*  
*Returns **422 Unprocessable Entity** if the status string is unrecognized.*  
*Returns **404 Not Found** if the case does not exist.*

---

### 5.6 Officer Verification: `PATCH /api/cases/{case_id}/verify`

Performs an agricultural officer verification review for a case currently in `NEEDS_VERIFICATION` status.

#### Request Parameters:
- `status` *(string, mandatory)*: Allowed verification outcomes: `VERIFIED`, `REJECTED`, or `MORE_INFO_REQUIRED`.
- `officer_note` *(string, mandatory)*: Detailed notes explaining the verification decision, symptoms confirmed, or information requested (1 to 2000 characters; whitespace-only strings rejected).

#### Request Examples:

**Verify Case:**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/verify \
  -H "Content-Type: application/json" \
  -d '{
    "status": "VERIFIED",
    "officer_note": "Symptoms and image are consistent with Early Blight."
  }'
```

**Request More Information:**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/verify \
  -H "Content-Type: application/json" \
  -d '{
    "status": "MORE_INFO_REQUIRED",
    "officer_note": "Please upload a clearer close-up photograph of the leaf underside."
  }'
```

**Reject Case:**
```bash
curl -X PATCH http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/verify \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "officer_note": "Image reveals mechanical hail damage rather than a pathogen."
  }'
```

#### Response (200 OK):
```json
{
  "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
  "crop": "Tomato",
  "growth_stage": "Flowering",
  "latitude": 19.9975,
  "longitude": 73.7898,
  "location_name": "Nashik Zone 3",
  "symptoms": "Brown spots appearing on lower leaves",
  "image_url": "https://example.com/leaf.jpg",
  "disease": "Early Blight",
  "confidence": 0.94,
  "risk_score": 75.0,
  "risk_level": "HIGH",
  "status": "VERIFIED",
  "created_at": "2026-09-29T14:59:42.114809+00:00",
  "verified_at": "2026-09-29T16:32:02.269670+00:00",
  "officer_note": "Symptoms and image are consistent with Early Blight."
}
```

*Notes on Behavior:*
- Sets `verified_at` to the current UTC timestamp when transitioning to `VERIFIED`.
- Leaves `verified_at` as `null` when transitioning to `REJECTED` or `MORE_INFO_REQUIRED`.
- Returns **409 Conflict** if the case is not currently in `NEEDS_VERIFICATION` status (e.g. `PENDING_ANALYSIS`, `ANALYZED`, or already `VERIFIED`/`REJECTED`).
- Returns **422 Unprocessable Entity** if `officer_note` is missing/empty or `status` is not one of `VERIFIED`, `REJECTED`, or `MORE_INFO_REQUIRED`.
- Returns **404 Not Found** if the case ID does not exist.

---

### 5.7 Analyze Case: `POST /api/cases/{case_id}/analyze`

Orchestrates AI computer vision disease prediction from the case image and evaluates deterministic outbreak risk, persisting diagnostic results and transitioning the case from `PENDING_ANALYSIS` to `ANALYZED`.

#### Request Parameters (Optional JSON Body):
- `temperature` *(float, optional, default: 25.0)*: Ambient temperature in °C (-50.0 to 60.0).
- `humidity` *(float, optional, default: 70.0)*: Relative humidity percentage (0.0 to 100.0).
- `rainfall` *(float, optional, default: 0.0)*: Recent rainfall in millimeters (>= 0.0).
- `nearby_verified_cases` *(int, optional, default: computed from DB)*: Count of verified cases within 5 km.

#### Request Example:
```bash
curl -X POST http://127.0.0.1:8000/api/cases/0d9f93ad-8b96-4ab3-891a-34c69c834799/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 27.5,
    "humidity": 82.0,
    "rainfall": 15.0,
    "nearby_verified_cases": 3
  }'
```

#### Response (200 OK):
```json
{
  "id": "0d9f93ad-8b96-4ab3-891a-34c69c834799",
  "crop": "Tomato",
  "growth_stage": "Flowering",
  "latitude": 19.9975,
  "longitude": 73.7898,
  "location_name": "Nashik Zone 3",
  "symptoms": "Brown spots appearing on lower leaves",
  "image_url": "https://example.com/leaf.jpg",
  "disease": "Tomato Early Blight",
  "confidence": 0.94,
  "risk_score": 78.0,
  "risk_level": "HIGH",
  "status": "ANALYZED",
  "created_at": "2026-09-29T14:59:42.114809+00:00",
  "verified_at": null,
  "officer_note": null
}
```

*Notes on Behavior:*
- **Prerequisite:** The case must be in `PENDING_ANALYSIS` status. If already analyzed or in another lifecycle state, returns **409 Conflict**.
- **Image Required:** The case must have a valid `image_url` (remote URL, local file, or base64 data URI). If missing or unreachable, returns **400 Bad Request**.
- **Unavailable Model Behavior:** If no model artifact is configured (`CROPSHIELD_MODEL_PATH`), returns **503 Service Unavailable** with `ModelNotAvailableError` detail. No fake predictions are generated, and the case status remains `PENDING_ANALYSIS`.
- **Subsequent Lifecycle:** Once `ANALYZED`, the case can be queued for review via `PATCH /api/cases/{case_id}/status` to `NEEDS_VERIFICATION`.

---

## 6. Running Automated Tests

Run the test suite using `pytest`:

```bash
# From the project root:
backend\.venv\Scripts\python.exe -m pytest backend\tests -v

# Or from the backend/ directory with activated venv:
pytest tests -v
```

---

## 7. AI Inference Foundation

CropShield uses a lightweight computer vision pipeline designed for MobileNetV3 transfer learning and TensorFlow Lite runtime.

### 7.1 Architecture

```text
Uploaded Image (raw bytes)
          ↓
[ImagePreprocessor]
  - Decode & verify image integrity
  - Convert to RGB
  - Resize to (224, 224)
  - Normalize float values [0.0, 1.0]
  - Output tensor shape: (1, 224, 224, 3)
          ↓
[AIInferenceService]
  - Execute TFLite model interpreter
  - Decode probability distribution (argmax)
  - Map index to disease label from class definitions
  - Bound confidence score strictly between 0.0 and 1.0
          ↓
[AIInferenceResult]
  - disease: "Early Blight"
  - confidence: 0.87
```

### 7.2 Model Availability & Configuration

> **Current Status:** AI inference service is implemented, but a production/prototype model artifact must be supplied before real disease predictions can be generated.

- When `CROPSHIELD_MODEL_PATH` is not configured or the `.tflite` model file is not present on disk, `AIInferenceService.is_model_available()` returns `False`.
- Any inference request made when the model is absent raises an explicit `ModelNotAvailableError`. The application **never** generates fake disease predictions or unverified confidence values.
- Once a trained `.tflite` artifact is placed at `ai/models/cropshield_mobilenetv3.tflite` (and configured in `.env`), the service will load the real TFLite interpreter and execute live inferences.

### 7.3 Testing the AI Inference Service

Automated tests in `tests/test_ai_inference.py` test:
- Schema validation: Valid confidence values (0.0–1.0) accepted, invalid values (>1.0 or <0.0) rejected with `ValidationError`.
- Image preprocessing: Corrupted/empty bytes rejected cleanly with `ImageValidationError`; valid images preprocessed to `(1, 224, 224, 3)` normalized float arrays.
- Missing model safety: Unconfigured model paths explicitly reject inference without fake outputs.
- Mocked adapter verification: Verifies decoding logic and label mapping in isolation from real model artifacts.

---

## 8. Deterministic Risk Engine

CropShield includes a deterministic, explainable rule-based risk calculation engine implemented in `app/services/risk_service.py`.

> **Important Clarification:** The risk engine is **NOT** an AI model. The calculated risk score is a relative, prototype outbreak indicator and is **NOT** a scientifically calibrated probability.

### 8.1 Risk Inputs

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `temperature` | `float` | -50.0 to 60.0 °C | Ambient temperature |
| `humidity` | `float` | 0.0 to 100.0 % | Relative humidity |
| `rainfall` | `float` | >= 0.0 mm | Recent precipitation |
| `crop` | `string` | Non-empty | Crop species (e.g. Tomato) |
| `growth_stage` | `string` | Non-empty | Physiological stage (e.g. Flowering) |
| `nearby_verified_cases` | `int` | >= 0 | Confirmed cases in surveillance zone |

### 8.2 Scoring Formula & Weights

The total score is the sum of 5 deterministic components, strictly bounded between **0 and 100**:

$$\text{Risk Score} = \min(100, \max(0, S_{\text{temp}} + S_{\text{humidity}} + S_{\text{rain}} + S_{\text{host}} + S_{\text{cases}}))$$

1. **Temperature Score ($S_{\text{temp}}$, max 20 pts):**
   - $22^\circ\text{C} \le T \le 29^\circ\text{C}$: **20 pts** (optimal fungal/bacterial sporulation)
   - $18^\circ\text{C} \le T < 22^\circ\text{C}$ or $29^\circ\text{C} < T \le 33^\circ\text{C}$: **15 pts**
   - $14^\circ\text{C} \le T < 18^\circ\text{C}$ or $33^\circ\text{C} < T \le 37^\circ\text{C}$: **8 pts**
   - Other extreme temperatures: **3 pts**

2. **Humidity Score ($S_{\text{humidity}}$, max 26 pts):**
   - $H \ge 85\%$: **26 pts** (prolonged spore germination)
   - $75\% \le H < 85\%$: **24 pts**
   - $65\% \le H < 75\%$: **18 pts**
   - $50\% \le H < 65\%$: **10 pts**
   - $H < 50\%$: **2 pts**

3. **Rainfall Score ($S_{\text{rain}}$, max 18 pts):**
   - $R \ge 25\text{ mm}$: **18 pts** (persistent leaf wetness & splash dispersal)
   - $10\text{ mm} \le R < 25\text{ mm}$: **14 pts**
   - $3\text{ mm} \le R < 10\text{ mm}$: **8 pts**
   - $0.1\text{ mm} \le R < 3\text{ mm}$: **3 pts**
   - $R = 0\text{ mm}$: **0 pts**

4. **Crop & Growth Stage Susceptibility ($S_{\text{host}}$, max 12 pts):**
   - Stage base points: Flowering (**6**), Fruiting (**6**), Seedling (**5**), Vegetative (**4**), Mature/Harvesting (**2**), Other (**3**).
   - Crop vulnerability bonus: Solanaceae / blight-susceptible species (Tomato, Potato, Pepper, Chilli): **+2 pts**.

5. **Nearby Verified Cases ($S_{\text{cases}}$, max 22 pts):**
   - Local transmission reservoir: $\min(22, \text{cases} \times 3)$ pts.

### 8.3 Risk Level Bands

| Score Range | Risk Level | Interpretation |
| :--- | :---: | :--- |
| **0 – 39** | `LOW` | Environmental conditions and disease pressure are unfavorable for spread |
| **40 – 69** | `MEDIUM` | Conditions moderately favor development; heightened monitoring advised |
| **70 – 100** | `HIGH` | Highly conducive environment and nearby presence; elevated risk |

---

### 8.4 API Endpoint: `POST /api/risk/analyze`

Calculates the deterministic risk score and category.

#### Request Example:
```bash
curl -X POST http://127.0.0.1:8000/api/risk/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 28,
    "humidity": 78,
    "rainfall": 12,
    "crop": "Tomato",
    "growth_stage": "Flowering",
    "nearby_verified_cases": 4
  }'
```

#### Response (200 OK):
```json
{
  "risk_score": 78,
  "risk_level": "HIGH"
}
```

---

## 9. Outbreak Intelligence (DBSCAN Spatial Clustering)

CropShield detects emerging geographical disease hotspots using Density-Based Spatial Clustering of Applications with Noise (**DBSCAN**) implemented in `app/services/outbreak_service.py`.

### 9.1 Why DBSCAN?

- **Arbitrary Outbreak Shapes:** Crop disease outbreaks spread along river valleys, wind corridors, and contiguous farming zones, forming irregular shapes rather than simple circles or ellipses.
- **No Predefined Cluster Count:** Unlike $k$-means, DBSCAN does not require guessing the number of outbreaks ($k$) beforehand; it discovers naturally occurring clusters.
- **Outlier / Noise Isolation:** DBSCAN naturally identifies isolated cases as noise points rather than forcing single occurrences into false outbreak alarms.
- **Verification Integrity:** Only confirmed `VERIFIED` cases are evaluated. Unconfirmed (`PENDING_ANALYSIS`, `ANALYZED`, `NEEDS_VERIFICATION`) or discarded (`REJECTED`) reports are completely ignored.

### 9.2 Haversine Geographic Distance

Because latitude and longitude are spherical coordinates, calculating distance as Euclidean ($L_2$) introduces severe geometric distortion. CropShield calculates distances using the great-circle **Haversine formula** ($R = 6371.0088\text{ km}$):

$$\Delta\phi = \text{radians}(\text{lat}_2 - \text{lat}_1), \quad \Delta\lambda = \text{radians}(\text{lon}_2 - \text{lon}_1)$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 \cdot R \cdot \text{atan2}(\sqrt{a}, \sqrt{1 - a}) \quad (\text{in kilometers})$$

### 9.3 Parameters: `eps_km` and `min_samples`

| Parameter | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `eps_km` | `float` | `2.0` | Maximum radius in kilometers to define a case's spatial neighborhood. |
| `min_samples` | `int` | `3` | Minimum verified cases within `eps_km` to establish a high-density cluster core. |

- **Core Points:** Verified cases with $\ge \text{min\_samples}$ neighbors within `eps_km`.
- **Border Points:** Cases within `eps_km` of a core point but possessing fewer than `min_samples` neighbors.
- **Noise Points:** Isolated cases not reachable from any core point. Noise points are omitted from cluster summaries.

### 9.4 API Endpoint: `GET /api/outbreaks/clusters`

#### Query Parameters:
- `eps_km` *(optional, float > 0, default: 2.0)*: Geographic search radius in km.
- `min_samples` *(optional, int >= 1, default: 3)*: Density threshold.

#### Request Example:
```bash
curl -X GET "http://127.0.0.1:8000/api/outbreaks/clusters?eps_km=2.0&min_samples=3"
```

#### Response Example (200 OK):
```json
{
  "clusters": [
    {
      "cluster_id": 0,
      "case_count": 4,
      "case_ids": [
        "0d9f93ad-8b96-4ab3-891a-34c69c834799",
        "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
        "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
        "3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e"
      ],
      "center_latitude": 17.385102,
      "center_longitude": 78.486045
    }
  ]
}
```

*If zero clusters meet the density threshold, returns `{"clusters": []}`.*

---

### 9.5 Outbreak Cluster Intelligence: `GET /api/outbreaks/intelligence`

Builds on top of DBSCAN spatial clustering to synthesize actionable epidemiological intelligence for every active cluster of confirmed `VERIFIED` cases (`app/services/outbreak_intelligence_service.py`).

#### Intelligence Flow:
```text
VERIFIED cases
     ↓
DBSCAN clustering (Haversine spatial grouping)
     ↓
Cluster Intelligence
  ├── Disease Aggregation (dominant disease by frequency)
  ├── Risk Aggregation (average risk score & highest risk level)
  └── Severity Triage (outbreak level classification)
     ↓
Actionable Outbreak Response
```

#### Aggregation Mechanics:
1. **Disease Aggregation:**
   - Evaluates confirmed disease diagnoses for all verified cases within the cluster.
   - Omitted or missing disease strings are cleanly ignored.
   - The disease with the highest occurrence is designated `dominant_disease` (with deterministic alphabetical tie-breaking).
   - If no disease data exists across cluster cases, returns `"UNKNOWN"`.
2. **Risk Aggregation:**
   - `average_risk_score`: Arithmetic mean of numeric case risk scores (rounded to 1 decimal place; defaults to `0.0` if unassigned).
   - `highest_risk_level`: Highest risk level present according to strict ordering: $\text{HIGH} > \text{MEDIUM} > \text{LOW}$.
3. **Exact Outbreak-Level Deterministic Rules:**
   - **`HIGH` Severity:**
     - `highest_risk_level == "HIGH"` and (`average_risk_score >= 60.0` or `case_count >= 5`), OR
     - `average_risk_score >= 70.0`, OR
     - `case_count >= 8`
   - **`MEDIUM` Severity:**
     - `highest_risk_level in ("HIGH", "MEDIUM")`, OR
     - `average_risk_score >= 40.0`, OR
     - `case_count >= 4`
   - **`LOW` Severity:**
     - All remaining clusters (e.g. low risk scores, minimal case count, low individual threat).

#### Query Parameters:
- `eps_km` *(optional, float > 0, default: 2.0)*: Maximum distance in kilometers between neighbor cases.
- `min_samples` *(optional, int >= 1, default: 3)*: Minimum verified cases required to qualify as a cluster.

#### Request Example:
```bash
curl -X GET "http://127.0.0.1:8000/api/outbreaks/intelligence?eps_km=2.0&min_samples=3"
```

#### Response Example (200 OK):
```json
{
  "clusters": [
    {
      "cluster_id": 0,
      "case_count": 4,
      "case_ids": [
        "0d9f93ad-8b96-4ab3-891a-34c69c834799",
        "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
        "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
        "3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e"
      ],
      "center_latitude": 17.385,
      "center_longitude": 78.486,
      "dominant_disease": "Leaf Blight",
      "average_risk_score": 76.5,
      "highest_risk_level": "HIGH",
      "outbreak_level": "HIGH"
    }
  ]
}
```

---

## 10. Officer Verification Workflow

CropShield implements an expert-in-the-loop verification mechanism where trained agricultural field officers review analyzed cases to maintain diagnostic reliability.

### 10.1 Workflow Architecture

```text
Case Created (PENDING_ANALYSIS)
        ↓
    ANALYZED (via inference service / diagnostic workflow)
        ↓
NEEDS_VERIFICATION (queued for field officer review)
        ↓
[PATCH /api/cases/{case_id}/verify]
   ├── VERIFIED             (sets verified_at; terminal immutable status)
   ├── REJECTED             (verified_at = null; terminal immutable status)
   └── MORE_INFO_REQUIRED   (verified_at = null; prompts farmer for details)
             ↓
    NEEDS_VERIFICATION      (resubmitted via PATCH /api/cases/{case_id}/status)
```

### 10.2 Lifecycle & Business Rules

1. **Prerequisite Status:** Verification can ONLY be performed when the case is in `NEEDS_VERIFICATION`. Attempting verification on `PENDING_ANALYSIS` or `ANALYZED` returns `HTTP 409 Conflict`.
2. **Mandatory Officer Note:** Every verification action requires a non-empty `officer_note` justifying the verdict.
3. **Timestamp Tracking:** `verified_at` is set to the current UTC timestamp exclusively upon transition to `VERIFIED`. For `REJECTED` or `MORE_INFO_REQUIRED`, `verified_at` remains `null`.
4. **Terminal States:** `VERIFIED` and `REJECTED` are final terminal states and cannot be transitioned or re-verified.
5. **Follow-up Progression:** Cases marked `MORE_INFO_REQUIRED` can return to `NEEDS_VERIFICATION` once additional evidence is supplied via `PATCH /api/cases/{case_id}/status`.
6. **Data Storage:** The verification workflow reuses the existing `status`, `officer_note`, and `verified_at` columns on the `cases` table without requiring extra relational overhead.

---

## 11. Case Analysis Workflow (AI & Risk Orchestration)

CropShield connects preliminary computer vision diagnosis and deterministic agro-meteorological risk assessment into a unified orchestration service (`app/services/case_analysis_service.py`).

### 11.1 Orchestration Flow

```text
Case in PENDING_ANALYSIS (with configured image source)
                    ↓
[POST /api/cases/{case_id}/analyze]
                    ↓
1. Image Ingestion (remote URL, local file, or base64 data URI)
                    ↓
2. AI Inference Service (MobileNetV3 / TFLite)
   ├── Success: extracts disease prediction + confidence score
   └── Failure / Missing Model: raises 503 (no fake data, status untouched)
                    ↓
3. Risk Engine Service (Deterministic calculation)
   - Evaluates ambient temperature, humidity, rainfall
   - Evaluates host crop susceptibility & growth stage
   - Evaluates verified infection pressure within local surveillance zone
   - Computes composite risk score (0-100) & categorical risk level
                    ↓
4. Atomic Persistence & Status Transition
   - Saves disease, confidence, risk_score, risk_level
   - Updates status to ANALYZED
                    ↓
Case Ready for Review Queue (ANALYZED -> NEEDS_VERIFICATION)
```

### 11.2 Safety & Model Availability Principles

- **No Fake Predictions:** CropShield strictly avoids generating synthetic, hardcoded, or random disease classifications when a real model artifact is unavailable.
- **Fail-Safe Invariance:** If AI inference cannot proceed due to missing model configuration, unreadable images, or preprocessing errors, the database record is **never** partially altered. Status remains `PENDING_ANALYSIS`.
- **Separation of Concerns:** `AIInferenceService` handles computer vision, `RiskService` handles deterministic environmental threat scoring, and `CaseAnalysisService` coordinates their lifecycle execution.

