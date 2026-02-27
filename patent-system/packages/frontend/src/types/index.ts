// ── 출원인 유형 ──
export type PersonType =
  | 'domestic_individual'
  | 'domestic_corp'
  | 'govt'
  | 'foreign_corp'
  | 'foreign_individual'
  | 'association';

// ── 출원 유형 ──
export type ApplicationType = 'patent' | 'trademark' | 'design' | 'pct';

// ── 주소 ──
export interface Address {
  zipcode: string;
  roadAddr: string;
  detailAddr: string;
}

// ── 첨부 문서 ──
export interface UploadedDocument {
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
}

// ── 출원인 ──
export interface Applicant {
  id: string;
  personType: PersonType;

  // 개인
  nameKr: string;
  rrn: string;
  nationality: string;

  // 법인
  corpName: string;
  corpRegNum: string;
  bizNum: string;
  ceoName: string;

  // 외국인
  nameEn: string;
  passport: string;

  // 주소
  address: Address;
  mailAddress: Address;
  useMailAddress: boolean;

  // 연락처
  phone: string;
  email: string;

  // 서명 & 문서
  signatureDataUrl: string;
  documents: UploadedDocument[];
}

// ── 발명자 ──
export interface Inventor {
  id: string;
  nameKr: string;
  nameEn: string;
  rrn: string;
  phone: string;
  email: string;
  address: Address;
  mailAddress: Address;
  useMailAddress: boolean;
}

// ── 연락처 ──
export interface ContactPerson {
  name: string;
  phone: string;
  email: string;
}

// ── 폼 전체 상태 ──
export interface FormState {
  // 개인정보 동의
  privacyConsented: boolean;
  privacyConsentedAt: string | null;
  newsletterConsent: boolean;

  // Step 1
  applicationType: ApplicationType;
  contactPerson: ContactPerson;
  caseTitle: string;

  // Step 2
  applicants: Applicant[];

  // Step 3
  inventors: Inventor[];

  // 현재 단계
  currentStep: number;
}

// ── 발명자가 필요한 출원 유형 ──
export const NEED_INVENTOR: ApplicationType[] = ['patent', 'pct'];

// ── 출원 유형 라벨 ──
export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  patent: '특허/실용신안',
  trademark: '상표',
  design: '디자인',
  pct: 'PCT 국제출원',
};

// ── 출원인 유형 라벨 ──
export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  domestic_individual: '국내 자연인 (개인)',
  domestic_corp: '국내 법인',
  govt: '국가/지방자치단체',
  foreign_corp: '외국 법인',
  foreign_individual: '외국 자연인 (개인)',
  association: '사단/재단법인',
};

// ── 국적 옵션 ──
export const NATIONALITY_OPTIONS = [
  { value: 'KR', label: '대한민국' },
  { value: 'US', label: '미국' },
  { value: 'CN', label: '중국' },
  { value: 'JP', label: '일본' },
  { value: 'DE', label: '독일' },
  { value: 'GB', label: '영국' },
  { value: 'FR', label: '프랑스' },
  { value: 'OTHER', label: '기타' },
];

// ── 빈 출원인 생성 ──
export function createEmptyApplicant(id?: string): Applicant {
  return {
    id: id || `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    personType: 'domestic_individual',
    nameKr: '', rrn: '', nationality: 'KR',
    corpName: '', corpRegNum: '', bizNum: '', ceoName: '',
    nameEn: '', passport: '',
    address: { zipcode: '', roadAddr: '', detailAddr: '' },
    mailAddress: { zipcode: '', roadAddr: '', detailAddr: '' },
    useMailAddress: false,
    phone: '', email: '',
    signatureDataUrl: '',
    documents: [],
  };
}

// ── 빈 발명자 생성 ──
export function createEmptyInventor(id?: string): Inventor {
  return {
    id: id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nameKr: '', nameEn: '', rrn: '',
    phone: '', email: '',
    address: { zipcode: '', roadAddr: '', detailAddr: '' },
    mailAddress: { zipcode: '', roadAddr: '', detailAddr: '' },
    useMailAddress: false,
  };
}
