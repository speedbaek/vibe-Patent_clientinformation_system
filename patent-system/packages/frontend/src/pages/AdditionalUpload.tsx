import { useState, useCallback } from 'react';
import { verifySubmission, uploadAdditionalFile } from '../api/client.js';
import { UploadedDocument, APPLICATION_TYPE_LABELS, ApplicationType } from '../types/index.js';
import FileUpload from '../components/FileUpload.js';
import SignaturePad from '../components/SignaturePad.js';
import { formatFileSize } from '../utils/formatters.js';

interface VerifiedData {
  submissionId: number;
  caseNumber: string;
  applicationType: string;
  caseTitle: string;
  status: string;
  existingFiles: { id: number; original_name: string; file_type: string; file_size: number }[];
}

const FILE_TYPE_OPTIONS = [
  { value: 'id_doc', label: '신분증 사본' },
  { value: 'biz_reg', label: '사업자등록증 사본' },
  { value: 'corp_seal', label: '법인인감 날인 스캔' },
  { value: 'corp_seal_cert', label: '법인인감증명서' },
  { value: 'signature', label: '서명 이미지' },
  { value: 'other', label: '기타' },
];

const FILE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FILE_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
);

/** dataURL → Blob 변환 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export default function AdditionalUpload() {
  // Phase 1: Verification
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Phase 2: Upload
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [selectedFileType, setSelectedFileType] = useState('other');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);

  // 서명 패드
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureUploaded, setSignatureUploaded] = useState(false);
  const [signatureError, setSignatureError] = useState('');

  // Phase 3: 최종 제출 완료
  const [submitted, setSubmitted] = useState(false);

  async function handleVerify() {
    if (!contactPhone.trim() && !contactEmail.trim()) {
      setVerifyError('담당자 연락처 또는 이메일을 입력해 주세요.');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    try {
      const result = await verifySubmission(
        contactPhone.trim(),
        contactEmail.trim(),
      );
      if (result.success) {
        setVerified(result.data);
      }
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error || '인증에 실패했습니다.');
    } finally {
      setVerifying(false);
    }
  }

  /** 서명 이미지를 파일로 변환 후 업로드 */
  const handleSignatureUpload = useCallback(async () => {
    if (!signatureDataUrl || !verified) return;

    setSignatureUploading(true);
    setSignatureError('');

    try {
      const blob = dataUrlToBlob(signatureDataUrl);
      const file = new File([blob], '서명.png', { type: 'image/png' });
      const result = await uploadAdditionalFile(
        file,
        verified.submissionId,
        0,
        'signature',
      );
      if (result.success) {
        setUploadedFiles((prev) => [...prev, result.data]);
        setSignatureUploaded(true);
      }
    } catch (err: any) {
      setSignatureError(err?.response?.data?.error || '서명 업로드에 실패했습니다.');
    } finally {
      setSignatureUploading(false);
    }
  }, [signatureDataUrl, verified]);

  // Phase 1: 인증 화면
  if (!verified) {
    return (
      <div className="form-container" style={{ maxWidth: '500px' }}>
        <header className="form-header">
          <h1>첨부서류 추가제출</h1>
          <p>기존 접수건에 서류를 추가로 제출합니다</p>
        </header>

        <div className="card">
          <div className="card-head">
            <h2>접수 확인</h2>
          </div>
          <div className="card-body">
            <div className="info-box blue" style={{ marginBottom: '16px' }}>
              접수 시 입력한 담당자 연락처 또는 이메일 중<br />
              하나만 입력하면 접수 내역을 조회할 수 있습니다.
            </div>

            <div className="field-group">
              <label className="field-label">담당자 연락처</label>
              <input
                className="field-input"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="010-1234-5678"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>

            <div className="field-group" style={{ marginTop: '12px' }}>
              <label className="field-label">또는 이메일</label>
              <input
                className="field-input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="접수 시 입력한 이메일"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>

            {verifyError && (
              <div className="field-error" style={{ marginTop: '12px' }}>{verifyError}</div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleVerify}
              disabled={verifying}
              style={{ marginTop: '20px' }}
            >
              {verifying ? '확인 중...' : '접수 확인'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="/" style={{ color: 'var(--blue)', fontSize: '14px' }}>
                ← 새로운 출원 정보 입력하기
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase 3: 제출 완료 화면
  if (submitted) {
    const typeLabel = APPLICATION_TYPE_LABELS[verified.applicationType as ApplicationType] || verified.applicationType;
    return (
      <div className="form-container" style={{ maxWidth: '600px' }}>
        <header className="form-header">
          <h1>추가 제출 완료</h1>
          <p>서류가 정상적으로 제출되었습니다</p>
        </header>

        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#2e7d32' }}>제출이 완료되었습니다</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              {uploadedFiles.length}개 파일이 접수번호 <strong style={{ color: '#1a5fb4' }}>{verified.caseNumber}</strong>에 추가되었습니다.
            </p>

            <div className="receipt-box" style={{ maxWidth: '360px', margin: '0 auto 20px', textAlign: 'left' }}>
              <div className="receipt-row">
                <span className="receipt-label">접수번호</span>
                <span className="receipt-value" style={{ color: '#1a5fb4', fontWeight: 700 }}>{verified.caseNumber}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">출원유형</span>
                <span className="receipt-value">{typeLabel}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">추가 파일</span>
                <span className="receipt-value">{uploadedFiles.length}개</span>
              </div>
              {uploadedFiles.map((f, idx) => (
                <div key={idx} className="receipt-row">
                  <span className="receipt-label" style={{ fontSize: '11px' }}>{FILE_TYPE_LABELS[f.fileType] || f.fileType}</span>
                  <span className="receipt-value" style={{ fontSize: '13px' }}>{f.originalName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
          <a href="/" style={{ color: 'var(--blue)', fontSize: '14px' }}>
            ← 새로운 출원 정보 입력하기
          </a>
        </div>
      </div>
    );
  }

  // Phase 2: 파일 업로드 화면
  const typeLabel = APPLICATION_TYPE_LABELS[verified.applicationType as ApplicationType] || verified.applicationType;
  const isSignatureType = selectedFileType === 'signature';

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <header className="form-header">
        <h1>첨부서류 추가제출</h1>
        <p>기존 접수건에 서류를 추가로 제출합니다</p>
      </header>

      {/* 접수 정보 요약 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-head">
          <h2>접수 정보</h2>
        </div>
        <div className="card-body">
          <div className="receipt-box" style={{ maxWidth: '100%' }}>
            <div className="receipt-row">
              <span className="receipt-label">접수번호</span>
              <span className="receipt-value" style={{ fontWeight: 700, color: '#1a5fb4' }}>{verified.caseNumber}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">출원유형</span>
              <span className="receipt-value">{typeLabel}</span>
            </div>
            {verified.caseTitle && (
              <div className="receipt-row">
                <span className="receipt-label">사건명</span>
                <span className="receipt-value">{verified.caseTitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 기존 첨부파일 */}
      {verified.existingFiles.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-head">
            <h2>기존 첨부파일 ({verified.existingFiles.length}개)</h2>
          </div>
          <div className="card-body">
            {verified.existingFiles.map((f) => (
              <div key={f.id} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{f.original_name}</span>
                <span style={{ color: '#666', fontSize: '12px', marginRight: '8px' }}>
                  {FILE_TYPE_LABELS[f.file_type] || f.file_type}
                </span>
                <span className="file-size">{formatFileSize(f.file_size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 업로드 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-head">
          <h2>서류 추가 업로드</h2>
        </div>
        <div className="card-body">
          <div className="field-group" style={{ marginBottom: '16px' }}>
            <label className="field-label">서류 종류</label>
            <select
              className="field-input"
              value={selectedFileType}
              onChange={(e) => {
                setSelectedFileType(e.target.value);
                setSignatureDataUrl('');
                setSignatureUploaded(false);
                setSignatureError('');
              }}
            >
              {FILE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 서명 이미지: 서명 패드 표시 */}
          {isSignatureType ? (
            <div>
              <label className="field-label">서명</label>
              {signatureUploaded ? (
                <div className="info-box green" style={{ marginTop: '8px' }}>
                  ✅ 서명이 업로드되었습니다.
                </div>
              ) : (
                <>
                  <SignaturePad
                    applicantIndex={0}
                    initialData={signatureDataUrl}
                    onSignatureChange={(dataUrl) => {
                      setSignatureDataUrl(dataUrl);
                      setSignatureError('');
                    }}
                  />
                  {signatureError && <div className="field-error">{signatureError}</div>}
                  {signatureDataUrl && (
                    <button
                      className="btn btn-primary"
                      onClick={handleSignatureUpload}
                      disabled={signatureUploading}
                      style={{ marginTop: '12px' }}
                    >
                      {signatureUploading ? '업로드 중...' : '서명 업로드'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <FileUpload
              label={FILE_TYPE_LABELS[selectedFileType] || '파일'}
              fileType={selectedFileType}
              applicantIndex={0}
              documents={uploadedFiles}
              onFileUploaded={(doc) => setUploadedFiles((prev) => [...prev, doc])}
              onUpload={async (file) => {
                return await uploadAdditionalFile(
                  file,
                  verified.submissionId,
                  0,
                  selectedFileType,
                );
              }}
            />
          )}
        </div>
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-head">
            <h2>업로드된 파일 ({uploadedFiles.length}개)</h2>
          </div>
          <div className="card-body">
            {uploadedFiles.map((doc, idx) => (
              <div key={idx} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{doc.originalName}</span>
                <span style={{ color: '#666', fontSize: '12px', marginRight: '8px' }}>
                  {FILE_TYPE_LABELS[doc.fileType] || doc.fileType}
                </span>
                <span className="file-size">{formatFileSize(doc.fileSize)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최종 제출 버튼 */}
      {uploadedFiles.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '14px 48px', fontSize: '16px' }}
            onClick={() => {
              setSubmitted(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            최종 제출
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '20px' }}>
        <a href="/" style={{ color: 'var(--blue)', fontSize: '14px' }}>
          ← 새로운 출원 정보 입력하기
        </a>
      </div>
    </div>
  );
}
