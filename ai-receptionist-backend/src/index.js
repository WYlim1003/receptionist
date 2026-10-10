import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { twilioRouter } from './routes/twilio.js';
import { businessRouter } from './routes/businesses.js';
import { bookingsRouter } from './routes/bookings.js';
import { slotsRouter } from './routes/slots.js';
import { callLogsRouter } from './routes/callLogs.js';
import { smsRouter } from './routes/sms.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { handleCallWebSocket } from './websocket/callHandler.js';
import { db } from './db/pool.js';
// Cleanup not implemented

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: (process.env.FRONTEND_CORS_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
}));

// Raw body needed for Twilio signature validation
app.use('/api/twilio', express.raw({ type: '*/*' }));
app.use('/api/sms', express.raw({ type: '*/*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/twilio', twilioRouter);
app.use('/api/businesses', businessRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/slots', slotsRouter);
app.use('/api/calls', callLogsRouter);
app.use('/api/sms', smsRouter);
app.use('/api/whatsapp', whatsappRouter);

// ── Error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── HTTP + WebSocket server ────────────────────────────────
const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws/call' });

wss.on('connection', (ws, req) => {
  const callSid = req.url?.split('/').pop() || 'unknown';
  console.log(`[WS] New connection for call: ${callSid}`);
  handleCallWebSocket(ws, callSid);
});

// ── Start ──────────────────────────────────────────────────
async function start() {
  try {
    // Verify DB connection
    // Firebase is initialized in db/pool.js
    console.log('[DB] Connected to Firebase');

    // Slot lock cleanup would go here

    // Initialize WhatsApp MCP Client
    import('./services/mcpClient.js').then(async ({ whatsappMcpClient }) => {
      await whatsappMcpClient.connect();
    }).catch(err => {
      console.error('[MCP] Failed to load MCP client:', err);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[SERVER] AI Voice Receptionist backend running on port ${PORT}`);
      console.log(`[SERVER] WebSocket endpoint: ws://127.0.0.1:${PORT}/ws/call/:callSid`);
    });
  } catch (err) {
    console.error('[FATAL] Could not start server:', err.message);
    process.exit(1);
  }
}

start();

