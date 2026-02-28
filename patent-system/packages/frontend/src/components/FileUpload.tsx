import { useRef, useState, useMemo } from 'react';
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
  /** 커스텀 업로드 함수 (미제공 시 기본 uploadFile 사용) */
  onUpload?: (file: File) => Promise<{ success: boolean; data: UploadedDocument }>;
}

export default function FileUpload({
  label,
  fileType,
  applicantIndex,
  documents,
  onFileUploaded,
  accept = '.jpg,.jpeg,.png,.pdf',
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isMobile = useMemo(
    () => window.innerWidth <= 520 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    [],
  );

  async function processFile(file: File) {
    const maxSize = 10 * 1024 * 1024;
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
      const result = onUpload
        ? await onUpload(file)
        : await uploadFile(file, applicantIndex, fileType);
      if (result.success) {
        onFileUploaded(result.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  return (
    <div className="file-upload-section">
      <label className="field-label">{label}</label>

      <div
        className={`file-upload-area ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={isMobile ? `${accept};capture=camera` : accept}
          capture={isMobile ? 'environment' : undefined}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        {uploading ? (
          <p>업로드 중...</p>
        ) : dragOver ? (
          <p style={{ color: '#1a5fb4', fontWeight: 600 }}>여기에 파일을 놓으세요</p>
        ) : isMobile ? (
          <p>탭하여 파일 선택 또는 카메라 촬영<br /><small style={{ color: '#999' }}>JPG, PNG, PDF / 최대 10MB</small></p>
        ) : (
          <p>파일을 드래그하거나 클릭하여 선택 (JPG, PNG, PDF / 최대 10MB)</p>
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
