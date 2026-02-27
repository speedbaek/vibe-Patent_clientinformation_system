import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { env } from '../config/env.js';

export interface IToken extends Document {
  token: string;
  submissionId: mongoose.Types.ObjectId;
  expiresAt: Date;
  status: 'active' | 'expired' | 'revoked';
  createdBy: string;
  lastAccessedAt: Date | null;
  createdAt: Date;
}

const tokenSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  submissionId: {
    type: Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  },
  createdBy: {
    type: String,
    default: 'system',   // 관리자 ID (Phase 2)
  },
  lastAccessedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// TTL 인덱스: 만료된 토큰 자동 상태 변경은 앱 레벨에서 처리
tokenSchema.index({ expiresAt: 1 });

// 256-bit 랜덤 토큰 생성
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 만료일 계산
export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + env.tokenExpiryDays);
  return expiry;
}

export const Token = mongoose.model<IToken>('Token', tokenSchema);
