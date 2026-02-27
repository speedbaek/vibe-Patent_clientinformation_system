import { useState, useEffect } from 'react';
import { verifyToken, setToken } from '../api/client.js';
import { useFormContext } from '../context/FormContext.js';

type TokenStatus = 'loading' | 'valid' | 'expired' | 'invalid';

/**
 * 토큰 검증 훅
 * - URL에서 토큰을 추출하여 서버 검증
 * - 유효하면 FormContext에 데이터 바인딩
 * - draft 데이터가 있으면 복구 여부 리턴
 */
export function useTokenVerify(tokenFromUrl: string | undefined) {
  const { dispatch } = useFormContext();
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!tokenFromUrl) {
      setTokenStatus('invalid');
      setErrorMessage('토큰이 제공되지 않았습니다.');
      return;
    }

    async function verify() {
      try {
        setToken(tokenFromUrl!);
        const result = await verifyToken(tokenFromUrl!);

        if (result.success) {
          dispatch({
            type: 'SET_TOKEN',
            token: tokenFromUrl!,
            caseNumber: result.data.caseNumber,
          });

          // 기존 동의 여부 체크
          if (result.data.privacyConsent?.agreed) {
            dispatch({ type: 'SET_PRIVACY_CONSENT', agreed: true });
          }

          // draft 데이터 확인
          if (result.data.draftData) {
            setHasDraft(true);
            setDraftData(result.data.draftData);
          }

          setTokenStatus('valid');
        } else {
          setTokenStatus('invalid');
          setErrorMessage(result.error || '토큰 검증 실패');
        }
      } catch (error: any) {
        const msg = error?.response?.data?.error || '서버 연결에 실패했습니다.';
        if (msg.includes('만료')) {
          setTokenStatus('expired');
        } else {
          setTokenStatus('invalid');
        }
        setErrorMessage(msg);
      }
    }

    verify();
  }, [tokenFromUrl, dispatch]);

  // draft 복구 함수
  const restoreDraft = () => {
    if (draftData) {
      dispatch({ type: 'RESTORE_DRAFT', draftData });
      setHasDraft(false);
    }
  };

  const skipDraft = () => {
    setHasDraft(false);
    setDraftData(null);
  };

  return {
    tokenStatus,
    errorMessage,
    hasDraft,
    restoreDraft,
    skipDraft,
  };
}
