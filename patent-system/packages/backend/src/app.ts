import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import customerRoutes from './routes/customer.js';
import adminRoutes from './routes/admin.js';
import additionalRoutes from './routes/additional.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// ── API 라우트 ──
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/additional', additionalRoutes);

// ── 프로덕션: 프론트엔드 정적 파일 서빙 ──
if (!env.isDev) {
  const frontendDist = path.resolve(__dirname, '../../../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA 폴백: API 외 모든 경로 → index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── 에러 핸들러 ──
app.use(errorHandler);

export default app;
