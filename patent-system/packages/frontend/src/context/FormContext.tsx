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
  privacyConsented: false,
  privacyConsentedAt: null,
  newsletterConsent: false,
  applicationType: 'patent',
  contactPerson: { name: '', phone: '', email: '' },
  caseTitle: '',
  applicants: [createEmptyApplicant()],
  inventors: [createEmptyInventor()],
  currentStep: 1,
};

// ── 액션 타입 ──
type FormAction =
  | { type: 'SET_PRIVACY_CONSENT'; agreed: boolean }
  | { type: 'SET_NEWSLETTER_CONSENT'; agreed: boolean }
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
        phone: a.phone,
        email: a.email,
        address: { ...a.address },
        mailAddress: { ...a.mailAddress },
        useMailAddress: a.useMailAddress,
      }));

      return { ...state, inventors: newInventors };
    }

    case 'RESET':
      return { ...initialState, applicants: [createEmptyApplicant()], inventors: [createEmptyInventor()] };

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
