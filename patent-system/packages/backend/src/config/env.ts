import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env는 프로젝트 루트(patent-system/)에 위치
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv === 'development';

// ── AES 키 검증 ──
// 프로덕션: 반드시 64자 hex 키 필요 (AES-256 = 32바이트)
// 개발: 미설정 시 자동 생성 (콘솔 경고)
let aesKey = process.env.AES_ENCRYPTION_KEY || '';
if (!aesKey || aesKey.length < 64) {
  if (!isDev) {
    console.error('⛔ AES_ENCRYPTION_KEY가 설정되지 않았거나 길이가 부족합니다 (64자 hex 필요).');
    console.error('   다음 명령어로 키를 생성하세요: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  // 개발 환경: 고정된 dev 키 사용 (경고 출력)
  aesKey = crypto.scryptSync('dev-fallback-key-patent-system', 'patent-salt-v1', 32).toString('hex');
  console.warn('⚠️ 개발 모드: AES 키가 미설정되어 기본 dev 키를 사용합니다. 프로덕션에서는 반드시 AES_ENCRYPTION_KEY를 설정하세요.');
}

// ── Admin 비밀번호 검증 ──
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminPassword) {
  if (!isDev) {
    console.error('⛔ ADMIN_PASSWORD가 설정되지 않았습니다.');
    process.exit(1);
  }
  console.warn('⚠️ 개발 모드: ADMIN_PASSWORD가 미설정되어 기본 비밀번호를 사용합니다.');
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  isDev,

  // SQLite
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/patent.db'),

  // AES-256 Encryption
  aesKey,
  aesIvLength: parseInt(process.env.AES_IV_LENGTH || '16', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  maxTotalSize: parseInt(process.env.MAX_TOTAL_SIZE || '52428800', 10),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Admin
  adminPassword: adminPassword || 'admin1234',

  // SMTP Email
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
} as const;
