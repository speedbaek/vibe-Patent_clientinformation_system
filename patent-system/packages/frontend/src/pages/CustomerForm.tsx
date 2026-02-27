import { useState, useCallback } from 'react';
import { useFormContext } from '../context/FormContext.js';
import { submitForm } from '../api/client.js';
import { NEED_INVENTOR } from '../types/index.js';
import { validateCurrentStep, validateStep4, ValidationError } from '../utils/validators.js';

import PrivacyConsent from '../components/PrivacyConsent.js';
import ProgressBar from '../components/ProgressBar.js';
import Step1TypeSelect from './steps/Step1TypeSelect.js';
import Step2Applicant from './steps/Step2Applicant.js';
import Step3Inventor from './steps/Step3Inventor.js';
import Step4Documents from './steps/Step4Documents.js';
import Step5Complete from './steps/Step5Complete.js';

export default function CustomerForm() {
  const { state, dispatch } = useFormContext();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const getFieldError = useCallback((fieldPath: string) => {
    const err = validationErrors.find(e => e.field === fieldPath);
    return err?.message;
  }, [validationErrors]);

  // 개인정보 동의 전
  if (!state.privacyConsented) {
    return (
      <div className="form-container">
        <header className="form-header">
          <h1>지식재산권 출원 정보 입력</h1>
          <p>출원에 필요한 정보를 입력해 주세요</p>
        </header>
        <PrivacyConsent />
        <div style={{ textAlign: 'center', marginTop: '24px', paddingBottom: '20px' }}>
          <a href="/upload-additional" style={{ color: '#1a5fb4', fontSize: '14px' }}>
            이미 접수하셨나요? → 첨부서류 추가제출하기
          </a>
        </div>
      </div>
    );
  }

  // 네비게이션
  const needInventor = NEED_INVENTOR.includes(state.applicationType);

  function goNext() {
    const errors = validateCurrentStep(state);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmitError('');
      setTimeout(() => {
        document.querySelector('.validation-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setValidationErrors([]);
    let nextStep = state.currentStep + 1;
    if (!needInventor && nextStep === 3) nextStep = 4;
    dispatch({ type: 'SET_STEP', step: nextStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goPrev() {
    setValidationErrors([]);
    setSubmitError('');
    let prevStep = state.currentStep - 1;
    if (!needInventor && prevStep === 3) prevStep = 2;
    if (prevStep < 1) prevStep = 1;
    dispatch({ type: 'SET_STEP', step: prevStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    const errors = validateStep4(state);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmitError('');
      setTimeout(() => {
        document.querySelector('.validation-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setValidationErrors([]);
    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await submitForm({
        applicationType: state.applicationType,
        contactPerson: state.contactPerson,
        caseTitle: state.caseTitle,
        applicants: state.applicants,
        inventors: state.inventors,
        privacyConsent: {
          agreed: true,
          timestamp: state.privacyConsentedAt,
        },
        newsletterConsent: state.newsletterConsent,
      });

      if (result.success) {
        setSubmittedAt(result.data.submittedAt);
        setCaseNumber(result.data.caseNumber);
        dispatch({ type: 'SET_STEP', step: 5 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderStep() {
    switch (state.currentStep) {
      case 1: return <Step1TypeSelect getFieldError={getFieldError} />;
      case 2: return <Step2Applicant getFieldError={getFieldError} />;
      case 3: return <Step3Inventor getFieldError={getFieldError} />;
      case 4: return <Step4Documents getFieldError={getFieldError} />;
      case 5: return <Step5Complete submittedAt={submittedAt} caseNumber={caseNumber} />;
      default: return <Step1TypeSelect getFieldError={getFieldError} />;
    }
  }

  return (
    <div className="form-container">
      <header className="form-header">
        <h1>지식재산권 출원 정보 입력</h1>
        <p>출원에 필요한 정보를 입력해 주세요</p>
      </header>

      {state.currentStep < 5 && <ProgressBar />}

      <main className="form-main">
        {renderStep()}
      </main>

      {state.currentStep < 5 && validationErrors.length > 0 && (
        <div className="validation-error-summary">
          <div className="validation-error-header">
            <span className="validation-error-icon">⚠️</span>
            <strong>입력 내용을 확인해 주세요</strong>
          </div>
          <ul className="validation-error-list">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {state.currentStep < 5 && (
        <nav className="bottom-nav">
          {submitError && (
            <div className="info-box red" style={{ marginBottom: '12px' }}>
              ⚠️ {submitError}
            </div>
          )}
          <div className="nav-buttons">
            {state.currentStep > 1 && (
              <button className="btn btn-secondary" onClick={goPrev}>
                ← 이전
              </button>
            )}
            <div style={{ flex: 1 }} />
            {state.currentStep < 4 ? (
              <button className="btn btn-primary" onClick={goNext}>
                다음 →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '제출 중...' : '최종 제출'}
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
