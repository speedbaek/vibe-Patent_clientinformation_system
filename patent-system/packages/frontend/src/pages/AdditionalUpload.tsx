import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifySubmission, uploadAdditionalFile } from '../api/client.js';
import { UploadedDocument, APPLICATION_TYPE_LABELS, ApplicationType } from '../types/index.js';
import FileUpload from '../components/FileUpload.js';
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

export default function AdditionalUpload() {
  const [searchParams] = useSearchParams();

  // Phase 1: Verification
  const [caseNumber, setCaseNumber] = useState(searchParams.get('case') || '');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Phase 2: Upload
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [selectedFileType, setSelectedFileType] = useState('other');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);

  // URL에 case 파라미터가 있으면 자동 포커스
  useEffect(() => {
    if (searchParams.get('case')) {
      document.getElementById('contact-name-input')?.focus();
    }
  }, []);

  async function handleVerify() {
    if (!contactName.trim() && !contactEmail.trim()) {
      setVerifyError('담당자 성함 또는 이메일을 입력해 주세요.');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    try {
      const result = await verifySubmission(
        caseNumber.trim(),
        contactName.trim(),
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
              담당자 성함 또는 이메일을 입력하면 접수 내역을 조회합니다.<br />
              접수번호를 알고 계시면 함께 입력해 주세요.
            </div>

            <div className="field-group">
              <label className="field-label">담당자 성함 <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                id="contact-name-input"
                className="field-input"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="접수 시 입력한 성함"
              />
            </div>

            <div className="field-group" style={{ marginTop: '12px' }}>
              <label className="field-label">또는 이메일 <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                className="field-input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="접수 시 입력한 이메일"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>

            <div className="field-group" style={{ marginTop: '12px' }}>
              <label className="field-label">접수번호 <span style={{ color: '#999', fontSize: '12px' }}>(선택)</span></label>
              <input
                className="field-input"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="RCP-20260228-0001"
                style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
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

  // Phase 2: 파일 업로드 화면
  const typeLabel = APPLICATION_TYPE_LABELS[verified.applicationType as ApplicationType] || verified.applicationType;

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
              onChange={(e) => setSelectedFileType(e.target.value)}
            >
              {FILE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

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
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="info-box green" style={{ marginBottom: '20px' }}>
          <strong>업로드 완료</strong>
          <p>{uploadedFiles.length}개 파일이 추가 제출되었습니다.</p>
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
