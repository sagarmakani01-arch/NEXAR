import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import db from './config/database.js';
import { initializeWebSocket } from './websocket/handler.js';

// Routes
import authRoutes from './routes/auth.js';
import oauthRoutes from './routes/oauth.js';
import twofaRoutes from './routes/twofa.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import aiRoutes from './routes/ai.js';
import previewRoutes from './routes/preview.js';
import publishRoutes from './routes/publish.js';

dotenv.config();

const app = express();
app.set('trust proxy', ['loopback', '172.16.0.0/12', '10.0.0.0/8', '192.168.0.0/16']);
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const RAW_ORIGINS = process.env.CORS_ORIGINS || [
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3001',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
].join(',');
const ALLOWED_ORIGINS = RAW_ORIGINS === '*' ? '*' : RAW_ORIGINS.split(',');

// Initialize WebSocket
const io = initializeWebSocket(server, ALLOWED_ORIGINS);

// Make io available globally for routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow iframe preview
}));
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // No credit limit - generous limit
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many authentication attempts' }
});
app.use('/api/auth/', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/auth/2fa', twofaRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/publish', publishRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve published projects
app.use('/published', express.static(process.env.PUBLISH_DIR || './data/published'));

// Serve deployed projects (static files)
app.use('/deployments', express.static(process.env.DEPLOY_DIR || './data/deployments'));

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
(async () => {
  try {
    await db.initialize();
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  NEXAR Server Running                                         ║
║  Port: ${PORT}                                                    ║
║  WebSocket: Enabled                                          ║
║  Database: PostgreSQL                                        ║
║  Ollama: ${process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b'}                    ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
})();

export default app;
