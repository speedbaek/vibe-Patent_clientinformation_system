import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useFormContext } from '../context/FormContext.js';
import { useTokenVerify } from '../hooks/useTokenVerify.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
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
  const { token } = useParams<{ token: string }>();
  const { state, dispatch } = useFormContext();
  const { tokenStatus, errorMessage, hasDraft, restoreDraft, skipDraft } = useTokenVerify(token);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // 특정 필드에 에러가 있는지 확인하는 헬퍼
  const getFieldError = useCallback((fieldPath: string) => {
    const err = validationErrors.find(e => e.field === fieldPath);
    return err?.message;
  }, [validationErrors]);

  // 자동저장
  useAutoSave(state, state.privacyConsented && state.currentStep < 5);

  // 로딩 중
  if (tokenStatus === 'loading') {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>인증 확인 중...</p>
      </div>
    );
  }

  // 토큰 만료
  if (tokenStatus === 'expired') {
    return (
      <div className="error-page">
        <h1>⏰ 링크가 만료되었습니다</h1>
        <p>{errorMessage}</p>
        <p>새로운 링크를 요청하시려면 담당 관리팀에 문의해 주세요.</p>
      </div>
    );
  }

  // 토큰 유효하지 않음
  if (tokenStatus === 'invalid') {
    return (
      <div className="error-page">
        <h1>❌ 유효하지 않은 링크입니다</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  // draft 복구 모달
  if (hasDraft) {
    return (
      <div className="draft-modal-overlay">
        <div className="draft-modal">
          <h2>이전에 작성하던 내용이 있습니다</h2>
          <p>이어서 작성하시겠습니까?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={restoreDraft}>
              이어서 작성
            </button>
            <button className="btn btn-secondary" onClick={skipDraft}>
              처음부터 작성
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 개인정보 동의 전
  if (!state.privacyConsented) {
    return (
      <div className="form-container">
        <header className="form-header">
          <h1>특허 출원 정보 입력</h1>
          <p>접수번호: {state.caseNumber}</p>
        </header>
        <PrivacyConsent />
      </div>
    );
  }

  // 네비게이션
  const needInventor = NEED_INVENTOR.includes(state.applicationType);

  function goNext() {
    // 다음으로 가기 전 현재 단계 유효성 검증
    const errors = validateCurrentStep(state);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmitError('');
      // 에러 영역으로 스크롤
      setTimeout(() => {
        document.querySelector('.validation-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setValidationErrors([]);
    let nextStep = state.currentStep + 1;
    // 상표/디자인은 발명자 단계 건너뛰기
    if (!needInventor && nextStep === 3) nextStep = 4;
    dispatch({ type: 'SET_STEP', step: nextStep });
  }

  function goPrev() {
    setValidationErrors([]);
    setSubmitError('');
    let prevStep = state.currentStep - 1;
    if (!needInventor && prevStep === 3) prevStep = 2;
    if (prevStep < 1) prevStep = 1;
    dispatch({ type: 'SET_STEP', step: prevStep });
  }

  async function handleSubmit() {
    // Step 4 유효성 검증 (서명 확인 등)
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
      });

      if (result.success) {
        setSubmittedAt(result.data.submittedAt);
        dispatch({ type: 'SET_STEP', step: 5 });
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 현재 단계 렌더링
  function renderStep() {
    switch (state.currentStep) {
      case 1: return <Step1TypeSelect getFieldError={getFieldError} />;
      case 2: return <Step2Applicant getFieldError={getFieldError} />;
      case 3: return <Step3Inventor getFieldError={getFieldError} />;
      case 4: return <Step4Documents getFieldError={getFieldError} />;
      case 5: return <Step5Complete submittedAt={submittedAt} />;
      default: return <Step1TypeSelect getFieldError={getFieldError} />;
    }
  }

  return (
    <div className="form-container">
      <header className="form-header">
        <h1>특허 출원 정보 입력</h1>
        <p>접수번호: {state.caseNumber}</p>
      </header>

      {state.currentStep < 5 && <ProgressBar />}

      <main className="form-main">
        {renderStep()}
      </main>

      {/* 유효성 에러 요약 (본문 하단) */}
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

      {/* 하단 네비게이션 */}
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
