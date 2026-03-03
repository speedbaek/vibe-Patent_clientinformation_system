import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
  // env.ts에서 이미 키 검증 완료 (프로덕션은 필수, 개발은 자동생성)
  return Buffer.from(env.aesKey, 'hex');
}

/**
 * AES-256-CBC 암호화
 * 대상: 주민등록번호, 법인등록번호, 사업자등록번호, 여권번호
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return '';

  const key = getKey();
  const iv = crypto.randomBytes(env.aesIvLength);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // IV:암호문 형태로 저장 (복호화 시 IV 필요)
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-CBC 복호화
 */
export function decryptField(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return '';

  const key = getKey();
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 민감 필드 목록 (암호화 대상)
 */
export const SENSITIVE_FIELDS = [
  'rrnEncrypted',
  'corpRegNumEncrypted',
  'bizNumEncrypted',
  'passportEncrypted',
] as const;

/**
 * 출원인 데이터에서 민감 필드를 암호화
 */
export function encryptApplicantData(applicant: Record<string, unknown>): Record<string, unknown> {
  const result = { ...applicant };

  // 주민등록번호
  if (applicant.rrn && typeof applicant.rrn === 'string') {
    result.rrnEncrypted = encryptField(applicant.rrn as string);
    delete result.rrn;
  }

  // 법인등록번호
  if (applicant.corpRegNum && typeof applicant.corpRegNum === 'string') {
    result.corpRegNumEncrypted = encryptField(applicant.corpRegNum as string);
    delete result.corpRegNum;
  }

  // 사업자등록번호
  if (applicant.bizNum && typeof applicant.bizNum === 'string') {
    result.bizNumEncrypted = encryptField(applicant.bizNum as string);
    delete result.bizNum;
  }

  // 여권번호
  if (applicant.passport && typeof applicant.passport === 'string') {
    result.passportEncrypted = encryptField(applicant.passport as string);
    delete result.passport;
  }

  return result;
}
