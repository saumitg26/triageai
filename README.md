# TriageAI 🏥⚡

### Smart ER Triage with Contactless Presage Optical Vitals & Human-in-the-Loop Gemini AI

Built with ❤️ for **VTHacks 2026**

---

## 🌟 Overview

In emergency departments across the United States, **130+ million patients** are evaluated annually. Triage nurses must make rapid, high-stakes decisions under intense time pressure, resulting in a **20–30% mis-triage rate** and nurse cognitive fatigue.

**TriageAI** revolutionizes the intake workflow by marrying **contactless optical biometric scanning** with **explainable generative clinical AI**, while keeping authorized clinicians firmly in control:

1. **Contactless Biometric Capture via Presage**: Measures facial blood volume pulse (rPPG) and thoracic breathing motion directly through a laptop webcam in ~10 seconds.
2. **Human-in-the-Loop Clinical Entry**: Essential physical vitals (Blood Pressure cuff, Temperature thermometer, SpO₂ pulse oximeter) and symptoms are entered manually by staff, with explicit data provenance badges (`[📷 Presage]` vs `[🩺 Manual Cuff]`).
3. **Clinical AI Triage via Google Gemini 3.6 Flash**: Analyzes combined physiological signals, chief complaints, and past medical history against the Emergency Severity Index (ESI Levels 1–5).
4. **Supervisory Clinician Authority**: Clinicians review the draft recommendation, examine step-by-step reasoning and critical flags, and can approve or override with clinical justification.
5. **Real-Time Priority Queue**: ER patient queue automatically updates in real time by clinical acuity and wait times.

---

## 📸 Key Features

### 1. Presage Optical Vitals Viewfinder
- Real-time webcam viewport with target corner brackets and biometric face oval.
- Real-time HTML5 canvas patient presence verification (rejects empty frames to prevent spurious vitals).
- Optical rPPG hemodynamic wave animation and animated laser scan sweep.
- Automatic autofill to the intake form with provenance audit logging.

### 2. Human-in-the-Loop Clinical Protocol
- Automated pulse and respiration capture removes measurement friction.
- Preserves hospital safety standards: hemodynamic cuff readings (Systolic & Diastolic BP) and oximetry stay manual.
- Full provenance tracking stored in the database (`vitals_source`).

### 3. Google Gemini 3.6 Flash Triage Engine
- Classifies patient acuity using the official 5-level **Emergency Severity Index (ESI)**:
  - **ESI 1**: Resuscitation (Immediate life-threat)
  - **ESI 2**: Emergent (High risk, acute coronary syndrome, severe distress)
  - **ESI 3**: Urgent (Stable, multiple resources needed)
  - **ESI 4**: Less Urgent (One resource needed)
  - **ESI 5**: Non-Urgent (Exam / prescription only)
- Delivers actionable emergency interventions (e.g. STAT 12-lead ECG, Troponin labs, telemetry).
- Flags critical drug-allergy interactions (e.g. aspirin allergy during suspected cardiac events).

### 4. Nurse Override & Priority Queue
- Acuity-sorted patient queue ensuring the sickest patients are seen first.
- Override modal allows clinicians to adjust the triage level and document clinical reasons.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons | Responsive ER-grade dark medical dashboard |
| **Biometric SDK** | Presage SmartSpectra (`@smartspectra/node-sdk` v3.3.0) | Optical rPPG pulse & respiration capture |
| **AI Assessment** | Google Gemini 3.6 Flash API | Clinical reasoning, ESI assignment, recommendations |
| **Backend API** | Python FastAPI, Uvicorn | High-performance async REST microservice |
| **Database** | SQLite + SQLAlchemy (async via aiosqlite & greenlet) | Patient records, audit history & provenance |

---

## 📁 Repository Structure

```
triageai/
├── frontend/                     # React 18 + Vite Web App
│   ├── src/
│   │   ├── components/
│   │   │   ├── PresageScanModal.jsx   # Live webcam biometric scanner HUD
│   │   │   ├── PatientIntakeForm.jsx  # Intake with Presage autofill & provenance
│   │   │   ├── TriageAssessment.jsx   # AI clinical reasoning & nurse override
│   │   │   ├── PriorityQueue.jsx      # Acuity-sorted ER waiting queue
│   │   │   ├── AnalyticsPanel.jsx     # ER metrics & wait time graphs
│   │   │   └── PatientDetail.jsx      # Detailed encounter dossier
│   │   ├── services/api.js            # Axios backend client
│   │   ├── utils/constants.js         # ESI definitions & styling constants
│   │   └── index.css                  # Dark medical theme & HUD animations
│   ├── package.json
│   └── vite.config.js                 # Proxy config for port 3000 -> 8000
│
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint
│   │   ├── database.py                # Async SQLAlchemy models & schema
│   │   ├── models.py                  # Pydantic request & response models
│   │   ├── routers/
│   │   │   ├── patients.py            # Patient CRUD & provenance endpoints
│   │   │   ├── triage.py              # Gemini AI triage execution
│   │   │   └── analytics.py           # Departmental operational metrics
│   │   └── services/
│   │       └── ai_engine.py           # Gemini 3.6 Flash prompt & ESI engine
│   ├── requirements.txt
│   └── seed_data.py                   # Initial clinical ER scenarios
│
└── presage-service/              # Presage SmartSpectra Bridge Service
    ├── scan.mjs                       # Node.js Express service for Presage SDK
    ├── package.json
    └── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+
- Python 3.10+
- Web browser (Chrome, Edge, or Safari) with camera permissions enabled
- Google Gemini API Key ([Get one free at Google AI Studio](https://aistudio.google.com/apikey))
- Presage API Key ([Presage SmartSpectra Developer Portal](https://physiology.presagetech.com/))

---

### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cat << EOF > .env
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Start FastAPI server (Port 8000)
uvicorn app.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

---

### Step 2: Presage Service Setup (Optional for native hardware capture)

```bash
cd presage-service

# Install Presage SmartSpectra SDK
npm install

# Configure API Key
cat << EOF > .env
PRESAGE_API_KEY=your_presage_api_key_here
PORT=8001
EOF

# Start Presage bridge service (Port 8001)
node scan.mjs
```

---

### Step 3: Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Launch Vite development server (Port 3000)
npm run dev
```

Open your browser to: **`http://localhost:3000`**

---

## 🏥 Testing the Workflow

1. Navigate to **Patient Intake**.
2. Under **Vital Signs**, click **"📸 Scan with Presage Camera"**.
3. Align face within the targeting frame until the reticle turns green (**`PATIENT DETECTED`**).
4. Click **"Start Optical Vitals Scan"** and watch the 10-second biometric laser sweep and optical rPPG wave.
5. Click **"Use These Readings (Apply to Form)"** to automatically populate Heart Rate and Respiratory Rate tagged with `[📷 Presage]`.
6. Enter Blood Pressure (e.g. `120/80`), Temperature (`98.6`), and SpO₂ (`98`) manually.
7. Click **"Submit for AI Triage"**.
8. Examine the live Gemini 3.6 Flash clinical reasoning, critical alerts, and ESI assessment.
9. Approve the recommendation or perform a **Nurse Override** with a clinical justification.

---

## 👥 VTHacks 2026 Team

- **Saumit Guduguntla** ([@saumitg26](https://github.com/saumitg26))

---

## 📄 Clinical Disclaimer

TriageAI and Presage SmartSpectra optical biometric metrics are built for demonstration and research purposes. In real-world healthcare environments, triage decisions must be confirmed by licensed medical personnel in accordance with hospital emergency medicine protocols.
