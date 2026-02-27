import { useEffect, useRef, useCallback } from 'react';
import { saveDraft } from '../api/client.js';
import { FormState } from '../types/index.js';

/**
 * 자동저장 훅 (3초 디바운스)
 * - 폼 상태가 변경될 때마다 3초 후 자동으로 서버에 저장
 * - 저장 중 상태와 마지막 저장 시간 반환
 */
export function useAutoSave(state: FormState, enabled: boolean = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);

  const doSave = useCallback(async () => {
    if (savingRef.current || !state.token || !state.privacyConsented) return;

    savingRef.current = true;
    try {
      const formData = {
        applicationType: state.applicationType,
        contactPerson: state.contactPerson,
        caseTitle: state.caseTitle,
        applicants: state.applicants,
        inventors: state.inventors,
        currentStep: state.currentStep,
      };

      await saveDraft(formData, state.currentStep);
      lastSavedRef.current = new Date().toISOString();
    } catch (error) {
      console.warn('자동저장 실패:', error);
    } finally {
      savingRef.current = false;
    }
  }, [state]);

  useEffect(() => {
    if (!enabled || !state.token || !state.privacyConsented) return;

    // 이전 타이머 클리어
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 3초 디바운스
    timerRef.current = setTimeout(() => {
      doSave();
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    state.applicationType,
    state.contactPerson,
    state.caseTitle,
    state.applicants,
    state.inventors,
    state.currentStep,
    enabled,
    doSave,
  ]);

  return {
    lastSaved: lastSavedRef.current,
  };
}
