import { useFormContext } from '../../context/FormContext.js';
import FormField from '../../components/FormField.js';
import { formatPhone } from '../../utils/formatters.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step3Inventor({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-head">
          <h2>발명자 정보</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => dispatch({ type: 'COPY_APPLICANTS_TO_INVENTORS' })}
            >
              출원인에서 복사
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => dispatch({ type: 'ADD_INVENTOR' })}
            >
              + 발명자 추가
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="info-box blue" style={{ marginBottom: '16px' }}>
            발명자는 자연인(개인)만 가능합니다. 출원인이 개인인 경우 "출원인에서 복사" 버튼으로 간편하게 입력할 수 있습니다.
          </div>

          {state.inventors.map((inventor, idx) => (
            <div key={inventor.id} className="person-card" style={{ marginBottom: '12px' }}>
              <div className="person-card-header">
                <div className="person-card-title">
                  <span className="person-num">{idx + 1}</span>
                  <span className="person-name">{inventor.nameKr || `발명자 ${idx + 1}`}</span>
                </div>
                {state.inventors.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => dispatch({ type: 'REMOVE_INVENTOR', id: inventor.id })}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="person-card-body">
                <div className="field-row col3">
                  <FormField
                    label="성명"
                    required
                    value={inventor.nameKr}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { nameKr: e.target.value },
                    })}
                    placeholder="발명자 성명"
                    error={getFieldError?.(`inventors.${idx}.nameKr`)}
                  />
                  <FormField
                    label="전화번호"
                    type="tel"
                    value={inventor.phone}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { phone: formatPhone(e.target.value) },
                    })}
                    placeholder="010-1234-5678"
                    maxLength={13}
                  />
                  <FormField
                    label="이메일"
                    type="email"
                    value={inventor.email}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { email: e.target.value },
                    })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
