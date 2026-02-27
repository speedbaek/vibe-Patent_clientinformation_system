import app from './app.js';
import { env } from './config/env.js';
import { initDatabase } from './config/database.js';

// ── 크래시 방지 ──
process.on('uncaughtException', (error) => {
  console.error('⚠️ 처리되지 않은 예외:', error.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ 처리되지 않은 Promise 거부:', reason);
});

// SQLite 초기화 (sql.js는 async)
initDatabase().then(() => {
  app.listen(env.port, () => {
    console.log(`서버 시작: http://localhost:${env.port}`);
    console.log(`환경: ${env.nodeEnv}`);
  });
}).catch((err) => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
