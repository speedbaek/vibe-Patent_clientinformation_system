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
    { type: 'pct', desc: 'PCT 국제 특허 출원' },
  ];

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-head">
          <h2>출원 유형 선택</h2>
        </div>
        <div className="card-body">
          <div className="type-grid type-grid-3">
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
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-head">
          <h2>담당자 연락처</h2>
        </div>
        <div className="card-body">
          <p className="info-text" style={{ marginBottom: '16px', color: '#666' }}>
            출원 진행 관련 연락 가능한 담당자 정보를 입력해 주세요.
          </p>
          <div className="field-row col2">
            <FormField
              label="담당자 성함"
              required
              value={state.contactPerson.name}
              onChange={(e) => dispatch({
                type: 'SET_CONTACT',
                contactPerson: { ...state.contactPerson, name: e.target.value },
              })}
              placeholder="성함을 입력하세요"
              error={getFieldError?.('contactPerson.name')}
            />
            <FormField
              label="연락처"
              required
              type="tel"
              value={state.contactPerson.phone}
              onChange={(e) => dispatch({
                type: 'SET_CONTACT',
                contactPerson: { ...state.contactPerson, phone: formatPhone(e.target.value) },
              })}
              placeholder="010-1234-5678"
              maxLength={13}
              error={getFieldError?.('contactPerson.phone')}
            />
          </div>
          <div className="field-row col2">
            <FormField
              label="이메일"
              required
              type="email"
              value={state.contactPerson.email}
              onChange={(e) => dispatch({
                type: 'SET_CONTACT',
                contactPerson: { ...state.contactPerson, email: e.target.value },
              })}
              placeholder="email@example.com"
              error={getFieldError?.('contactPerson.email')}
            />
            <FormField
              label="사건명 / 발명 명칭"
              value={state.caseTitle}
              onChange={(e) => dispatch({ type: 'SET_CASE_TITLE', caseTitle: e.target.value })}
              placeholder="선택사항"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
