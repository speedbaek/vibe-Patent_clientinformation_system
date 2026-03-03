import { useFormContext } from '../../context/FormContext.js';
import {
  ApplicationType,
  APPLICATION_TYPE_LABELS,
} from '../../types/index.js';
import FormField from '../../components/FormField.js';
import { formatPhone } from '../../utils/formatters.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step1TypeSelect({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();

  const appTypes: { type: ApplicationType; desc: string }[] = [
    { type: 'patent', desc: '발명/고안에 대한 특허·실용신안 출원' },
    { type: 'trademark', desc: '상표 등록 출원' },
    { type: 'design', desc: '디자인 등록 출원' },
    { type: 'foreign_patent', desc: 'PCT, 해외진입 등' },
    { type: 'foreign_design', desc: '마드리드, 헤이그, 해외진입 등' },
  ];

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-head">
          <h2>출원 유형 선택</h2>
        </div>
        <div className="card-body">
          <div className={`type-grid type-grid-3 ${getFieldError?.('applicationType') ? 'type-grid-error' : ''}`}>
            {appTypes.map(({ type, desc }) => (
              <div
                key={type}
                className={`type-item ${state.applicationType === type ? 'selected' : ''}`}
                onClick={() => dispatch({ type: 'SET_APPLICATION_TYPE', applicationType: type })}
              >
                <strong>{APPLICATION_TYPE_LABELS[type]}</strong>
                <small>{desc}</small>
              </div>
            ))}
          </div>
          {getFieldError?.('applicationType') && (
            <p className="field-error" style={{ marginTop: '8px' }}>{getFieldError('applicationType')}</p>
          )}
        </div>
      </div>

      {/* 담당자 */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-head">
          <h2>담당자 연락처</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => dispatch({ type: 'ADD_CONTACT' })}
          >
            + 담당자 추가
          </button>
        </div>
        <div className="card-body">
          <p className="info-text" style={{ marginBottom: '16px', color: '#666' }}>
            출원 진행 관련 안내와 서류를 수신하는 담당자 정보를 입력해 주세요.
          </p>

          {state.contactPersons.map((contact, idx) => (
            <div
              key={contact.id}
              style={{
                padding: '16px',
                background: idx % 2 === 0 ? '#fafbfc' : '#fff',
                borderRadius: '8px',
                marginBottom: '12px',
                border: '1px solid #e8e8e8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center',
                    background: '#1a5fb4', color: '#fff', borderRadius: '50%', fontSize: '11px', fontWeight: 600,
                  }}>{idx + 1}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {contact.name || `담당자 ${idx + 1}`}
                  </span>
                </div>
                {state.contactPersons.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => dispatch({ type: 'REMOVE_CONTACT', id: contact.id })}
                    title="삭제"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="field-row col3">
                <FormField
                  label="성함"
                  required
                  value={contact.name}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_CONTACT',
                    id: contact.id,
                    data: { name: e.target.value },
                  })}
                  placeholder="성함을 입력하세요"
                  error={getFieldError?.(`contactPersons.${idx}.name`)}
                />
                <FormField
                  label="연락처"
                  required
                  type="tel"
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_CONTACT',
                    id: contact.id,
                    data: { phone: formatPhone(e.target.value) },
                  })}
                  placeholder="010-1234-5678"
                  maxLength={13}
                  autoComplete="tel"
                  error={getFieldError?.(`contactPersons.${idx}.phone`)}
                />
                <FormField
                  label="이메일"
                  required
                  type="email"
                  inputMode="email"
                  value={contact.email}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_CONTACT',
                    id: contact.id,
                    data: { email: e.target.value },
                  })}
                  placeholder="email@example.com"
                  autoComplete="email"
                  error={getFieldError?.(`contactPersons.${idx}.email`)}
                />
              </div>

              {/* 세금계산서 이메일 */}
              <div style={{ marginTop: '4px' }}>
                <label className="field-label">세금계산서 이메일</label>
                {contact.email && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555', marginBottom: '6px', minHeight: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={!!contact.email && contact.taxEmail === contact.email}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_CONTACT',
                        id: contact.id,
                        data: { taxEmail: e.target.checked ? contact.email : '' },
                      })}
                      style={{ width: '16px', height: '16px', minWidth: '16px' }}
                    />
                    담당자 이메일과 동일
                  </label>
                )}
                <input
                  className="field-input"
                  type="email"
                  inputMode="email"
                  value={contact.taxEmail}
                  onChange={(e) => dispatch({
                    type: 'UPDATE_CONTACT',
                    id: contact.id,
                    data: { taxEmail: e.target.value },
                  })}
                  placeholder="tax@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 사건명 */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-head">
          <h2>사건 정보</h2>
        </div>
        <div className="card-body">
          <FormField
            label="사건명 / 발명(상표,제품) 명칭"
            value={state.caseTitle}
            onChange={(e) => dispatch({ type: 'SET_CASE_TITLE', caseTitle: e.target.value })}
            placeholder="선택사항"
          />
        </div>
      </div>
    </div>
  );
}
