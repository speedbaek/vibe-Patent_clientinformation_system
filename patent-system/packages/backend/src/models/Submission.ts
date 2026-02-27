import mongoose, { Schema, Document } from 'mongoose';

// ── 출원인 유형 ──
export type PersonType =
  | 'domestic_individual'
  | 'domestic_corp'
  | 'govt'
  | 'foreign_corp'
  | 'foreign_individual'
  | 'association';

// ── 출원 유형 ──
export type ApplicationType = 'patent' | 'utility' | 'trademark' | 'design' | 'pct';

// ── 접수 상태 ──
export type SubmissionStatus = 'draft' | 'submitted' | 'reviewing' | 'complete' | 'rejected';

// ── 주소 ──
const addressSchema = new Schema({
  zipcode: { type: String, default: '' },
  roadAddr: { type: String, default: '' },
  detailAddr: { type: String, default: '' },
}, { _id: false });

// ── 첨부 문서 ──
const documentSchema = new Schema({
  fileName: { type: String, default: '' },
  originalName: { type: String, default: '' },
  fileType: { type: String, default: 'other' },   // id_doc, biz_reg, corp_seal, corp_seal_cert, other
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  storagePath: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

// ── 출원인 ──
const applicantSchema = new Schema({
  personType: {
    type: String,
    enum: ['domestic_individual', 'domestic_corp', 'govt', 'foreign_corp', 'foreign_individual', 'association'],
    required: true,
  },

  // 공통
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: addressSchema, default: () => ({}) },
  mailAddress: { type: addressSchema, default: () => ({}) },
  useMailAddress: { type: Boolean, default: false },

  // 개인 (국내/외국 자연인)
  nameKr: { type: String, default: '' },
  rrnEncrypted: { type: String, default: '' },         // AES-256 암호화
  nationality: { type: String, default: 'KR' },
  jobTitle: { type: String, default: '' },

  // 법인/기관 (국내법인, 외국법인, 국가기관, 사단재단)
  corpName: { type: String, default: '' },
  corpRegNumEncrypted: { type: String, default: '' },  // AES-256
  bizNumEncrypted: { type: String, default: '' },      // AES-256
  ceoName: { type: String, default: '' },

  // 외국인 추가
  nameEn: { type: String, default: '' },
  passportEncrypted: { type: String, default: '' },    // AES-256

  // 서명
  signature: {
    data: { type: String, default: '' },   // Base64 or 저장 경로
    uploadedAt: { type: Date },
  },

  // 첨부 문서
  documents: [documentSchema],
}, { _id: true });

// ── 발명자 ──
const inventorSchema = new Schema({
  nameKr: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
}, { _id: true });

// ── 감사 로그 ──
const auditLogSchema = new Schema({
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '' },
  details: { type: String, default: '' },
}, { _id: false });

// ── 메인: 접수 데이터 ──
export interface ISubmission extends Document {
  caseNumber: string;
  applicationType: ApplicationType;
  status: SubmissionStatus;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  caseTitle: string;
  privacyConsent: {
    agreed: boolean;
    timestamp: Date | null;
    ipAddress: string;
  };
  applicants: typeof applicantSchema[];
  inventors: typeof inventorSchema[];
  draftData: Record<string, unknown> | null;
  auditLog: typeof auditLogSchema[];
  createdAt: Date;
  submittedAt: Date | null;
  updatedAt: Date;
}

const submissionSchema = new Schema({
  caseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  applicationType: {
    type: String,
    enum: ['patent', 'utility', 'trademark', 'design', 'pct'],
    default: 'patent',
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewing', 'complete', 'rejected'],
    default: 'draft',
  },

  contactPerson: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },

  caseTitle: { type: String, default: '' },

  privacyConsent: {
    agreed: { type: Boolean, default: false },
    timestamp: { type: Date, default: null },
    ipAddress: { type: String, default: '' },
  },

  applicants: [applicantSchema],
  inventors: [inventorSchema],

  // 임시저장 데이터 (JSON blob)
  draftData: { type: Schema.Types.Mixed, default: null },

  auditLog: [auditLogSchema],

  submittedAt: { type: Date, default: null },
}, {
  timestamps: true,  // createdAt, updatedAt 자동 생성
});

// 접수번호 자동 생성 헬퍼
export function generateCaseNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${dateStr}-${random}`;
}

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
