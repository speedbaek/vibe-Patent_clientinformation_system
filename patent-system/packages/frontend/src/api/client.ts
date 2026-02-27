import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── 세션 ID (파일 업로드 → 제출 연결용) ──
let sessionId = '';

export function getSessionId(): string {
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionId;
}

// ── API 함수 ──

export async function uploadFile(
  file: File,
  applicantIndex: number,
  fileType: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', getSessionId());
  formData.append('applicantIndex', applicantIndex.toString());
  formData.append('fileType', fileType);

  const { data } = await apiClient.post('/customer/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadSignature(blob: Blob, applicantIndex: number) {
  const formData = new FormData();
  formData.append('signature', blob, 'signature.png');
  formData.append('sessionId', getSessionId());
  formData.append('applicantIndex', applicantIndex.toString());

  const { data } = await apiClient.post('/customer/upload-signature', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitForm(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/customer/submit', {
    sessionId: getSessionId(),
    ...payload,
  });
  return data;
}

// ── 추가제출 API ──

export async function verifySubmission(
  caseNumber: string,
  contactName: string,
  contactEmail: string,
) {
  const { data } = await apiClient.post('/additional/verify', {
    caseNumber,
    contactName,
    contactEmail,
  });
  return data;
}

export async function uploadAdditionalFile(
  file: File,
  submissionId: number,
  applicantIndex: number,
  fileType: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('submissionId', submissionId.toString());
  formData.append('applicantIndex', applicantIndex.toString());
  formData.append('fileType', fileType);

  const { data } = await apiClient.post('/additional/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export default apiClient;
