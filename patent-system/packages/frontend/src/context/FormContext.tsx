import { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  FormState,
  Applicant,
  Inventor,
  ApplicationType,
  ContactPerson,
  createEmptyApplicant,
  createEmptyInventor,
} from '../types/index.js';

// ── 초기 상태 ──
const initialState: FormState = {
  token: '',
  caseNumber: '',
  status: 'draft',
  privacyConsented: false,
  privacyConsentedAt: null,
  applicationType: 'patent',
  contactPerson: { name: '', phone: '', email: '' },
  caseTitle: '',
  applicants: [createEmptyApplicant()],
  inventors: [createEmptyInventor()],
  currentStep: 1,
};

// ── 액션 타입 ──
type FormAction =
  | { type: 'SET_TOKEN'; token: string; caseNumber: string }
  | { type: 'SET_PRIVACY_CONSENT'; agreed: boolean }
  | { type: 'SET_APPLICATION_TYPE'; applicationType: ApplicationType }
  | { type: 'SET_CONTACT'; contactPerson: ContactPerson }
  | { type: 'SET_CASE_TITLE'; caseTitle: string }
  | { type: 'SET_STEP'; step: number }
  | { type: 'ADD_APPLICANT' }
  | { type: 'REMOVE_APPLICANT'; id: string }
  | { type: 'UPDATE_APPLICANT'; id: string; data: Partial<Applicant> }
  | { type: 'ADD_INVENTOR' }
  | { type: 'REMOVE_INVENTOR'; id: string }
  | { type: 'UPDATE_INVENTOR'; id: string; data: Partial<Inventor> }
  | { type: 'COPY_APPLICANTS_TO_INVENTORS' }
  | { type: 'RESTORE_DRAFT'; draftData: Record<string, unknown> }
  | { type: 'RESET' };

// ── 리듀서 ──
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TOKEN':
      return { ...state, token: action.token, caseNumber: action.caseNumber };

    case 'SET_PRIVACY_CONSENT':
      return {
        ...state,
        privacyConsented: action.agreed,
        privacyConsentedAt: action.agreed ? new Date().toISOString() : null,
      };

    case 'SET_APPLICATION_TYPE':
      return { ...state, applicationType: action.applicationType };

    case 'SET_CONTACT':
      return { ...state, contactPerson: action.contactPerson };

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
      // 개인(자연인)만 발명자로 복사 (법인/기관은 발명자가 될 수 없음)
      const individualTypes = ['domestic_individual', 'foreign_individual'];
      const individuals = state.applicants.filter((a) =>
        individualTypes.includes(a.personType)
      );

      if (individuals.length === 0) return state;

      const newInventors = individuals.map((a) =>
        createEmptyInventor(`inv-copy-${a.id}`)
      ).map((inv, idx) => ({
        ...inv,
        nameKr: individuals[idx].nameKr || individuals[idx].nameEn,
        phone: individuals[idx].phone,
        email: individuals[idx].email,
      }));

      return { ...state, inventors: newInventors };
    }

    case 'RESTORE_DRAFT': {
      const d = action.draftData;
      return {
        ...state,
        applicationType: (d.applicationType as ApplicationType) || state.applicationType,
        contactPerson: (d.contactPerson as ContactPerson) || state.contactPerson,
        caseTitle: (d.caseTitle as string) || state.caseTitle,
        applicants: (d.applicants as Applicant[]) || state.applicants,
        inventors: (d.inventors as Inventor[]) || state.inventors,
        currentStep: (d.currentStep as number) || state.currentStep,
        privacyConsented: true,
      };
    }

    case 'RESET':
      return { ...initialState };

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
  const [state, dispatch] = useReducer(formReducer, initialState);
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
