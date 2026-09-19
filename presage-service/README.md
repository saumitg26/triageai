# Presage SmartSpectra Local Bridge Service

This Node.js microservice bridges the **Presage SmartSpectra Native Camera SDK** with the **TriageAI** React frontend.

## Overview
- Presage requires Node.js 20+ with native webcam access.
- It calculates:
  - **Pulse Rate / Heart Rate (bpm)** via facial optical blood volume pulse (rPPG).
  - **Respiratory Rate (/min)** via thoracic movement tracking.
- Clinical measurements like **Blood Pressure**, **Temperature**, and **SpO₂** are not measurable via optical webcam and are entered manually by clinical staff in the TriageAI intake form.

## Quick Start

1. Ensure you have Node.js 20+ installed.
2. Install dependencies:
   ```bash
   cd presage-service
   npm install
   ```
3. Set your Presage API Key and start the service:
   ```bash
   export PRESAGE_API_KEY="your-presage-api-key-here"
   export FRONTEND_ORIGIN="http://localhost:5173" # or 3000 depending on Vite port
   node scan.mjs
   ```
4. The service will listen on `http://127.0.0.1:8001`.
5. The React frontend will automatically communicate with this service when clicking **"Scan with Presage Camera"**.
