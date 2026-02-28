import { useState, useRef } from 'react';
import { useFormContext } from '../../context/FormContext.js';
import FileUpload from '../../components/FileUpload.js';
import SignaturePad from '../../components/SignaturePad.js';
import { formatFileSize } from '../../utils/formatters.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step4Documents({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();
  const slotCounter = useRef(1);
  const [extraSlots, setExtraSlots] = useState<number[]>([0]);

  function handleExtraUploaded(slotId: number, doc: import('../../types/index.js').UploadedDocument) {
    dispatch({ type: 'ADD_EXTRA_DOCUMENT', doc });
    // 사용된 슬롯 제거 후 새 빈 슬롯 자동 추가
    setExtraSlots((prev) => {
      const remaining = prev.filter((id) => id !== slotId);
      if (remaining.length === 0) {
        return [slotCounter.current++];
      }
      return remaining;
    });
  }

  function addExtraSlot() {
    setExtraSlots((prev) => [...prev, slotCounter.current++]);
  }

  const hasCorp = state.applicants.some(
    (a) => a.personType === 'domestic_corp' || a.personType === 'foreign_corp'
      || a.personType === 'govt' || a.personType === 'association'
  );
  const hasIndividual = state.applicants.some(
    (a) => a.personType === 'domestic_individual' || a.personType === 'foreign_individual'
  );

  return (
    <div className="step-content">
      <div className="info-box blue" style={{ marginBottom: '20px' }}>
        <strong>서류 안내</strong>
        {hasCorp && (
          <p>
            특허청 절차를 대리하기 위해서는 법인인감 도장의 스캔본이 필요합니다.<br />
            도장날인 스캔본을 준비하여 첨부 부탁 드립니다.
          </p>
        )}
        {hasIndividual && (
          <p>
            특허청 절차를 대리하기 위해서는 본인 서명이 필요합니다.<br />
            아래에서 서명을 작성해 주세요.
          </p>
        )}
        <p style={{ marginTop: '8px' }}>
          지금 준비가 어려우신 경우, 제출을 먼저 하시고<br />
          파일 첨부는 추후에 하시는 것도 가능합니다.
        </p>
      </div>

      {state.applicants.map((applicant, idx) => {
        const isIndividual =
          applicant.personType === 'domestic_individual' ||
          applicant.personType === 'foreign_individual';
        const isCorp =
          applicant.personType === 'domestic_corp' ||
          applicant.personType === 'foreign_corp' ||
          applicant.personType === 'govt' ||
          applicant.personType === 'association';

        const displayName = isIndividual
          ? applicant.nameKr || applicant.nameEn || `출원인 ${idx + 1}`
          : applicant.corpName || `출원인 ${idx + 1}`;

        return (
          <div className="card" key={applicant.id} style={{ marginBottom: '24px' }}>
            <div className="card-head">
              <h2>{displayName} — 파일 첨부</h2>
            </div>
            <div className="card-body">

              {/* 개인: 서명 + 신분증 */}
              {isIndividual && (
                <>
                  <h3 className="section-subtitle">서명</h3>
                  <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
                    마우스 또는 터치로 서명해 주세요.
                  </p>
                  <SignaturePad
                    applicantIndex={idx}
                    initialData={applicant.signatureDataUrl}
                    onSignatureChange={(dataUrl) =>
                      dispatch({
                        type: 'UPDATE_APPLICANT',
                        id: applicant.id,
                        data: { signatureDataUrl: dataUrl },
                      })
                    }
                  />
                  {getFieldError?.(`applicants.${idx}.signature`) && (
                    <p className="field-error" style={{ marginTop: '6px' }}>
                      {getFieldError(`applicants.${idx}.signature`)}
                    </p>
                  )}

                  <div style={{ marginTop: '20px' }}>
                    <FileUpload
                      label="신분증 사본 (선택)"
                      fileType="id_doc"
                      applicantIndex={idx}
                      documents={applicant.documents}
                      onFileUploaded={(doc) => {
                        dispatch({
                          type: 'UPDATE_APPLICANT',
                          id: applicant.id,
                          data: {
                            documents: [...applicant.documents, doc],
                          },
                        });
                      }}
                    />
                  </div>
                </>
              )}

              {/* 법인: 법인인감 날인 스캔 */}
              {isCorp && (
                <FileUpload
                  label="법인인감 날인 스캔 (권장)"
                  fileType="corp_seal"
                  applicantIndex={idx}
                  documents={applicant.documents}
                  onFileUploaded={(doc) => {
                    dispatch({
                      type: 'UPDATE_APPLICANT',
                      id: applicant.id,
                      data: {
                        documents: [...applicant.documents, doc],
                      },
                    });
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* 기타 파일 첨부 (공통) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-head">
          <h2>{hasIndividual && !hasCorp ? '사업자등록증 등 기타 파일 첨부 (선택)' : '기타 파일 첨부 (선택)'}</h2>
        </div>
        <div className="card-body">
          <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
            추가로 첨부할 서류가 있는 경우 아래에 업로드해 주세요.
          </p>

          {/* 업로드 완료된 기타 파일 목록 */}
          {state.extraDocuments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              {state.extraDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: '#f0f7ff',
                    borderRadius: '8px',
                    border: '1px solid #d0e0f0',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  <span>📄</span>
                  <span style={{ flex: 1 }}>{doc.originalName}</span>
                  <span style={{ color: '#888' }}>{formatFileSize(doc.fileSize)}</span>
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => dispatch({ type: 'REMOVE_EXTRA_DOCUMENT', index: idx })}
                    title="삭제"
                    style={{ fontSize: '13px', padding: '2px 6px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 업로드 슬롯 */}
          {extraSlots.map((slotId, idx) => (
            <div key={slotId} style={{ marginTop: idx > 0 ? '12px' : '0' }}>
              <FileUpload
                label={`파일 선택`}
                fileType={`extra_${slotId}`}
                applicantIndex={99}
                documents={[]}
                onFileUploaded={(doc) => handleExtraUploaded(slotId, doc)}
              />
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addExtraSlot}
            style={{ marginTop: '12px', fontSize: '14px' }}
          >
            + 파일 첨부란 추가
          </button>
        </div>
      </div>
    </div>
  );
}
