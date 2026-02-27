import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import customerRoutes from './routes/customer.js';

const app = express();

// ── 기본 미들웨어 ──
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 헬스체크 ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 라우트 ──
app.use('/api/customer', customerRoutes);

// Phase 2: 관리자 라우트
// app.use('/api/admin', adminRoutes);

// ── 에러 핸들러 ──
app.use(errorHandler);

export default app;
