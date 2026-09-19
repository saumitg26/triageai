import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { usableReading } from './quality.mjs';
const ws = new EventEmitter();
ws.readyState = WebSocket.OPEN;
ws.send = message => { if (process.connected) process.send({type:'message', message}); };
ws.close = () => {
  ws.readyState = WebSocket.CLOSED;
  if (process.connected) process.send({type:'closed'}, () => process.exit(0));
  else process.exit(0);
};
process.on('message', ({data, binary}) => ws.emit('message', data, binary));
process.on('disconnect', () => ws.emit('close'));
function runSession(ws) {
  let sdk, started = false, ending = false, timer, deadline;
  let width, height, lastTimestamp = -1, validation = null;
  const latest = {};
  const send = data => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  async function end(message) {
    if (ending) return;
    ending = true;
    clearTimeout(timer);
    clearTimeout(deadline);
    try {
      if (sdk) {
        await sdk.stopAsync();
        await sdk.destroy();
      }
    } catch {
      message = { type: 'error', message: 'Camera processing could not finish. Restart the scanner service.' };
    } finally {
      send(message || { type: 'cancelled' });
      ws.close();

    }
  }
  ws.on('close', () => void end());
  ws.on('error', () => void end());
  deadline = setTimeout(() => void end({ type: 'error', message: 'Camera setup timed out. Please try again.' }), 90_000);
  ws.on('message', async (data, binary) => {
    if (ending) return;
    try {
      if (!binary) {
        const request = JSON.parse(data.toString());
        if (request.type === 'cancel') return void end();
        if (request.type !== 'start' || started) throw new Error('Invalid scan request');
        started = true;
        if (!process.env.PRESAGE_API_KEY) {
          return void end({ type: 'error', message: 'Presage is not connected yet. Add the API key to presage-service/.env and restart the scanner.' });
        }
        ({ width, height } = request);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 240 || width > 1280 || height > 720) throw new Error('Invalid video dimensions');
        const { SmartSpectraSDK, breathingMetrics, cardioMetrics, PixelFormat, decodeMetrics } = await import('@smartspectra/node-sdk');
        if (ending) return;
        sdk = new SmartSpectraSDK({ apiKey: process.env.PRESAGE_API_KEY, requestedMetrics: [...breathingMetrics, ...cardioMetrics], enableTelemetry: false });
        sdk.on('validationStatus', (code, timestamp, hint) => {
          validation = code;
          send({ type: 'hint', message: hint || (code === 0 ? 'Hold still with your face and chest visible.' : 'Adjust your position and lighting.') });
        });
        sdk.on('metrics', buffer => {
          if (ending) return;
          try {
            const metrics = decodeMetrics(buffer);
            if (Buffer.isBuffer(metrics)) throw new Error('Could not decode measurements');
            for (const [name, sample] of Object.entries({ heart_rate: metrics.cardio?.pulseRate?.at(-1), respiratory_rate: metrics.breathing?.rate?.at(-1) })) {
              if (!sample) continue;
              const timestamp = String(sample.timestamp);
              if (timestamp === latest[name]?.timestamp) continue;
              latest[name] = { value: sample.value, confidence: sample.confidence, stable: sample.stable, timestamp, receivedAt: Date.now() };
            }
          } catch {
            void end({ type: 'error', message: 'Could not read Presage measurements. Please try again.' });
          }
        });
        sdk.on('error', () => void end({ type: 'error', message: 'Presage could not process this scan. Check your key, available credits and connection, then retry.' }));
        sdk.useCustomInput();
        sdk.start();
        sdk.frameFormat = PixelFormat.kRGBA;
        if (!ending) send({ type: 'ready', duration: 45 });
        return;
      }
      if (!sdk || !started || data.length !== width * height * 4 + 8) throw new Error('Invalid frame');
      const timestamp = data.readDoubleLE(0);
      if (!Number.isFinite(timestamp) || timestamp <= lastTimestamp) throw new Error('Invalid frame timing');
      lastTimestamp = timestamp;
      if (!timer) {
        clearTimeout(deadline);
        timer = setTimeout(() => {
          const readings = {};
          for (const name of ['heart_rate', 'respiratory_rate']) {
            const sample = latest[name];
            readings[name] = usableReading(sample, validation, Date.now()) ? { ...sample, value: Math.round(sample.value), source: 'presage' } : null;
          }
          void end({ type: 'complete', readings, completedAt: new Date().toISOString() });
        }, 45_000);
      }
      sdk.sendFrame(data.subarray(8), width, height, width * 4, sdk.frameFormat, timestamp);
    } catch {
      void end({ type: 'error', message: 'The scan was interrupted. Retry or enter measurements manually.' });
    }
  });
}

runSession(ws);
