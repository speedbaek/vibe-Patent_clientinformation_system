import { useFormContext } from '../../context/FormContext.js';
import FileUpload from '../../components/FileUpload.js';
import SignaturePad from '../../components/SignaturePad.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step4Documents({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();

  return (
    <div className="step-content">
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
              <h2>{displayName} — 서류 및 서명</h2>
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

              {/* 법인: 사업자등록증 + 법인인감 + 법인인감증명서 */}
              {isCorp && (
                <>
                  <FileUpload
                    label="사업자등록증 사본 (필수)"
                    fileType="biz_reg"
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

                  <div style={{ marginTop: '16px' }}>
                    <FileUpload
                      label="법인인감 날인 스캔 (필수)"
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
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <FileUpload
                      label="법인인감증명서 (선택)"
                      fileType="corp_seal_cert"
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
