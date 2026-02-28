import { FormState, Applicant, NEED_INVENTOR } from '../types/index.js';

export interface ValidationError {
  field: string;       // 필드 경로 (예: "contactPerson.name", "applicants.0.nameKr")
  message: string;     // 사용자에게 보여줄 메시지
}

/**
 * Step 1 검증: 출원유형 + 담당자 연락처
 */
export function validateStep1(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];

  state.contactPersons.forEach((contact, idx) => {
    const label = state.contactPersons.length > 1 ? `담당자 ${idx + 1}: ` : '';
    const prefix = `contactPersons.${idx}`;

    if (!contact.name.trim()) {
      errors.push({ field: `${prefix}.name`, message: `${label}성함을 입력해 주세요.` });
    }
    if (!contact.phone.trim()) {
      errors.push({ field: `${prefix}.phone`, message: `${label}연락처를 입력해 주세요.` });
    }
    if (!contact.email.trim()) {
      errors.push({ field: `${prefix}.email`, message: `${label}이메일을 입력해 주세요.` });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      errors.push({ field: `${prefix}.email`, message: `${label}올바른 이메일 형식을 입력해 주세요.` });
    }
  });

  return errors;
}

/**
 * 출원인 1명 검증
 */
function validateApplicant(ap: Applicant, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `applicants.${index}`;
  const isIndividual = ap.personType === 'domestic_individual' || ap.personType === 'foreign_individual';
  const isCorp = ['domestic_corp', 'foreign_corp', 'govt', 'association'].includes(ap.personType);
  const isForeign = ap.personType === 'foreign_individual' || ap.personType === 'foreign_corp';

  // 개인 필수 필드
  if (isIndividual) {
    if (!ap.nameKr.trim()) {
      errors.push({ field: `${prefix}.nameKr`, message: `출원인 ${index + 1}: 성명을 입력해 주세요.` });
    }
    if (!ap.rrn.trim()) {
      errors.push({ field: `${prefix}.rrn`, message: `출원인 ${index + 1}: 주민등록번호를 입력해 주세요.` });
    }
  }

  // 법인 필수 필드
  if (isCorp) {
    if (!ap.corpName.trim()) {
      errors.push({ field: `${prefix}.corpName`, message: `출원인 ${index + 1}: 법인명을 입력해 주세요.` });
    }
    if (!ap.ceoName.trim()) {
      errors.push({ field: `${prefix}.ceoName`, message: `출원인 ${index + 1}: 대표이사 성명을 입력해 주세요.` });
    }
    if (!ap.corpRegNum.trim()) {
      errors.push({ field: `${prefix}.corpRegNum`, message: `출원인 ${index + 1}: 법인등록번호를 입력해 주세요.` });
    }
    if (!ap.bizNum.trim()) {
      errors.push({ field: `${prefix}.bizNum`, message: `출원인 ${index + 1}: 사업자등록번호를 입력해 주세요.` });
    }
  }

  // 국내 법인 사업자등록증 필수
  if (ap.personType === 'domestic_corp' && !ap.bizLicenseDataUrl) {
    errors.push({ field: `${prefix}.bizLicense`, message: `출원인 ${index + 1}: 사업자등록증을 첨부해 주세요.` });
  }

  // 국내 개인 영문 성명 필수
  if (ap.personType === 'domestic_individual' && !ap.nameEn.trim()) {
    errors.push({ field: `${prefix}.nameEn`, message: `출원인 ${index + 1}: 영문 성명을 입력해 주세요.` });
  }

  // 국내 법인 영문 명칭 필수
  if (ap.personType === 'domestic_corp' && !ap.nameEn.trim()) {
    errors.push({ field: `${prefix}.nameEn`, message: `출원인 ${index + 1}: 영문 명칭을 입력해 주세요.` });
  }

  // 외국인 추가 필드
  if (isForeign) {
    if (!ap.nameEn.trim()) {
      errors.push({ field: `${prefix}.nameEn`, message: `출원인 ${index + 1}: 영문 성명을 입력해 주세요.` });
    }
  }

  return errors;
}

/**
 * Step 2 검증: 출원인 정보
 */
export function validateStep2(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (state.applicants.length === 0) {
    errors.push({ field: 'applicants', message: '출원인을 최소 1명 입력해 주세요.' });
    return errors;
  }

  state.applicants.forEach((ap, idx) => {
    errors.push(...validateApplicant(ap, idx));
  });

  return errors;
}

/**
 * Step 3 검증: 발명자 정보
 */
export function validateStep3(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!NEED_INVENTOR.includes(state.applicationType)) {
    return errors; // 상표, 해외(상표,디자인)은 발명자 불필요
  }

  // 발명자가 전부 비어있는지 확인
  const hasAnyInventor = state.inventors.some(inv => inv.nameKr.trim() !== '');
  if (!hasAnyInventor) {
    errors.push({ field: 'inventors', message: '발명자를 최소 1명 입력해 주세요.' });
    return errors;
  }

  state.inventors.forEach((inv, idx) => {
    if (inv.nameKr.trim() === '' && (inv.phone.trim() !== '' || inv.email.trim() !== '')) {
      errors.push({ field: `inventors.${idx}.nameKr`, message: `발명자 ${idx + 1}: 성명을 입력해 주세요.` });
    }
  });

  return errors;
}

/**
 * Step 4 검증: 서류/서명 — 필수 아님 (추후 제출 가능)
 */
export function validateStep4(_state: FormState): ValidationError[] {
  return [];
}

/**
 * 현재 Step에 맞는 검증 실행
 */
export function validateCurrentStep(state: FormState): ValidationError[] {
  switch (state.currentStep) {
    case 1: return validateStep1(state);
    case 2: return validateStep2(state);
    case 3: return validateStep3(state);
    case 4: return validateStep4(state);
    default: return [];
  }
}
