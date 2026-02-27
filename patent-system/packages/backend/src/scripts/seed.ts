/**
 * 테스트용 시드 스크립트
 * - 테스트 Submission + Token 생성
 * - 실행: pnpm --filter backend seed
 */
import { connectDatabase } from '../config/database.js';
import { Submission, generateCaseNumber } from '../models/Submission.js';
import { Token, generateToken, getTokenExpiry } from '../models/Token.js';

async function seed() {
  await connectDatabase();

  console.log('🌱 시드 데이터 생성 시작...\n');

  // 기존 테스트 데이터 정리
  await Submission.deleteMany({ caseNumber: /^TEST-/ });
  await Token.deleteMany({ createdBy: 'seed-script' });

  // 테스트 접수 건 생성
  const submission = new Submission({
    caseNumber: `TEST-${Date.now()}`,
    applicationType: 'patent',
    status: 'draft',
  });
  await submission.save();

  // 테스트 토큰 생성
  const tokenString = generateToken();
  const token = new Token({
    token: tokenString,
    submissionId: submission._id,
    expiresAt: getTokenExpiry(),
    createdBy: 'seed-script',
  });
  await token.save();

  console.log('✅ 테스트 데이터 생성 완료!\n');
  console.log(`   접수번호: ${submission.caseNumber}`);
  console.log(`   토큰: ${tokenString}`);
  console.log(`   만료: ${token.expiresAt.toISOString()}`);
  console.log(`\n   접속 URL: http://localhost:5173/${tokenString}\n`);

  // 추가 테스트 토큰 (만료된 것)
  const expiredToken = new Token({
    token: generateToken(),
    submissionId: submission._id,
    expiresAt: new Date('2020-01-01'),
    status: 'expired',
    createdBy: 'seed-script',
  });
  await expiredToken.save();
  console.log(`   만료 토큰 (테스트용): ${expiredToken.token.slice(0, 16)}...`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
