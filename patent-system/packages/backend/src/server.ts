import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

// ── 크래시 방지: 처리되지 않은 에러 캐치 ──
process.on('uncaughtException', (error) => {
  console.error('⚠️ 처리되지 않은 예외 (서버 유지):', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ 처리되지 않은 Promise 거부 (서버 유지):', reason);
});

async function start() {
  // MongoDB 연결
  await connectDatabase();

  // 서버 시작
  app.listen(env.port, () => {
    console.log(`🚀 서버 시작: http://localhost:${env.port}`);
    console.log(`   환경: ${env.nodeEnv}`);
    console.log(`   프론트엔드: ${env.frontendUrl}`);
  });
}

start().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
