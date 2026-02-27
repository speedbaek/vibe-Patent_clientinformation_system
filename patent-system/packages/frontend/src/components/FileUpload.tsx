import { useRef, useState } from 'react';
import { UploadedDocument } from '../types/index.js';
import { formatFileSize } from '../utils/formatters.js';
import { uploadFile } from '../api/client.js';

interface FileUploadProps {
  label: string;
  fileType: string;
  applicantIndex: number;
  documents: UploadedDocument[];
  onFileUploaded: (doc: UploadedDocument) => void;
  accept?: string;
}

export default function FileUpload({
  label,
  fileType,
  applicantIndex,
  documents,
  onFileUploaded,
  accept = '.jpg,.jpeg,.png,.pdf',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 클라이언트 사이드 검증
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('파일 크기가 10MB를 초과합니다.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext || '')) {
      setError('허용되지 않는 파일 형식입니다. (JPG, PNG, PDF만 가능)');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const result = await uploadFile(file, applicantIndex, fileType);
      if (result.success) {
        onFileUploaded(result.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="file-upload-section">
      <label className="field-label">{label}</label>

      <div
        className="file-upload-area"
        onClick={() => inputRef.current?.click()}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        {uploading ? (
          <p>업로드 중...</p>
        ) : (
          <p>클릭하여 파일 선택 (JPG, PNG, PDF / 최대 10MB)</p>
        )}
      </div>

      {error && <div className="field-error">{error}</div>}

      {/* 업로드된 파일 목록 */}
      {documents
        .filter((d) => d.fileType === fileType)
        .map((doc, idx) => (
          <div key={idx} className="file-item">
            <span className="file-icon">📄</span>
            <span className="file-name">{doc.originalName}</span>
            <span className="file-size">{formatFileSize(doc.fileSize)}</span>
          </div>
        ))}
    </div>
  );
}
