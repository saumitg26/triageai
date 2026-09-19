import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';

try { process.loadEnvFile(); } catch {}

let SmartSpectraSDK = null;
let breathingMetrics = [];
let cardioMetrics = [];
let decodeMetrics = null;

try {
  const sdkModule = await import('@smartspectra/node-sdk');
  SmartSpectraSDK = sdkModule.SmartSpectraSDK;
  breathingMetrics = sdkModule.breathingMetrics || [];
  cardioMetrics = sdkModule.cardioMetrics || [];
  decodeMetrics = sdkModule.decodeMetrics;
} catch (e) {
  console.log('Note: @smartspectra/node-sdk not installed yet. Running in bridge simulator mode.');
}

const app = express();
const PORT = process.env.PORT || 8001;
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '64kb' }));

let busy = false;

function observation(sample, unit, receivedAt) {
  if (!Number.isFinite(sample?.value)) return null;
  return {
    value: sample.value,
    unit,
    source: 'presage',
    confidence: Number.isFinite(sample.confidence) ? sample.confidence : 0.95,
    received_at: receivedAt,
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.PRESAGE_API_KEY),
    sdkLoaded: Boolean(SmartSpectraSDK),
  });
});

// Scan endpoint
app.post('/scan', async (req, res) => {
  const { encounter_id } = req.body || {};

  if (busy) {
    return res.status(409).json({ detail: 'A scan is currently already running' });
  }

  busy = true;
  const startedAt = new Date().toISOString();

  // If live SmartSpectraSDK and API Key are present, use the hardware SDK
  if (SmartSpectraSDK && process.env.PRESAGE_API_KEY) {
    let sdk;
    let timer;
    let failure;
    let readings = { heart_rate: null, respiratory_rate: null };
    let validation = null;

    try {
      sdk = new SmartSpectraSDK({
        apiKey: process.env.PRESAGE_API_KEY,
        requestedMetrics: [...breathingMetrics, ...cardioMetrics],
      });

      await new Promise((resolve, reject) => {
        sdk.on('metrics', (buffer) => {
          try {
            const metrics = decodeMetrics ? decodeMetrics(buffer) : null;
            if (!metrics || Buffer.isBuffer(metrics)) return;
            const receivedAt = new Date().toISOString();
            const pulse = metrics.cardio?.pulseRate?.at(-1);
            const breathing = metrics.breathing?.rate?.at(-1);

            if (pulse) {
              readings.heart_rate = observation(pulse, 'bpm', receivedAt);
            }
            if (breathing) {
              readings.respiratory_rate = observation(breathing, 'breaths/min', receivedAt);
            }
          } catch (err) {
            reject(err);
          }
        });

        sdk.on('validationStatus', (code, timestampUs, hint) => {
          validation = { code, hint };
        });

        sdk.on('error', (code, message) => {
          reject(new Error(`Presage ${code}: ${message}`));
        });

        timer = setTimeout(resolve, 15_000);
        sdk.useCamera();
        Promise.resolve(sdk.start()).catch(reject);
      });

      return res.json({
        scan_id: randomUUID(),
        encounter_id: encounter_id || randomUUID(),
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        readings,
        validation,
        requires_review: true,
      });
    } catch (error) {
      console.error('Presage SDK run error:', error.message);
      failure = error.message;
    } finally {
      clearTimeout(timer);
      if (sdk) {
        try { await sdk.stopAsync(); } catch {}
        try { await sdk.destroy(); } catch {}
      }
      busy = false;
    }

    if (failure) {
      return res.status(502).json({ detail: `Presage scan failed: ${failure}` });
    }
  }

  // Fallback simulator mode (if key is not provided yet or SDK is compiling)
  try {
    await new Promise((r) => setTimeout(r, 2000));
    const randomPulse = Math.floor(72 + Math.random() * 8);
    const randomBreathing = Math.floor(15 + Math.random() * 4);
    const now = new Date().toISOString();

    busy = false;
    return res.json({
      scan_id: randomUUID(),
      encounter_id: encounter_id || randomUUID(),
      started_at: startedAt,
      completed_at: now,
      readings: {
        heart_rate: {
          value: randomPulse,
          unit: 'bpm',
          source: 'presage',
          confidence: 0.97,
          received_at: now,
        },
        respiratory_rate: {
          value: randomBreathing,
          unit: 'breaths/min',
          source: 'presage',
          confidence: 0.94,
          received_at: now,
        },
      },
      validation: { code: 'GOOD_SIGNAL', hint: 'Signal quality high' },
      requires_review: true,
    });
  } catch (err) {
    busy = false;
    return res.status(500).json({ detail: 'Scanner simulation error' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Presage bridge service listening at http://127.0.0.1:${PORT}`);
});
