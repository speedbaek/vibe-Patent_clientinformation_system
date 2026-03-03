import { useState, useCallback, useEffect, useRef } from 'react';
import { useFormContext } from '../context/FormContext.js';
import { submitForm } from '../api/client.js';
import { NEED_INVENTOR } from '../types/index.js';
import { validateCurrentStep, validateStep1, validateStep2, validateStep3, validateStep4, ValidationError } from '../utils/validators.js';

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

  // ── 폼 상태 변경 시 검증 에러 자동 초기화 ──
  // (사용자가 필드를 수정하면 이전 검증 에러를 즉시 제거)
  const prevStepRef = useRef(state.currentStep);
  useEffect(() => {
    // 단계 변경은 별도로 처리하므로 제외
    if (prevStepRef.current !== state.currentStep) {
      prevStepRef.current = state.currentStep;
      return;
    }
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.contactPersons, state.applicants, state.inventors, state.applicationType, state.caseTitle]);

  // ── 브라우저 뒤로가기/앞으로가기 ↔ 폼 단계 연동 ──
  const isPopState = useRef(false);

  // 최초 마운트: 히스토리 스택에 step 1 ~ currentStep까지 시딩
  useEffect(() => {
    const needInv = NEED_INVENTOR.includes(state.applicationType);
    const cur = state.currentStep;

    // step 1을 base 엔트리로 설정
    window.history.replaceState({ formStep: 1 }, '');

    // step 2 ~ currentStep까지 차례로 push
    for (let s = 2; s <= cur; s++) {
      if (!needInv && s === 3) continue; // 발명자 불필요 시 skip
      window.history.pushState({ formStep: s }, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 단계 변경 시 히스토리에 push (popstate가 아닌 경우만)
  useEffect(() => {
    if (isPopState.current) {
      isPopState.current = false;
      return;
    }
    const historyStep = window.history.state?.formStep;
    if (historyStep !== state.currentStep) {
      window.history.pushState({ formStep: state.currentStep }, '');
    }
  }, [state.currentStep]);

  // popstate (뒤로가기/앞으로가기) 이벤트 처리
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const targetStep = e.state?.formStep;
      if (typeof targetStep === 'number' && targetStep >= 1) {
        isPopState.current = true;
        setValidationErrors([]);
        setSubmitError('');
        dispatch({ type: 'SET_STEP', step: targetStep });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // formStep이 없으면 SPA 밖으로 나감 (자연스러운 브라우저 동작)
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch]);

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
    // 최종 제출 전 모든 단계 통합 검증
    const allErrors = [
      ...validateStep1(state),
      ...validateStep2(state),
      ...(needInventor ? validateStep3(state) : []),
      ...validateStep4(state),
    ];
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
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
        contactPersons: state.contactPersons,
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
    <div className="form-container" data-step={state.currentStep}>
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
