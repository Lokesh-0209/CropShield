# CropShield Frontend Architecture & Backend Handoff Guide

## 1. Overview & Architectural Upgrades

The CropShield frontend has completed Phases 0 through 5:
- **Role-Based Experience Architecture**: Dedicated, isolated experiences for **Farmers** (`/farmer/*` mobile-first with bottom app bar and vernacular support) and **Agricultural Officers** (`/officer/*` desktop surveillance command center with verified badge and spatial tools).
- **Zero-Dependency Mock Data Engine**: Deterministic mock database (`src/services/mockData.js`) and simulated ML pathogen inference enabled via `VITE_USE_MOCK=true`.
- **Performance & Code-Splitting**: Routes, Recharts, and Leaflet maps are dynamically imported with `React.lazy()` and Rollup chunk isolation (`vendor-react`, `vendor-charts`, `vendor-maps`, `vendor-ui`, `vendor-query`, `vendor-i18n`). Initial JS payload dropped from **1,320 kB** to **121 kB** (>90% reduction).
- **Mobile & Touch Responsiveness**: Fully responsive across 360px, 768px, and 1280px+ viewports with dynamic viewport units (`100dvh`), `min-height: 48px` tap targets, and automatic desktop table-to-card transformations.
- **Accessibility & UX Resiliency**: WCAG 2.1 AA focus trapping on all dialogs, polite `aria-live` announcement regions for toast notifications, skeleton loaders, and fallback states.

---

## 2. Route Directory & Access Control Matrix

| Route Path | Role Required | Component | Description |
| :--- | :--- | :--- | :--- |
| `/login` | Public | `LoginPage` | Role switcher (Farmer OTP phone login vs Officer ID credentials) |
| `/` | Authenticated | `RootRedirect` | Smart redirect to `/farmer/home` or `/officer/dashboard` |
| `/farmer/home` | Farmer | `FarmerHomePage` | Vernacular home feed with weather telemetry, risk advisory, quick actions |
| `/farmer/report` | Farmer | `FarmerSubmissionPage` | 4-step wizard: Image upload/camera/drag-and-drop, GPS, crop info, review |
| `/farmer/reports` | Farmer | `FarmerReportsPage` | History of submitted reports with status filters, search, and sync badges |
| `/farmer/reports/:id`| Farmer | `FarmerReportDetailPage` | Report status timeline, AI diagnosis details, verified notes, and treatment guidance |
| `/farmer/alerts` | Farmer | `FarmerAlertsPage` | Localized crop pest & disease advisories with severity badges and audio guidance |
| `/officer/dashboard` | Officer | `OfficerDashboardSummaryPage` | Executive surveillance metrics, daily caseload trends, high-risk case feed |
| `/officer/queue` | Officer | `OfficerDashboardPage` | Operational verification queue with search, crop/status filters, and inline verification |
| `/officer/cases/:id` | Officer | `OfficerCaseReviewPage` | High-resolution case triage, deep-zoom inspection, audit timeline, verification actions |
| `/officer/outbreaks` | Officer | `OutbreakIntelligencePage` | Spatial DBSCAN outbreak cluster visualization, cluster sensitivity tuning, epicenter radius |
| `/officer/inspect` | Officer | `OfficerInspectNextPage` | Sentinel queue ranking by epidemiological urgency, inspector assignments |
| `/officer/alerts` | Officer | `AlertsPage` | District-wide outbreak warnings, affected farmer metrics, advisory dispatching |
| `/officer/risk-sim` | Officer | `RiskSimulatorPage` | Meteorological pathogen simulator (temperature, humidity, precipitation, cluster density) |
| `*` | Any | `RoleAwareNotFound` | 404 page with role-aware return navigation |

---

## 3. Component Inventory

### Common Components (`src/components/common/`)
- `Button.jsx`: Accessible button with loading spinner, variants (`primary`, `secondary`, `outline`, `danger`, `ghost`), and minimum 44px tap target.
- `Input.jsx`, `Select.jsx`, `Textarea.jsx`: Form inputs with integrated label, validation error feedback, and focus ring.
- `Card.jsx`, `StatCard.jsx`: Surface containers; `StatCard` displays "—" gracefully during fetch failures.
- `Modal.jsx`: Focus-trapped, escape-dismissible, backdrop-closing accessible dialog.
- `Badge.jsx`, `StatusBadge.jsx`, `RiskBadge.jsx`: Standardized semantic chips for verification status and epidemiological risk.
- `Skeleton.jsx`: Accessible placeholder shimmer loaders matching target dimensions.
- `Toast.jsx`: Non-obtrusive floating toast notifications integrated with `ToastContext` (`aria-live="polite"`).
- `PageHeader.jsx`: Semantic header with title, subtitle, and responsive actions slot.
- `OfflineIndicator.jsx`: Real-time browser connectivity banner with pending sync queue counters.
- `RouteLoadingFallback.jsx`: Centered brand pulse loader for code-split route boundaries.
- `ErrorBoundary.jsx`, `ErrorState.jsx`: Resilient error handling with retry actions and production message sanitization.

### Farmer Components (`src/components/farmer/`)
- `ImageInput.jsx`: Multi-source image input supporting device file selection, live camera viewfinder capture, drag-and-drop, URL input, image dimension/size validation, and client-side canvas compression.
- `LocationPicker.jsx`: Dual-mode location input with native GPS geolocation fetching and interactive Leaflet map pin selection.
- `VoiceInputButton.jsx`: Speech-to-text integration for vernacular symptom input in English, Hindi, and Kannada.

### Officer Components (`src/components/officer/`)
- `OfficerLeafletMap.jsx`: Interactive OpenStreetMap tile renderer with DBSCAN cluster circles, color-coded severity markers, and bidirectional list hover sync.
- `ZoomableImage.jsx`: Pan-and-zoom modal viewer with magnification controls, reset, and smooth pan.
- `CaseTrendChart.jsx`: Recharts-powered temporal caseload visualization showing daily incoming, verified, and high-risk case distributions.
- `RiskGauge.jsx`: Radial SVG meter visualizing calculated epidemiological risk scores (0–100).
- `AssignInspectionModal.jsx`: Modal dialog for assigning field inspection officers to sentinel cases.

---

## 4. Dependencies Added

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` & `react-dom` | `^19.2.8` | Core UI engine |
| `react-router-dom` | `^7.18.4` | Client-side routing with nested layouts and route guards |
| `@tanstack/react-query` | `^5.104.0` | Server state caching, background refetching, and mutation orchestration |
| `leaflet` | `^1.9.4` | Interactive spatial maps for disease clusters and GPS verification |
| `recharts` | `^3.10.1` | Surveillance trend charts and epidemiological time-series curves |
| `lucide-react` | `^1.48.0` | Lightweight modern UI icons |
| `i18next` & `react-i18next`| `^26.4.2` / `^17.0.15` | Multi-language localization (English, Hindi, Kannada) |
| `react-hook-form` & `zod` | `^7.89.0` / `^4.6.5` | Schema-driven form validation |
| `idb` | `^8.0.3` | IndexedDB wrapper for offline case queueing and syncing |
| `vite-plugin-pwa` | `^1.3.0` | Progressive Web App manifest and service worker generation |

---

## 5. Backend FastAPI Handoff: Endpoint Contract Specifications

To transition from mock mode (`VITE_USE_MOCK=true`) to the real FastAPI backend (`VITE_USE_MOCK=false`), implement or verify the following 11 endpoints in FastAPI.

### 5.1. Authentication: Login
- **Frontend Function**: `login(credentials)` in `src/services/api.js`
- **Method & Path**: `POST /api/auth/login`
- **Expected Request Shape**:
  ```json
  // For Farmer:
  {
    "role": "farmer",
    "phone": "+91 98450 12345",
    "otp": "123456"
  }

  // For Officer:
  {
    "role": "officer",
    "officerId": "KA-AGRI-042",
    "password": "officer-secure-password"
  }
  ```
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "KA-AGRI-042",
      "name": "Dr. Suresh Patil",
      "role": "officer",
      "district": "Kolar",
      "email": "suresh.patil@agri.kar.gov.in"
    }
  }
  ```

---

### 5.2. Authentication: Logout
- **Frontend Function**: `logout()` in `src/services/api.js`
- **Method & Path**: `POST /api/auth/logout`
- **Expected Request Shape**: `{}` (Bearer token in `Authorization` header)
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "success": true,
    "message": "Session invalidated"
  }
  ```

---

### 5.3. Case List & Search
- **Frontend Function**: `getCases(params)` in `src/services/api.js`
- **Method & Path**: `GET /api/cases`
- **Query Parameters**:
  - `status` (string, optional): e.g. `NEEDS_VERIFICATION`, `VERIFIED`, `REJECTED`, `ALL`
  - `crop` (string, optional): e.g. `Tomato`, `Potato`, `Maize`, `ALL`
  - `search` (string, optional): Case ID or symptom substring
  - `limit` (integer, optional): default `100`
  - `offset` (integer, optional): default `0`
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "items": [
      {
        "id": "CASE-KA-001",
        "crop": "Tomato",
        "growth_stage": "Fruiting",
        "disease": "Tomato Early Blight",
        "confidence": 0.94,
        "risk_score": 82,
        "risk_level": "HIGH",
        "status": "NEEDS_VERIFICATION",
        "location_name": "Srinivaspur, Kolar",
        "latitude": 13.3379,
        "longitude": 78.2144,
        "symptoms": "Concentric dark brown rings on lower leaves",
        "image_url": "https://...",
        "created_at": "2026-03-29T10:15:00Z",
        "verified_at": null,
        "officer_note": null
      }
    ],
    "total": 48,
    "limit": 100,
    "offset": 0
  }
  ```

---

### 5.4. Get Single Case Details
- **Frontend Function**: `getCase(caseId)` in `src/services/api.js`
- **Method & Path**: `GET /api/cases/{case_id}`
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "id": "CASE-KA-001",
    "crop": "Tomato",
    "growth_stage": "Fruiting",
    "disease": "Tomato Early Blight",
    "confidence": 0.94,
    "risk_score": 82,
    "risk_level": "HIGH",
    "status": "NEEDS_VERIFICATION",
    "location_name": "Srinivaspur, Kolar",
    "latitude": 13.3379,
    "longitude": 78.2144,
    "symptoms": "Concentric dark brown rings on lower leaves",
    "image_url": "https://...",
    "created_at": "2026-03-29T10:15:00Z",
    "verified_at": null,
    "officer_note": null,
    "environmental_data": {
      "temperature": 27.5,
      "humidity": 84.0,
      "rainfall": 18.2,
      "nearby_verified_cases": 4
    },
    "history": [
      {
        "id": "HIST-01",
        "actor": "System AI Diagnostics",
        "action": "Initial classification: Tomato Early Blight (94%)",
        "status": "NEEDS_VERIFICATION",
        "timestamp": "2026-03-29T10:15:05Z",
        "notes": "Deep learning inference model v2.4"
      }
    ]
  }
  ```

---

### 5.5. Submit New Case & Trigger AI Inference
- **Frontend Function**: `submitCase(caseData)` in `src/services/api.js`
- **Method & Path**:
  1. `POST /api/cases` (creates record)
  2. `POST /api/cases/{case_id}/analyze` (triggers computer vision & epidemiological risk scoring)
- **Step 1: Create Case Request Shape**:
  ```json
  {
    "crop": "Tomato",
    "growth_stage": "Vegetative",
    "latitude": 13.1368,
    "longitude": 78.1348,
    "location_name": "Kolar Agri Sector",
    "symptoms": "Yellowing leaves with black concentric spots",
    "image_url": "data:image/jpeg;base64,..."
  }
  ```
- **Step 2: Analyze Case Request Shape**:
  ```json
  {
    "temperature": 26.5,
    "humidity": 80.0,
    "rainfall": 12.0
  }
  ```
- **Expected Unified Response Shape (`HTTP 200` / `HTTP 201`)**:
  ```json
  {
    "id": "CASE-KA-052",
    "crop": "Tomato",
    "growth_stage": "Vegetative",
    "disease": "Tomato Early Blight",
    "confidence": 0.89,
    "risk_score": 76.5,
    "risk_level": "HIGH",
    "status": "NEEDS_VERIFICATION",
    "location_name": "Kolar Agri Sector",
    "latitude": 13.1368,
    "longitude": 78.1348,
    "created_at": "2026-03-30T14:00:00Z"
  }
  ```

---

### 5.6. Verify / Reclassify / Reject Case
- **Frontend Function**: `verifyCase(caseId, verification)` in `src/services/api.js`
- **Method & Path**: `PATCH /api/cases/{case_id}/verify`
- **Expected Request Shape**:
  ```json
  {
    "status": "VERIFIED", // "VERIFIED" | "REJECTED" | "NEEDS_INFO"
    "officer_note": "Confirmed Early Blight via microscopic inspection; copper spray advised.",
    "disease": "Tomato Early Blight" // optional reclassified pathogen
  }
  ```
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "id": "CASE-KA-001",
    "status": "VERIFIED",
    "disease": "Tomato Early Blight",
    "officer_note": "Confirmed Early Blight via microscopic inspection; copper spray advised.",
    "verified_at": "2026-03-30T14:15:00Z"
  }
  ```

---

### 5.7. Outbreak Intelligence & Spatial Clusters
- **Frontend Function**: `getOutbreaks(params)` & `recalculateOutbreaks(params)` in `src/services/api.js`
- **Method & Path**: `GET /api/outbreaks/intelligence`
- **Query Parameters**:
  - `eps_km` (float, optional): DBSCAN epsilon radius in kilometers (default `2.0`)
  - `min_samples` (integer, optional): Min case samples to form a cluster (default `3`)
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "clusters": [
      {
        "id": "CLUSTER-KA-01",
        "name": "Kolar Tomato Blight Cluster",
        "crop": "Tomato",
        "disease": "Tomato Early Blight",
        "case_count": 14,
        "risk_level": "HIGH",
        "center_lat": 13.142,
        "center_lon": 78.139,
        "radius_km": 2.4,
        "case_ids": ["CASE-KA-001", "CASE-KA-004", "CASE-KA-007"],
        "detected_at": "2026-03-25T08:00:00Z"
      }
    ]
  }
  ```

---

### 5.8. Disease Surveillance Alerts & Warnings
- **Frontend Function**: `getAlerts(params)` in `src/services/api.js`
- **Method & Path**: `GET /api/alerts`
- **Query Parameters**:
  - `severity` (string, optional): `HIGH`, `MEDIUM`, `LOW`, `ALL`
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "alerts": [
      {
        "id": "ALERT-KA-2026-01",
        "district": "Kolar",
        "outbreak_level": "HIGH",
        "disease": "Tomato Early Blight",
        "crop": "Tomato",
        "affected_farmers_estimate": 450,
        "title": "Severe Early Blight Cluster Detected in Srinivaspur",
        "description": "Continuous high relative humidity (>85%) has accelerated sporulation.",
        "advisory": "Apply Mancozeb 75 WP (2g/L) or Copper Oxychloride (3g/L) immediately.",
        "created_at": "2026-03-28T09:00:00Z"
      }
    ]
  }
  ```

---

### 5.9. Meteorological Epidemiological Risk Simulator
- **Frontend Function**: `runRiskSimulation(riskInput)` in `src/services/api.js`
- **Method & Path**: `POST /api/risk/analyze`
- **Expected Request Shape**:
  ```json
  {
    "crop": "Tomato",
    "growth_stage": "Fruiting",
    "temperature": 27.5,
    "humidity": 82.0,
    "rainfall": 15.0,
    "nearby_verified_cases": 3
  }
  ```
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "risk_score": 78.4,
    "risk_level": "HIGH",
    "breakdown": {
      "thermal_suitability": 32.0,
      "canopy_humidity_contribution": 28.7,
      "precipitation_leaf_wetness": 12.0,
      "weather_total": 72.7,
      "crop_stage_vulnerability": 9.0,
      "cluster_proximity_density": 12.0
    }
  }
  ```

---

### 5.10. Sentinel Active Surveillance Queue
- **Frontend Function**: `getSurveillanceQueue(params)` in `src/services/api.js`
- **Method & Path**: `GET /api/surveillance/queue`
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "queue": [
      {
        "id": "SENTINEL-KA-001",
        "district": "Kolar",
        "priority_score": 96,
        "crop": "Tomato",
        "suspected_pathogen": "Tomato Early Blight",
        "lead_officer": "Dr. Suresh Patil",
        "last_inspection_date": "2026-03-27",
        "status": "PENDING_INSPECTION"
      }
    ]
  }
  ```

---

### 5.11. Agro-Meteorological Weather Telemetry
- **Frontend Function**: `getWeather(lat, lon)` in `src/services/api.js`
- **Method & Path**: `GET /api/weather`
- **Query Parameters**:
  - `lat` (float): Latitude
  - `lon` (float): Longitude
- **Expected Response Shape (`HTTP 200`)**:
  ```json
  {
    "latitude": 13.1368,
    "longitude": 78.1348,
    "location": "Kolar Agro-Climatic Zone",
    "temperature": 26.5,
    "humidity": 78.0,
    "rainfall": 12.0,
    "wind_speed_kmh": 14.2,
    "wind_direction": "SSW",
    "leaf_wetness_hours": 6.5,
    "dew_point": 22.4,
    "condition": "Humid & Overcast"
  }
  ```
