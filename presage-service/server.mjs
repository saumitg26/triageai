import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import { fork } from 'node:child_process';

const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/setup') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(await readFile(new URL('./setup.html', import.meta.url)));
  }
  if (req.method === 'POST' && req.url === '/configure') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json' || occupied) {
      res.writeHead(403); return res.end('Setup unavailable');
    }
    try {
      let data = '';
      for await (const chunk of req) {
        data += chunk;
        if (data.length > 4096) throw new Error('Too large');
      }
      const key = JSON.parse(data).key;
      if (typeof key !== 'string' || !/^[A-Za-z0-9._-]{8,512}$/.test(key)) throw new Error('Invalid key');
      await writeFile(new URL('./.env', import.meta.url), `PRESAGE_API_KEY=${key}\nFRONTEND_ORIGIN=${origin}\n`, { mode: 0o600 });
      process.env.PRESAGE_API_KEY = key;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ saved: true }));
    } catch {
      res.writeHead(400); return res.end('Could not save the key. Check the copied value.');
    }
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ configured: Boolean(process.env.PRESAGE_API_KEY) }));
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 1280 * 720 * 4 + 8 });
let occupied = false;
server.on('upgrade', (req, socket, head) => {
  if (req.headers.origin !== origin || req.url !== '/scan' || occupied) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  occupied = true;
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
});

wss.on('connection', ws => {
  // Native SDK failures must not terminate the HTTP/setup service.
  const child = fork(new URL('./session.mjs', import.meta.url), [], {
    serialization: 'advanced', stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  let ended = false;
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 100_000);
  child.on('message', event => {
    if (event.type === 'message' && ws.readyState === WebSocket.OPEN) ws.send(event.message);
    if (event.type === 'closed') { ended = true; ws.close(); }
  });
  child.on('error', () => ws.close());
  child.on('exit', (code, signal) => {
    clearTimeout(watchdog);
    occupied = false;
    if (!ended && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type:'error', message: signal === 'SIGABRT'
        ? 'Presage could not start its Mac graphics processing. Start the scanner from Terminal using Start Scanner.command, then retry.'
        : 'Presage stopped before the scan finished. Retry or enter measurements manually.'}));
    }
    ws.close();
  });
  ws.on('message', (data, binary) => {
    if (child.connected) child.send({data, binary}, error => { if (error) ws.close(); });
  });
  const cancel = () => {
    if (child.connected) child.disconnect();
    const forceStop = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => clearTimeout(forceStop));
  };
  ws.on('close', cancel);
  ws.on('error', cancel);
});
server.listen(8001, '127.0.0.1', () => console.log('Presage scanner listening on 127.0.0.1:8001'));
