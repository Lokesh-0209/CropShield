# CropShield Frontend

> Autonomous Crop Disease Surveillance, AI Pathogen Diagnostics, Spatial Clustering & Outbreak Prevention Dashboard.

CropShield delivers a real-time, epidemiologically sound early warning system for crop diseases. It connects smallholder field observations with agricultural officers, spatial clustering engines (DBSCAN), and automated phytosanitary alerts.

---

## 1. Demo Flow

The application is structured around the 7-step surveillance lifecycle:

```text
[Farmer Submits Case]
         │
         ▼
[AI Diagnostic & Risk Scoring]  (Inference + Weather Risk)
         │
         ▼
[Officer Reviews Case]          (Officer Queue Triage)
         │
         ▼
[Officer Verification]          (VERIFIED / REJECTED / MORE_INFO_REQUIRED)
         │
         ▼
[Spatial Clusters Form]         (DBSCAN Geographic Clustering)
         │
         ▼
[Outbreak Intelligence Appears] (Dominant Pathogen & Outbreak Severity)
         │
         ▼
[Warning / Alert Dispatched]    (Automated Advisories for Growers)
```

---

## 2. Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
From the `frontend/` directory:

```bash
# On Windows PowerShell:
npm.cmd install

# On macOS/Linux:
npm install
```

---

## 3. Configuration (`VITE_API_BASE_URL`)

The frontend communicates with the CropShield FastAPI backend via a centralized client.

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default contents of `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

> **Note**: If your backend runs on a different port, hostname, or remote URL (e.g. `https://api.cropshield.example.com`), update `VITE_API_BASE_URL` in `.env`. Do not add a trailing slash.

---

## 4. Frontend Architecture

The codebase is organized modularly in `src/`:

```text
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   ├── client.js         # Centralized fetch wrapper with timeout, CORS & FastAPI error parsing
│   │   ├── cases.js          # /api/cases CRUD, analyze, and verification calls
│   │   ├── outbreaks.js      # /api/outbreaks/clusters & /api/outbreaks/intelligence
│   │   ├── alerts.js         # /api/alerts warning feed & specific cluster alerts
│   │   ├── risk.js           # /api/risk/analyze deterministic model endpoint
│   │   └── health.js         # /api/health backend liveness ping
│   ├── components/
│   │   ├── Navbar.jsx               # Header with brand, live health indicator & badge counts
│   │   ├── DemoFlowStepper.jsx      # Interactive 7-step pipeline navigator
│   │   ├── BackendStatusBanner.jsx  # Live health pill & reconnection instructions
│   │   ├── StatusBadge.jsx          # CaseStatus visual pills
│   │   ├── RiskBadge.jsx            # HIGH / MEDIUM / LOW severity tags with meters
│   │   ├── LocationMap.jsx          # Geographic & radar cluster visualization
│   │   ├── VerificationModal.jsx    # Officer verification review with mandatory notes
│   │   └── CaseDetailModal.jsx      # Complete case inspection dialog
│   ├── pages/
│   │   ├── FarmerSubmissionPage.jsx # Case submission + instant AI & risk diagnosis
│   │   ├── OfficerDashboardPage.jsx # Verification queue & case management
│   │   ├── OutbreakIntelligencePage.jsx # DBSCAN spatial clustering & cluster intelligence
│   │   ├── AlertsPage.jsx           # Outbreak advisories categorized by severity
│   │   └── RiskSimulatorPage.jsx    # Interactive environmental risk matrix tester
│   ├── types/
│   │   └── enums.js          # Exact backend enums (CaseStatus, RiskLevel, VerificationStatus)
│   ├── App.jsx               # Root application shell with toast alerts & tab routing
│   ├── App.css               # Agricultural tech design system & component styles
│   ├── index.css             # Base tokens, dark mode palette & typography
│   └── main.jsx              # React 19 entry point
├── .env.example
├── .env
├── package.json
└── vite.config.js
```

---

## 5. Backend API Dependency

The frontend integrates directly with the backend API contract implemented on branch `feature/backend`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/cases` | `POST` | Register a new field case (`PENDING_ANALYSIS`) |
| `/api/cases` | `GET` | List cases with optional status filter & pagination |
| `/api/cases/{case_id}` | `GET` | Retrieve complete details of a single case |
| `/api/cases/{case_id}/analyze` | `POST` | Trigger AI disease inference & risk scoring |
| `/api/cases/{case_id}/verify` | `PATCH` | Officer review (`VERIFIED`, `REJECTED`, `MORE_INFO_REQUIRED`) |
| `/api/risk/analyze` | `POST` | Deterministic micro-climate & density risk evaluation |
| `/api/outbreaks/clusters` | `GET` | DBSCAN spatial clusters among verified cases |
| `/api/outbreaks/intelligence` | `GET` | Aggregated cluster intelligence & severity |
| `/api/alerts` | `GET` | Active outbreak warnings & advisories |
| `/api/alerts/{cluster_id}` | `GET` | Cluster-specific warning details |
| `/api/health` | `GET` | Backend service liveness status |

---

## 6. How to Run the Frontend

### Development Server
Starts the local development server with Hot Module Replacement (HMR):

```bash
# On Windows PowerShell:
npm.cmd run dev

# On macOS/Linux:
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
Generates an optimized production bundle in `dist/`:

```bash
npm.cmd run build
```

### Linting
Validates code quality using Oxlint:

```bash
npm.cmd run lint
```
