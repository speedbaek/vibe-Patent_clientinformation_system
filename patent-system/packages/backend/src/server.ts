import app from './app.js';
import { env } from './config/env.js';
import { initDatabase, shutdownDb, saveDb } from './config/database.js';
import type { Server } from 'http';

let server: Server;

// ── 크래시 방지 ──
process.on('uncaughtException', (error) => {
  console.error('⚠️ 처리되지 않은 예외:', error.message);
  // 크래시 전 DB 저장 시도
  try { saveDb(); } catch { /* best effort */ }
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ 처리되지 않은 Promise 거부:', reason);
});

// ── Graceful Shutdown ──
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} 수신 — 서버를 안전하게 종료합니다...`);
  shutdownDb();
  if (server) {
    server.close(() => {
      console.log('서버 종료 완료');
      process.exit(0);
    });
    // 5초 후 강제 종료
    setTimeout(() => {
      console.error('강제 종료');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SQLite 초기화 (sql.js는 async)
initDatabase().then(() => {
  server = app.listen(env.port, () => {
    console.log(`서버 시작: http://localhost:${env.port}`);
    console.log(`환경: ${env.nodeEnv}`);
  });
}).catch((err) => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
