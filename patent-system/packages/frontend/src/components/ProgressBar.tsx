import { useFormContext } from '../context/FormContext.js';
import { NEED_INVENTOR } from '../types/index.js';

const STEPS = [
  { num: 1, label: '출원유형' },
  { num: 2, label: '출원인 정보' },
  { num: 3, label: '발명자 정보' },
  { num: 4, label: '파일 첨부' },
  { num: 5, label: '접수완료' },
];

export default function ProgressBar() {
  const { state, dispatch } = useFormContext();
  const { currentStep, applicationType } = state;
  const needInventor = NEED_INVENTOR.includes(applicationType);

  const visibleSteps = needInventor
    ? STEPS
    : STEPS.filter((s) => s.num !== 3);

  function handleStepClick(step: number) {
    // 이전 단계로만 이동 가능
    if (step < currentStep) {
      dispatch({ type: 'SET_STEP', step });
    }
  }

  return (
    <div className="progress-wrap">
      <div className="progress-bar">
        {visibleSteps.map((step, idx) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          const isClickable = step.num < currentStep;

          return (
            <div key={step.num} className="step-item">
              {idx > 0 && (
                <div className={`step-line ${isDone ? 'done' : ''}`} />
              )}
              <div
                className={`step-circle ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && handleStepClick(step.num)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                {isDone ? '✓' : step.num}
              </div>
              <div className={`step-label ${isActive ? 'active' : ''}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
