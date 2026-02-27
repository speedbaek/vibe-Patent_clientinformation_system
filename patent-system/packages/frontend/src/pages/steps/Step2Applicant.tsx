import { useFormContext } from '../../context/FormContext.js';
import PersonCard from '../../components/PersonCard.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step2Applicant({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-head">
          <h2>출원인 정보</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => dispatch({ type: 'ADD_APPLICANT' })}
          >
            + 출원인 추가
          </button>
        </div>
        <div className="card-body">
          <div className="info-box blue" style={{ marginBottom: '16px' }}>
            출원인이 여러 명인 경우 "출원인 추가" 버튼으로 추가할 수 있습니다.
            출원인 유형에 따라 입력 항목이 달라집니다.
          </div>

          {state.applicants.map((applicant, idx) => (
            <PersonCard
              key={applicant.id}
              applicant={applicant}
              index={idx}
              canRemove={state.applicants.length > 1}
              onUpdate={(data) =>
                dispatch({ type: 'UPDATE_APPLICANT', id: applicant.id, data })
              }
              onRemove={() =>
                dispatch({ type: 'REMOVE_APPLICANT', id: applicant.id })
              }
              getFieldError={getFieldError}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
