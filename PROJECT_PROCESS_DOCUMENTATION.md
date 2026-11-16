# EcoTrack (Smart Waste Monitoring System)
## Complete End-to-End Project Process, Innovative Techniques & Cloud Deployment Documentation

**Live Production URL:** `https://smart-waste-monitoring.onrender.com`  
**GitHub Repository:** `https://github.com/Manimaranpro/smart-waste-cloud`

---

## 1. Executive Summary & Project Purpose

**EcoTrack (Smart Waste Monitoring System)** is a full-stack, cloud-hosted municipal solid waste monitoring, automated diagnostics, and field operations management platform. It establishes an accountable, closed-loop digital workflow connecting **Citizens**, **Municipal Sanitation Field Workers**, and **Municipal Ward Administrators**.

Conventional municipal waste apps fail in practice because they function as passive one-way grievance forms: citizens enter vague street addresses (often corrupted by urban GPS drift), human clerks manually guess waste types, truck drivers follow random unoptimized paths, and workers can falsely mark tickets as resolved without physical proof.

EcoTrack solves these real-world operational bottlenecks using an integrated pipeline of **Physical Dumpster QR Tagging**, **Multimodal AI Computer Vision (Gemini)**, **TSP + 2-Opt Multi-Stop Route Optimization**, **Photographic Closed-Loop Proof with On-Site GPS Stamping**, **6-Language Accessibility**, and **Dual-Persistence Cloud Storage**.

---

## 2. Problem Statement & Distinction from Existing Systems

| Operational Area | Traditional / Existing Civic Apps (e.g., Basic Portals) | EcoTrack (Our Implemented System) |
| :--- | :--- | :--- |
| **Location Accuracy** | Manual street typing or drifting mobile GPS pinpoints. | **Physical Dumpster QR Tagging** (`BIN-W12-04`, etc.) instantly pre-fills exact Bin ID, Ward, Address, and calibrated GPS coordinates + **Live GPS Pinpoint** accuracy check. |
| **Waste Classification** | Passive photo attachment; manual guesswork on material type and danger level. | **Multimodal AI Vision (`@google/genai`)** automatically detects material category, hazard level, confidence %, recyclable yield %, volume ($m^3$), $\text{CO}_2$ offset potential, and mandatory worker PPE/equipment. |
| **Field Routing** | Static unorganized task lists; drivers waste fuel driving back and forth. | **TSP + 2-Opt Multi-Stop Route Optimizer** computes the shortest path across pending ward stops using **Haversine Distance**, supports **Urgency & Hazard Priority**, estimates $\text{CO}_2$ saved, and launches **multi-stop Google Maps navigation**. |
| **Resolution Integrity** | Workers click "Done" with no verification ("ghost closures"). | **Closed-Loop Proof**: Requires side-by-side **Before vs. After Photos** + **On-Site GPS Timestamp Stamp** + **1–5 Star Citizen Feedback**. |
| **Language Inclusion** | Typically English-only, excluding sanitation staff and regional citizens. | **6-Language Localization Engine**: English, Tamil (`தமிழ்`), Tanglish, Hindi (`हिन्दी`), Telugu (`తెలుగు`), and Kannada (`ಕನ್ನಡ`). |
| **Reliability** | Fails if remote database connection drops during live use. | **Dual-Persistence Architecture**: MongoDB Atlas (Mongoose) with seamless high-speed cloud in-memory fallback. |

---

## 3. Technology Stack & Codebase Architecture

### Frontend Stack
- **Core:** React 19 + TypeScript (`~5.8.2`) bundled with Vite 6 (`vite.config.ts`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) with responsive design across desktop and mobile.
- **Icons & Visualization:** `lucide-react` for UI iconography; `recharts` for executive analytics (Pie charts & Bar charts).
- **QR Engine:** `qrcode` library for client-side high-error-correction (`H` level) PNG sticker generation.
- **State Persistence:** `localStorage` (`smartwaste_current_user`) synchronized with `/api/auth/me` session rehydration.

### Backend & AI Stack
- **Server Runtime:** Node.js + Express (`server.ts`) compiled via `esbuild` into `dist/server.cjs` for production.
- **AI Vision Pipeline:** `@google/genai` SDK invoking `gemini-3.8-flash` with strict JSON extraction prompts and calibrated offline fallback diagnostics.
- **Database Layer:** MongoDB Atlas via `mongoose` (`src/db/models.ts`) paired with an active in-memory store fallback.

### Project Directory Structure
```text
├── server.ts                         # Express server, API routes, Gemini AI integration, Vite/dist serving
├── package.json                      # Scripts (dev, build, start, lint) and dependencies
├── metadata.json                     # App capabilities (camera, geolocation, server-side Gemini API)
├── index.html                        # Root HTML entry point & SEO metadata
├── PROJECT_PROCESS_DOCUMENTATION.md  # Complete system & deployment process documentation
└── src/
    ├── App.tsx                       # Root state, API orchestration, role switching, session rehydration
    ├── types.ts                      # TypeScript interfaces (User, Complaint, WorkerProfile, DashboardStats)
    ├── db/
    │   └── models.ts                 # Mongoose schemas (UserModel, WorkerModel, ComplaintModel, NotificationModel)
    ├── data/
    │   ├── mockData.ts               # Initial seed users, workers, multi-ward complaints, notifications
    │   └── translations.ts           # 6-language localization dictionary (en, ta, tanglish, hi, te, kn)
    ├── utils/
    │   └── routeOptimizer.ts         # Haversine formula, Nearest Neighbor + 2-Opt TSP solver, Maps URL builder
    └── components/
        ├── Navbar.tsx                # Role switcher (Citizen / Worker / Admin), language selector, notifications, auth
        ├── AuthModal.tsx             # Sign-in, registration, and profile/avatar management
        ├── NotificationDrawer.tsx    # Real-time user notification drawer
        ├── CitizenPortal.tsx         # Complaint reporting, live GPS, Gemini AI scanner, feed, 5-star feedback
        ├── DumpsterQRModal.tsx       # Physical dumpster QR scanner simulator & custom PNG QR sticker generator
        ├── WorkerPortal.tsx          # Field task roster, live distance, before/after upload, GPS stamping
        ├── RouteOptimizerView.tsx    # Interactive TSP 2-Opt dashboard, topological sequence diagram, Maps launcher
        └── AdminPortal.tsx           # Executive KPIs, Recharts visualizations, ticket search/filter, worker dispatch
```

---

## 4. Core Innovative Techniques & Algorithms

### Technique 1: Physical Dumpster QR Tagging & PNG Sticker Generator (`DumpsterQRModal.tsx`)
- **Dual-Mode Operational System:**
  1. **Scan Mode (`Scan Dumpster QR`):** Citizens standing at municipal bins scan (or select from registered ward dumpsters like `BIN-W12-04`, `BIN-W08-02`, `BIN-W04-07`, `BIN-W02-09`) to decode structured JSON payloads containing `binId`, `ward`, `address`, `lat`, `lng`, `capacityLitres`, and `dumpsterType`.
  2. **Auto-Fill Pipeline:** Scanning automatically opens the complaint form, pre-populates the exact address, selects the municipal ward, locks GPS coordinates (`accuracy: 2m`), tags the waste type as `Overflowing Public Dumpster`, and displays a verified badge (`Physical Dumpster Tag Linked: BIN-...`).
  3. **Generator Mode (`QR Tag Generator`):** Ward administrators can customize a Bin ID, Ward, Address, Latitude/Longitude, Capacity (Litres), and Dumpster Type to render a municipal-branded QR sticker (Error Correction Level `H`) and download it directly as a print-ready `.png` file (`Download PNG`) or test it immediately (`Test Auto-Fill`).

### Technique 2: Multimodal AI Waste Vision & Hazard Diagnostics (`server.ts` $\rightarrow$ `/api/ai-analyze-waste`)
- Accepts base64-encoded waste photographs from the Citizen Portal.
- Sends image + structured engineering prompt to **Google Gemini (`gemini-3.8-flash`)** to extract:
  - `detectedType` (Plastic & Recyclable, Bio-degradable / Organic, E-Waste / Electronics, Hazardous & Medical, Construction & Heavy, Overflowing Public Dumpster, General Mixed Solid Waste)
  - `severity` (`Low`, `Medium`, `High`, `Critical`) & `hazardLevel` (`Safe`, `Moderate`, `Hazardous`, `Critical`)
  - `confidence` (%), `recyclablePercentage` (%), `estimatedVolume` (e.g., `0.85 m³`), `carbonOffsetKg` (kg $\text{CO}_2$ saved via recycling/diversion)
  - `recommendedEquipment` (e.g., *Hydraulic Compactor Truck + Puncture-Proof Nitrile Gloves*)
  - `estimatedFillPercent`, `recommendedPriority`, and `aiAnalysisNotes`
- Includes a **Calibrated Optical Diagnostic Fallback** so demonstrations and offline scenarios always return valid structured diagnostics without failing.

### Technique 3: TSP + 2-Opt Multi-Stop Field Route Optimization (`src/utils/routeOptimizer.ts` & `RouteOptimizerView.tsx`)
When a sanitation worker has multiple unresolved waste sites in their ward, the Worker Portal computes the optimal multi-stop visit sequence:

1. **Great-Circle Spatial Distance Matrix (Haversine Formula):**
   $$\Delta\sigma = 2 \arcsin \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}, \quad d = R \cdot \Delta\sigma \quad (R = 6371\text{ km})$$
2. **Phase A — Greedy Nearest-Neighbor Initialization:**
   - Starts from the worker's live GPS coordinate (`navigator.geolocation`) or municipal ward depot fallback (`18.5204, 73.8567`).
   - Supports two selectable optimization strategies:
     - **Shortest Distance (`tsp_2opt`):** Pure spatial distance minimization.
     - **Urgency & Hazard Priority (`urgency_priority`):** Applies severity weighting multipliers (`Critical = 0.35`, `High = 0.65`, `Medium = 0.88`, `Low = 1.0`) so bio-hazardous or critical overflows are prioritized while avoiding extreme detours.
3. **Phase B — 2-Opt Local Search Refinement:**
   - Iteratively tests edge swaps $(i, j)$ along the tour (up to 50 passes). Whenever reversing a sub-segment reduces total tour distance ($d_{new} < d_{old} - 0.001\text{ km}$), the crossing path is untangled—converging on a near-optimal TSP tour in $O(n^2)$ milliseconds.
4. **Operational Telemetry & Multi-Stop Navigation:**
   - Estimates per-leg driving time (urban municipal average ~24 km/h + intersection buffer) and per-site cleanup time (10–40 mins based on severity & heavy/dumpster waste type).
   - Computes **Distance Saved (km & %)** vs. naive unoptimized order and **Avoided Diesel $\text{CO}_2$ Emissions** (`distSaved * 0.28 kg CO₂/km`).
   - Renders a horizontal **Topological Route Sequence Diagram** and builds a 1-click **Multi-Stop Google Maps Directions URL** (`origin`, `waypoints`, `destination`).

### Technique 4: Closed-Loop Photographic Verification & Accountability (`WorkerPortal.tsx` & `CitizenPortal.tsx`)
- **Side-by-Side Visual Audit:** Citizens and admins see the original **Reported Photo** next to the worker's **Cleaned Photo (Proof)**.
- **On-Site GPS Timestamping:** Workers click **"Stamp GPS Location"** in the resolution modal to inject immutable device coordinates and local timestamp into the resolution log.
- **5-Step Municipal Pipeline Tracker:** Visually tracks `pending` $\rightarrow$ `assigned` $\rightarrow$ `in_progress` $\rightarrow$ `completed` $\rightarrow$ `verified`.
- **Citizen Rating Loop:** Once `completed` or `verified`, citizens submit a **1–5 Star Rating & Comment**, updating worker ratings across the system.

### Technique 5: Dual-Persistence Cloud Store (`server.ts` & `src/db/models.ts`)
- At startup, `connectToMongoDB()` checks `process.env.MONGODB_URI`.
- If configured, Mongoose connects to **MongoDB Atlas** and auto-seeds initial collections (`UserModel`, `WorkerModel`, `ComplaintModel`, `NotificationModel`) when empty.
- Every read/write syncs seamlessly with MongoDB **and** an active in-memory cloud store (`usersStore`, `workersStore`, `complaintsStore`, `notificationsStore`), ensuring zero downtime if MongoDB credentials are absent or network connectivity drops.

---

## 5. Complete End-to-End Working Process

```text
[1. AUTH & SESSION]
    └─► User signs in/registers via AuthModal (/api/auth/login or /api/auth/register)
    └─► Stored in localStorage & rehydrated on reload via GET /api/auth/me

[2. CITIZEN REPORTING (CitizenPortal + DumpsterQRModal)]
    ├─► Option A: Scan Dumpster QR -> Auto-fills Bin ID, Ward, Address, GPS
    ├─► Option B: Click "Live GPS" -> Browser Geolocation API locks lat/lng & accuracy
    ├─► Upload Photo -> POST /api/ai-analyze-waste -> Gemini returns material, hazard, volume, CO2, PPE
    └─► Submit -> POST /api/complaints -> Ticket created (Status: "pending") + Admin notified

[3. ADMIN COMMAND & DISPATCH (AdminPortal)]
    ├─► Views Analytics Tab: KPIs + Recharts Waste Pie Chart & Ward Bar Chart
    ├─► Views Complaints Tab: Searches/filters by Ward & Status -> Assigns Worker
    └─► POST /api/complaints/:id/assign -> Status becomes "assigned" + Worker/Citizen notified

[4. WORKER ROUTE OPTIMIZATION & CLEANUP (WorkerPortal + RouteOptimizerView)]
    ├─► Views "Multi-Stop Route Optimizer (TSP 2-Opt)" across "My Tasks" or "All Ward Tasks"
    ├─► Selects "Shortest Distance" or "Urgency & Hazard Priority"
    ├─► Inspects Topological Sequence & launches 1-click Google Maps Multi-Stop Directions
    ├─► Clicks "Execute Cleanup" / "Update Job" -> Sets "in_progress" or "completed"
    └─► Uploads After-Cleanup Photo + Clicks "Stamp GPS Location" -> PUT /api/complaints/:id/status

[5. CITIZEN VERIFICATION & FEEDBACK]
    ├─► Citizen compares Reported Photo vs. Cleaned Proof Photo + Worker GPS Notes
    └─► Submits 1-5 Star Review -> POST /api/complaints/:id/feedback
```

---

## 6. REST API Architecture (`server.ts`)

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns server status, uptime, active database mode (MongoDB Atlas or In-Memory), and AI availability. |
| `POST` | `/api/auth/login` | Authenticates user by email/password or role shortcut. |
| `POST` | `/api/auth/register` | Registers a new Citizen, Worker, or Admin (auto-creates `WorkerProfile` if role is `worker`). |
| `GET` | `/api/auth/me` | Rehydrates active user session by `email` or `userId` on page refresh. |
| `GET` | `/api/complaints` | Fetches complaints with optional `citizenId`, `workerId`, `ward`, or `status` filters. |
| `POST` | `/api/complaints` | Creates a new geotagged complaint (`WM-YYYY-XXXX`), saves AI metadata, and triggers notifications. |
| `POST` | `/api/complaints/:id/assign` | Assigns a worker to a complaint (`status: 'assigned'`) and notifies both worker and citizen. |
| `PUT` | `/api/complaints/:id/status` | Updates complaint status (`in_progress`, `completed`, `verified`), saves `cleanedImageUrl` & `workerNotes`, and updates worker resolved counts. |
| `POST` | `/api/complaints/:id/feedback` | Saves 1–5 star `feedbackRating` and `feedbackComment`, and notifies the assigned worker. |
| `GET` | `/api/workers` | Lists all municipal field workers with ward, vehicle, status, and ratings. |
| `POST` | `/api/workers` | Registers a new municipal worker and creates matching login user credentials. |
| `GET` | `/api/analytics` | Aggregates dashboard totals, resolution turnaround time, waste distribution %, and ward resolution counts. |
| `POST` | `/api/ai-analyze-waste` | Sends uploaded waste photo to Gemini 3.8 Flash for structured optical classification & hazard diagnostics. |
| `GET` | `/api/notifications` | Retrieves notifications (optionally filtered by `userId`). |

---

## 7. Cloud Build & Render Production Deployment Process

The application is deployed continuously via GitHub to Render at **`https://smart-waste-monitoring.onrender.com`**.

### Production Build Pipeline (`package.json`)
1. **Build Command (`npm run build`):**
   - `vite build`: Compiles the React 19 + TypeScript + Tailwind CSS frontend into optimized static assets inside `dist/`.
   - `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`: Bundles the Express TypeScript backend into a standalone production CommonJS server (`dist/server.cjs`).
2. **Start Command (`npm start`):**
   - Executes `node dist/server.cjs`.
   - In production (`NODE_ENV === "production"`), `server.ts` serves the compiled static frontend from `dist/` and handles SPA fallback routing (`app.get("*")`).
3. **Dynamic Port Binding (`server.ts`):**
   - Binds to `const PORT = Number(process.env.PORT) || 3000;` on `0.0.0.0`, ensuring compatibility with Render's dynamic port injection (e.g., `10000`) as well as local development (`3000`).

### Render Environment Configuration
- **GitHub Repository:** `Manimaranpro/smart-waste-cloud` (branch: `main`)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `NODE_ENV`: `production`
  - `GEMINI_API_KEY`: Google Gemini API key for live optical waste classification
  - `MONGODB_URI`: *(Optional)* MongoDB Atlas URI for persistent cloud collections (falls back gracefully to in-memory cloud store if omitted)

### Git-to-Render Deployment Workflow
1. Local changes are committed and pushed to GitHub (`git push -u origin main`).
2. Render detects the commit on `Manimaranpro/smart-waste-cloud` (or via Dashboard **Manual Deploy**).
3. Render installs dependencies, runs `vite build` + `esbuild`, starts `node dist/server.cjs`, passes health checks, and serves the live app at `https://smart-waste-monitoring.onrender.com`.

---

## 8. Key Talking Points for Presentation & Viva Defense

1. **"Passive Grievance App vs. Active Operations Engine":** Unlike existing portals that only store a photo and text address, EcoTrack automates location capture (Dumpster QR), waste intelligence (Gemini AI), route optimization (TSP 2-Opt), and cleanup verification (Before/After + GPS stamp).
2. **Algorithmic Rigor (`O(n^2)` 2-Opt TSP):** Exact TSP is $O(n!)$ and too slow for mobile field dispatch. Combining Greedy Nearest Neighbor with iterative 2-Opt edge swaps untangles crossing routes in milliseconds with near-optimal fuel savings.
3. **Zero-Downtime Viva Resilience:** Calibrated Gemini optical fallback + MongoDB dual in-memory persistence guarantee the live cloud demo works reliably under any network or database condition.
