# CleanCity AI: Smart Municipal Waste Monitoring & Field Operations System
## Complete End-to-End Project Process Documentation

---

## 1. Executive Summary & Project Purpose

**CleanCity AI** is a full-stack, enterprise-grade municipal solid waste monitoring and field operations management system. It bridges the critical operational gap between **Citizens**, **Sanitation Field Workers**, and **Municipal Ward Administrators**.

Traditional municipal waste management applications suffer from a high rate of failure because they operate as passive, one-way grievance forms with no on-site location validation, no automated waste hazard analysis, and no verifiable proof of cleanup. 

CleanCity AI addresses these shortcomings by introducing an **active, closed-loop operational ecosystem** featuring:
- **Client-Side Live GPS Geotagging** with accuracy thresholds.
- **Multimodal AI Computer Vision** for automated material categorization, hazard scoring, recyclability percentage, and carbon offset estimation.
- **Real-Time Worker Fleet Proximity Routing** using the Haversine spherical distance formula.
- **Two-Sided Resolution Verification** requiring verifiable before-and-after photographic evidence with on-site GPS timestamps before closing tickets.
- **Citizen Feedback & Accountability Loop** empowering the public to rate municipal sanitation performance.

---

## 2. Problem Statement & Distinction from "Existing Level" Systems

### The Faculty Objection: *"Why is this different from existing systems like Swachhata App?"*

| Dimension | Standard / Existing Baseline System | CleanCity AI (Our Proposed Project) |
| :--- | :--- | :--- |
| **Grievance Reporting** | Plain text form with optional static photo. No validation of dump location. | High-precision GPS pinpointing with browser geolocation accuracy tracking and address synchronization. |
| **Material Understanding** | Manual citizen tagging (often inaccurate or unsegregated). | Automated **Multimodal Computer Vision** (Google Gemini 3.8 Flash / Calibrated Neural Engine) classifying waste type, hazard level, volume ($m^3$), recyclability %, and $kg\text{ CO}_2$ offset. |
| **Worker Dispatch** | Static manual spreadsheets or phone calls without distance awareness. | Proximity-aware dispatch computing **Haversine Distance** from worker's live GPS to the waste location, with estimated transit time. |
| **Resolution Integrity** | Worker clicks "Resolved" with no accountability; ghost closures are common. | Strict **Before vs. After Photo Comparison** accompanied by on-site GPS timestamp stamps. |
| **Data Persistence** | Crashes if remote database drops connection. | **Dual-Persistence Architecture**: MongoDB Atlas with automatic, high-speed cloud in-memory fallback. |
| **Accessibility** | Typically English-only. | Native multilingual support (English, Hindi, Tamil, Telugu, Marathi). |

---

## 3. Technology Stack & System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript (Strict mode enabled).
- **Styling:** Tailwind CSS (Utility-first, responsive, accessible color contrast).
- **Icons & UI:** Lucide React icons.
- **Visualizations:** Recharts (Pie charts for waste composition, Bar charts for ward metrics).
- **Internationalization:** Context-aware multilingual dictionary (`en`, `hi`, `ta`, `te`, `mr`).

### Backend Architecture
- **Runtime:** Node.js with TypeScript (`server.ts`).
- **Web Framework:** Express.js RESTful API.
- **AI Vision Pipeline:** Google GenAI SDK (`@google/genai`) running `gemini-3.8-flash` with structured JSON output prompts.
- **Database & ODM:** MongoDB Atlas via Mongoose + resilient in-memory data store for uninterrupted viva demonstrations.

---

## 4. End-to-End Operational Lifecycle (The Full Process)

The entire project operates across four sequential phases:

```
[ Phase 1: Citizen ] 
       │
       ▼  (1) Uploads waste photo & triggers GPS
       ▼  (2) AI Diagnostic detects material, hazard & carbon metrics
       ▼  (3) Submits ticket (Status: PENDING)
       │
[ Phase 2: Municipal Admin Command ]
       │
       ▼  (4) Admin monitors real-time stats & ward distributions
       ▼  (5) Assigns ticket to designated ward worker (Status: ASSIGNED)
       │
[ Phase 3: Field Sanitation Worker ]
       │
       ▼  (6) Receives task with computed Haversine distance & transit time
       ▼  (7) Dispatches to site with required PPE & vehicle
       ▼  (8) Changes status to IN_PROGRESS
       ▼  (9) Uploads After-Cleanup Proof Photo with GPS stamp
       ▼  (10) Marks ticket COMPLETED
       │
[ Phase 4: Citizen Verification & Rating ]
       │
       ▼  (11) Citizen views Before vs. After side-by-side proof
       ▼  (12) Citizen submits 1-5 Star rating & feedback comment
```

### Detailed Breakdown of Each Step:

### Step 1: Citizen Waste Reporting & Automated Diagnostic
1. The citizen opens the **Citizen Portal**.
2. **Physical Dumpster QR Code Auto-Fill (Optional Shortcut):**
   - In addition to manual entry, citizens standing near physical municipal bins can click **"Scan Dumpster QR"**.
   - Scanning the bin's physical QR sticker instantly decodes the registered Bin ID (e.g. `BIN-W12-04`), Ward, exact street address, and high-precision GPS coordinates, pre-populating the complaint form automatically.
   - Citizens and ward authorities can also access the built-in **"QR Tag Generator"** to produce, preview, and download official high-resolution printable QR stickers for physical dumpsters across wards.
3. **GPS Geolocation Pinpoint:** Clicking *"Live GPS"* activates `navigator.geolocation.getCurrentPosition()`, capturing exact latitude, longitude, and accuracy in meters.
4. **Photo Upload & Multimodal AI Inspection:**
   - The user selects or captures a photo of the waste accumulation.
   - The photo is transmitted via `/api/ai-analyze-waste`.
   - The AI inspects the pixels and returns:
     - **Detected Material:** (e.g., Plastic & Recyclable, Organic, Hazardous, Construction).
     - **Hazard Level:** (Safe, Moderate, Hazardous, Critical).
     - **Confidence Score:** (e.g., 96%).
     - **Recyclable Percentage:** (e.g., 78%).
     - **Estimated Volume:** (e.g., $0.85\text{ m}^3$).
     - **Carbon Offset Potential:** (e.g., $5.2\text{ kg CO}_2$).
     - **Recommended Municipal Equipment:** (e.g., Hydraulic Compactor Truck + Puncture-Proof Nitrile Gloves).
5. The citizen submits the ticket. A unique ticket number (e.g., `TKT-8291`) is generated, and the ticket enters the public municipal feed with `pending` status.

### Step 2: Municipal Command Center Monitoring & Dispatch
1. The municipal supervisor opens the **Admin Command Center**.
2. **Executive KPI Dashboard:**
   - Total complaints, pending tasks, active workforce, and average resolution time (hours).
   - Waste composition breakdown (Recyclables vs. Organic vs. Debris).
   - Ward-by-ward complaint volume and resolution success rates.
3. **Filter & Search:** Admins can filter tickets by Ward, Status, or search by Ticket ID/Citizen Name.
4. **Worker Dispatch:**
   - Admin opens the *"Assign Field Worker"* dialog.
   - Selects an active sanitation worker designated for that ward.
   - Submits assignment; the ticket status transitions to `assigned`.

### Step 3: Sanitation Worker Field Operations & Route Optimization
1. The worker logs in to the **Worker Portal**.
2. **AI Multi-Stop Route Optimization Engine (TSP + 2-Opt):**
   - When a sanitation worker has multiple pending complaint sites in their assigned ward, they can toggle the **"AI Route Optimizer"**.
   - **Algorithmic Formulation:** The system formulates a Traveling Salesperson Problem (TSP) starting from the worker's live GPS coordinates (or ward depot).
   - **Pairwise Distance Matrix:** Computes great-circle distances using the Haversine spherical formula between all waypoint pairs.
   - **Heuristic Sequencing & 2-Opt Local Search:** First constructs a greedy Nearest-Neighbor tour, then runs iterative **2-Opt edge swaps** to untangle crossing paths and converge on the minimal travel distance.
   - **Urgency & Hazard Weighting:** Workers can optionally select *"Urgency & Hazard Priority"*, which factors in complaint severity (Critical hazards weighted to reduce detour risk while cleaning toxic or dangerous spills first).
   - **Transit & Fuel Telemetry:** Displays total driving kilometers, estimated transit time, cleanup time per site, percentage distance saved, and municipal diesel $\text{CO}_2$ emissions avoided.
   - **Integrated Multi-Stop Navigation:** Generates a Google Maps Multi-Stop link pre-sequencing the origin, intermediate waypoints, and final destination for turn-by-turn driving guidance.
3. **Live Field Proximity & Single-Stop Telemetry:**
   - The system displays the real-time distance and estimated transit time to each specific complaint.
4. **Direct Citizen Contact:** 1-click phone dialer allows the worker to call the reporting citizen for physical landmark guidance.
5. **Execution & Proof Submission:**
   - The worker marks the task as `in_progress`.
   - After cleaning the dump site, the worker uploads the **After-Cleanup Proof Photo**.
   - Clicks *"Stamp GPS Location"* to generate an unalterable proof log containing coordinates and timestamps.
   - Submits resolution; status transitions to `completed`.

### Step 4: Public Transparency & Citizen Feedback
1. The ticket updates instantly on the citizen's public feed.
2. The citizen inspects the **Before Photo** alongside the **Cleaned Photo**.
3. The citizen submits a 1-to-5 Star review with qualitative comments on sanitation thoroughness.
4. Ratings directly update the worker's municipal performance score in the Admin dashboard.

---

## 5. REST API Architecture

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check, database status, and uptime. |
| `POST` | `/api/auth/login` | Role-based authentication (Citizen, Worker, Admin). |
| `GET` | `/api/auth/me` | Rehydrates user session across browser refreshes. |
| `GET` | `/api/complaints` | Retrieves complaint list with optional status/ward filtering. |
| `POST` | `/api/complaints` | Submits new geotagged complaint with AI vision metadata. |
| `PATCH`| `/api/complaints/:id/status` | Updates workflow state (assigned, in_progress, completed). |
| `PATCH`| `/api/complaints/:id/assign` | Assigns designated worker to complaint. |
| `POST` | `/api/complaints/:id/feedback` | Records citizen star rating and evaluation review. |
| `POST` | `/api/complaints/:id/upvote` | Increments community upvote count on public issues. |
| `GET` | `/api/workers` | Lists sanitation workforce directory and status. |
| `POST` | `/api/workers` | Adds new municipal worker with assigned vehicle & ward. |
| `GET` | `/api/analytics` | Returns aggregated metrics, charts data, and turnaround times. |
| `POST` | `/api/ai-analyze-waste` | Multimodal AI computer vision image diagnostic. |
| `GET` | `/api/notifications` | User-specific municipal status alerts. |

---

## 6. Key Innovations for Project Review & Viva Defense

1. **Closed-Loop Resolution Guarantee:**
   No complaint can be closed without verified photographic evidence and on-site geotag timestamps, eliminating administrative "paper resolutions."
2. **Automated Environmental Intelligence:**
   Instead of basic image storage, the system calculates carbon offset potential and material recyclability yield, aligning municipal sanitation with circular economy goals.
3. **Resilient Dual-Persistence Design:**
   Designed to never fail during evaluation demonstrations: if MongoDB Atlas credentials are not supplied or network connectivity drops, the system seamlessly operates via high-speed cloud memory caching.
4. **Human-Centric Municipal Field Workflow:**
   Sanitation workers are equipped with distance indicators, required PPE alerts, and 1-click citizen communication rather than opaque bureaucratic tasks.
