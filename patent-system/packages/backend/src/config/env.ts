import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env는 프로젝트 루트(patent-system/)에 위치
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // SQLite
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/patent.db'),

  // AES-256 Encryption
  aesKey: process.env.AES_ENCRYPTION_KEY || '',
  aesIvLength: parseInt(process.env.AES_IV_LENGTH || '16', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  maxTotalSize: parseInt(process.env.MAX_TOTAL_SIZE || '52428800', 10),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Admin (간단한 비밀번호 방식)
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',

  // SMTP Email
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
} as const;
