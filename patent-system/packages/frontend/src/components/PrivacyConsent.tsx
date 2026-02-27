import { useState } from 'react';
import { useFormContext } from '../context/FormContext.js';

export default function PrivacyConsent() {
  const { dispatch } = useFormContext();
  const [checked, setChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  function handleConsent() {
    if (!checked) return;
    dispatch({ type: 'SET_PRIVACY_CONSENT', agreed: true });
  }

  return (
    <div className="privacy-consent-section">
      <div className="card">
        <div className="card-head">
          <h2>개인정보 수집·이용 동의</h2>
        </div>
        <div className="card-body">
          <p style={{ marginBottom: '16px', color: '#555', lineHeight: 1.7 }}>
            특허 출원에 필요한 출원인 정보를 수집합니다. 아래 내용을 확인하시고 동의해 주세요.
          </p>

          <div className="info-box blue">
            <strong>수집 목적</strong>
            <p>특허/상표/디자인 출원 절차 수행 및 고객 연락</p>
          </div>

          <div className="info-box orange" style={{ marginTop: '12px' }}>
            <strong>수집 항목</strong>
            <p>성명, 주민등록번호(또는 법인등록번호), 주소, 연락처, 이메일, 서명, 사업자등록번호, 여권번호(외국인)</p>
          </div>

          <div className="info-box green" style={{ marginTop: '12px' }}>
            <strong>보관 기간 및 제3자 제공</strong>
            <p>출원 완료 후 3년간 보관 후 파기합니다. 특허청 출원 절차 목적으로 제3자(특허청)에 제공됩니다.</p>
          </div>

          <div className="info-box" style={{ marginTop: '12px', background: '#f5f5f5' }}>
            <strong>정보주체의 권리</strong>
            <p>동의 거부 시 출원 정보 접수가 불가합니다. 동의 후에도 언제든 철회할 수 있으며, 이 경우 수집된 정보는 지체없이 파기됩니다.</p>
          </div>

          <div style={{ margin: '24px 0', padding: '16px', border: '2px solid #1a5fb4', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                style={{ marginTop: '3px', width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '15px', lineHeight: 1.6 }}>
                위 개인정보 수집·이용에 <strong>동의합니다</strong>.
                {' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowModal(true); }}
                  style={{
                    background: 'none', border: 'none', color: '#1a5fb4',
                    textDecoration: 'underline', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  [개인정보처리방침 전문 보기]
                </button>
              </span>
            </label>
          </div>

          <button
            className={`btn btn-primary btn-full ${!checked ? 'disabled' : ''}`}
            onClick={handleConsent}
            disabled={!checked}
            style={{ fontSize: '16px', padding: '14px' }}
          >
            동의 후 계속 진행하기
          </button>
        </div>
      </div>

      {/* 개인정보처리방침 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>개인정보처리방침</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto', lineHeight: 1.8, fontSize: '14px' }}>
              <h4>제1조 (개인정보의 수집 및 이용 목적)</h4>
              <p>당 법인은 특허/상표/디자인 출원 절차 수행을 위해 고객의 개인정보를 수집·이용합니다.</p>

              <h4>제2조 (수집하는 개인정보 항목)</h4>
              <p>필수: 성명, 주민등록번호(또는 외국인등록번호), 주소, 연락처, 이메일</p>
              <p>선택: 법인등록번호, 사업자등록번호, 여권번호, 대표이사 성명</p>

              <h4>제3조 (개인정보의 보유 및 이용기간)</h4>
              <p>수집된 개인정보는 출원 완료일로부터 3년간 보유 후 지체없이 파기합니다.</p>

              <h4>제4조 (개인정보의 제3자 제공)</h4>
              <p>수집된 정보는 특허청 출원 절차 목적으로만 제공되며, 그 외 제3자에게 제공되지 않습니다.</p>

              <h4>제5조 (정보주체의 권리)</h4>
              <p>정보주체는 언제든 동의 철회, 열람, 정정, 삭제를 요청할 수 있습니다.</p>

              <h4>제6조 (개인정보의 파기)</h4>
              <p>보유 기간 경과 시 전자적 파일은 복구 불가능한 방법으로, 서면은 분쇄 또는 소각하여 파기합니다.</p>

              <h4>제7조 (개인정보보호 책임자)</h4>
              <p>개인정보보호 관련 문의는 관리팀에 연락해 주시기 바랍니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
