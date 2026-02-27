import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/patent-system',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // AES-256 Encryption
  aesKey: process.env.AES_ENCRYPTION_KEY || '',
  aesIvLength: parseInt(process.env.AES_IV_LENGTH || '16', 10),

  // JWT (Phase 2)
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  // Token
  tokenExpiryDays: parseInt(process.env.TOKEN_EXPIRY_DAYS || '7', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  maxTotalSize: parseInt(process.env.MAX_TOTAL_SIZE || '52428800', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
} as const;
