import { FormState, Applicant, Inventor, NEED_INVENTOR } from '../types/index.js';

export interface ValidationError {
  field: string;       // 필드 경로 (예: "contactPerson.name", "applicants.0.nameKr")
  message: string;     // 사용자에게 보여줄 메시지
}

/**
 * Step 1 검증: 출원유형 + 담당자 연락처
 */
export function validateStep1(state: FormState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!state.applicationType) {
    errors.push({ field: 'applicationType', message: '출원 유형을 선택해 주세요.' });
  }

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
  const isDomesticIndividual = ap.personType === 'domestic_individual';
  const isCorp = ['domestic_corp', 'foreign_corp', 'govt', 'association'].includes(ap.personType);
  const isForeign = ap.personType === 'foreign_individual' || ap.personType === 'foreign_corp';

  // 개인 필수 필드
  if (isIndividual) {
    if (!ap.nameKr.trim()) {
      errors.push({ field: `${prefix}.nameKr`, message: `출원인 ${index + 1}: 성명을 입력해 주세요.` });
    }
    if (isDomesticIndividual) {
      if (!ap.rrn.trim()) {
        errors.push({ field: `${prefix}.rrn`, message: `출원인 ${index + 1}: 주민등록번호를 입력해 주세요.` });
      } else if (ap.rrn.replace(/[^0-9]/g, '').length !== 13) {
        errors.push({ field: `${prefix}.rrn`, message: `출원인 ${index + 1}: 주민등록번호 13자리를 정확히 입력해 주세요.` });
      }
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
    } else if (ap.bizNum.replace(/[^0-9]/g, '').length !== 10) {
      errors.push({ field: `${prefix}.bizNum`, message: `출원인 ${index + 1}: 사업자등록번호 10자리를 정확히 입력해 주세요.` });
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
    if (ap.personType === 'foreign_individual' && !ap.passport.trim()) {
      errors.push({ field: `${prefix}.passport`, message: `출원인 ${index + 1}: 여권번호를 입력해 주세요.` });
    }
  }

  // 주소 필수 검증
  if (!ap.address.zipcode.trim() || !ap.address.roadAddr.trim()) {
    errors.push({ field: `${prefix}.address`, message: `출원인 ${index + 1}: 주소를 입력해 주세요. (주소검색 버튼 사용)` });
  }

  // 서명 필수 검증 — 개인(자연인)만
  if (isIndividual && !ap.signatureDataUrl) {
    errors.push({ field: `${prefix}.signature`, message: `출원인 ${index + 1}: 서명을 입력해 주세요.` });
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
 * 발명자 1명 검증 (이름이 입력된 발명자만)
 */
function validateInventor(inv: Inventor, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `inventors.${index}`;

  // 이름이 입력된 발명자만 상세 검증
  if (!inv.nameKr.trim()) {
    // 다른 필드가 채워져 있으면 이름 필수
    if (inv.phone.trim() || inv.email.trim() || inv.nameEn.trim() || inv.rrn.trim()) {
      errors.push({ field: `${prefix}.nameKr`, message: `발명자 ${index + 1}: 성명을 입력해 주세요.` });
    }
    return errors;
  }

  // 주민등록번호 형식 검증
  if (inv.rrn.trim() && inv.rrn.replace(/[^0-9]/g, '').length !== 13) {
    errors.push({ field: `${prefix}.rrn`, message: `발명자 ${index + 1}: 주민등록번호 13자리를 정확히 입력해 주세요.` });
  }

  // 주소 입력된 경우 우편번호+도로명 검증
  if (inv.address.detailAddr.trim() && (!inv.address.zipcode.trim() || !inv.address.roadAddr.trim())) {
    errors.push({ field: `${prefix}.address`, message: `발명자 ${index + 1}: 주소검색 버튼으로 주소를 입력해 주세요.` });
  }

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
    errors.push(...validateInventor(inv, idx));
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
