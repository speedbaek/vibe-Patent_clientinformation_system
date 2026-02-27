import { useFormContext } from '../../context/FormContext.js';
import { APPLICATION_TYPE_LABELS } from '../../types/index.js';

interface Step5Props {
  submittedAt?: string;
  caseNumber?: string;
}

export default function Step5Complete({ submittedAt, caseNumber }: Step5Props) {
  const { state } = useFormContext();

  const now = submittedAt ? new Date(submittedAt) : new Date();
  const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${now.getMinutes()}분`;

  // 7일 후 기한
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 7);
  const deadlineStr = `${deadline.getFullYear()}년 ${deadline.getMonth() + 1}월 ${deadline.getDate()}일`;

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ marginBottom: '8px', color: '#2e7d32' }}>출원 정보가 정상적으로 접수되었습니다</h2>
          <p style={{ color: '#666', marginBottom: '32px' }}>
            제출해 주신 정보를 확인 후 출원 절차를 진행하겠습니다.
          </p>

          <div className="receipt-box">
            <div className="receipt-row">
              <span className="receipt-label">접수번호</span>
              <span className="receipt-value">{caseNumber || '-'}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">출원유형</span>
              <span className="receipt-value">
                {APPLICATION_TYPE_LABELS[state.applicationType]}
              </span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">접수일시</span>
              <span className="receipt-value">{formattedDate}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">출원인</span>
              <span className="receipt-value">{state.applicants.length}명</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">발명자</span>
              <span className="receipt-value">{state.inventors.length}명</span>
            </div>
            {state.caseTitle && (
              <div className="receipt-row">
                <span className="receipt-label">사건명</span>
                <span className="receipt-value">{state.caseTitle}</span>
              </div>
            )}
          </div>

          <div className="info-box blue" style={{ marginTop: '24px', textAlign: 'left' }}>
            <strong>안내사항</strong>
            <p>
              추가 서류가 필요한 경우 <strong>{deadlineStr}</strong>까지 제출해 주시기 바랍니다.
              문의사항은 관리팀에 연락해 주세요.
            </p>
          </div>

          <div className="info-box orange" style={{ marginTop: '16px', textAlign: 'left' }}>
            <strong>미제출 서류가 있으신가요?</strong>
            <p>
              서명, 사업자등록증, 인감 등 미제출 서류는 접수번호(<strong>{caseNumber}</strong>)를
              이용하여 언제든 추가 제출할 수 있습니다.
            </p>
            <a
              href={`/upload-additional?case=${encodeURIComponent(caseNumber || '')}`}
              style={{ color: '#bf360c', fontWeight: 600 }}
            >
              첨부서류 추가제출하기 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
