import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  FormState,
  Applicant,
  Inventor,
  ApplicationType,
  ContactPerson,
  UploadedDocument,
  createEmptyApplicant,
  createEmptyInventor,
  createEmptyContact,
} from '../types/index.js';

const STORAGE_KEY = 'patent-form-draft';

// ── 초기 상태 ──
const initialState: FormState = {
  privacyConsented: false,
  privacyConsentedAt: null,
  newsletterConsent: true,
  applicationType: '',
  contactPersons: [createEmptyContact()],
  caseTitle: '',
  applicants: [createEmptyApplicant()],
  inventors: [createEmptyInventor()],
  extraDocuments: [],
  currentStep: 1,
};

function loadSavedState(): FormState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;
    const parsed = JSON.parse(saved);
    // 제출 완료(step 5) 상태였으면 초기화
    if (parsed.currentStep >= 5) {
      localStorage.removeItem(STORAGE_KEY);
      return initialState;
    }
    // 기존 contactPerson → contactPersons 마이그레이션
    if (parsed.contactPerson && !parsed.contactPersons) {
      parsed.contactPersons = [{
        id: `ct-migrated`,
        ...parsed.contactPerson,
      }];
      delete parsed.contactPerson;
    }
    // contactPersons가 비어있으면 기본값
    if (!parsed.contactPersons || parsed.contactPersons.length === 0) {
      parsed.contactPersons = [createEmptyContact()];
    }
    // taxEmail 필드 마이그레이션
    parsed.contactPersons = parsed.contactPersons.map((c: any) => ({
      ...c,
      taxEmail: c.taxEmail ?? '',
    }));
    // extraDocuments 마이그레이션
    if (!parsed.extraDocuments) {
      parsed.extraDocuments = [];
    }
    // PCT → foreign_patent 마이그레이션
    if (parsed.applicationType === 'pct') {
      parsed.applicationType = 'foreign_patent';
    }
    // 뉴스레터 옵트아웃 방식 마이그레이션 (기본 체크)
    if (!parsed._nlMigrated) {
      parsed.newsletterConsent = true;
      parsed._nlMigrated = true;
    }
    return parsed as FormState;
  } catch {
    return initialState;
  }
}

/** 민감 정보를 제거한 상태를 localStorage에 저장 */
function saveState(state: FormState) {
  try {
    // 제출 완료 상태면 저장하지 않고 삭제
    if (state.currentStep >= 5) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // 민감 필드 제거 후 저장 (XSS 공격 시 PII 노출 방지)
    const sanitized = {
      ...state,
      applicants: state.applicants.map((ap) => ({
        ...ap,
        rrn: '',                   // 주민등록번호
        corpRegNum: '',            // 법인등록번호
        bizNum: '',                // 사업자등록번호
        passport: '',              // 여권번호
        signatureDataUrl: '',      // 서명 이미지
        bizLicenseDataUrl: '',     // 사업자등록증 이미지
        bizLicenseFileName: '',
      })),
      inventors: state.inventors.map((inv) => ({
        ...inv,
        rrn: '',                   // 주민등록번호
      })),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

// ── 액션 타입 ──
type FormAction =
  | { type: 'SET_PRIVACY_CONSENT'; agreed: boolean }
  | { type: 'SET_NEWSLETTER_CONSENT'; agreed: boolean }
  | { type: 'SET_APPLICATION_TYPE'; applicationType: ApplicationType }
  | { type: 'ADD_CONTACT' }
  | { type: 'REMOVE_CONTACT'; id: string }
  | { type: 'UPDATE_CONTACT'; id: string; data: Partial<ContactPerson> }
  | { type: 'SET_CASE_TITLE'; caseTitle: string }
  | { type: 'SET_STEP'; step: number }
  | { type: 'ADD_APPLICANT' }
  | { type: 'REMOVE_APPLICANT'; id: string }
  | { type: 'UPDATE_APPLICANT'; id: string; data: Partial<Applicant> }
  | { type: 'ADD_INVENTOR' }
  | { type: 'REMOVE_INVENTOR'; id: string }
  | { type: 'UPDATE_INVENTOR'; id: string; data: Partial<Inventor> }
  | { type: 'COPY_APPLICANTS_TO_INVENTORS' }
  | { type: 'ADD_EXTRA_DOCUMENT'; doc: UploadedDocument }
  | { type: 'REMOVE_EXTRA_DOCUMENT'; index: number }
  | { type: 'RESET' };

// ── 리듀서 ──
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_PRIVACY_CONSENT':
      return {
        ...state,
        privacyConsented: action.agreed,
        privacyConsentedAt: action.agreed ? new Date().toISOString() : null,
      };

    case 'SET_NEWSLETTER_CONSENT':
      return { ...state, newsletterConsent: action.agreed };

    case 'SET_APPLICATION_TYPE':
      return { ...state, applicationType: action.applicationType };

    case 'ADD_CONTACT':
      return { ...state, contactPersons: [...state.contactPersons, createEmptyContact()] };

    case 'REMOVE_CONTACT':
      if (state.contactPersons.length <= 1) return state;
      return {
        ...state,
        contactPersons: state.contactPersons.filter((c) => c.id !== action.id),
      };

    case 'UPDATE_CONTACT':
      return {
        ...state,
        contactPersons: state.contactPersons.map((c) =>
          c.id === action.id ? { ...c, ...action.data } : c
        ),
      };

    case 'SET_CASE_TITLE':
      return { ...state, caseTitle: action.caseTitle };

    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'ADD_APPLICANT':
      return { ...state, applicants: [...state.applicants, createEmptyApplicant()] };

    case 'REMOVE_APPLICANT':
      if (state.applicants.length <= 1) return state;
      return {
        ...state,
        applicants: state.applicants.filter((a) => a.id !== action.id),
      };

    case 'UPDATE_APPLICANT':
      return {
        ...state,
        applicants: state.applicants.map((a) =>
          a.id === action.id ? { ...a, ...action.data } : a
        ),
      };

    case 'ADD_INVENTOR':
      return { ...state, inventors: [...state.inventors, createEmptyInventor()] };

    case 'REMOVE_INVENTOR':
      if (state.inventors.length <= 1) return state;
      return {
        ...state,
        inventors: state.inventors.filter((i) => i.id !== action.id),
      };

    case 'UPDATE_INVENTOR':
      return {
        ...state,
        inventors: state.inventors.map((i) =>
          i.id === action.id ? { ...i, ...action.data } : i
        ),
      };

    case 'COPY_APPLICANTS_TO_INVENTORS': {
      const individualTypes = ['domestic_individual', 'foreign_individual'];
      const individuals = state.applicants.filter((a) =>
        individualTypes.includes(a.personType)
      );

      if (individuals.length === 0) return state;

      const newInventors = individuals.map((a) => ({
        ...createEmptyInventor(`inv-copy-${a.id}`),
        nameKr: a.nameKr,
        nameEn: a.nameEn,
        rrn: a.rrn,
        address: { ...a.address },
        mailAddress: { ...a.mailAddress },
        useMailAddress: a.useMailAddress,
      }));

      return { ...state, inventors: newInventors };
    }

    case 'ADD_EXTRA_DOCUMENT':
      return { ...state, extraDocuments: [...state.extraDocuments, action.doc] };

    case 'REMOVE_EXTRA_DOCUMENT':
      return {
        ...state,
        extraDocuments: state.extraDocuments.filter((_, i) => i !== action.index),
      };

    case 'RESET': {
      localStorage.removeItem(STORAGE_KEY);
      return {
        ...initialState,
        contactPersons: [createEmptyContact()],
        applicants: [createEmptyApplicant()],
        inventors: [createEmptyInventor()],
        extraDocuments: [],
      };
    }

    default:
      return state;
  }
}

// ── Context ──
interface FormContextType {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

const FormContext = createContext<FormContextType | null>(null);

export function FormProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(formReducer, undefined, loadSavedState);

  // 상태 변경 시 자동 저장
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <FormContext.Provider value={{ state, dispatch }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext(): FormContextType {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return ctx;
}
