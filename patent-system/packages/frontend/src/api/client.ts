import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰을 요청에 자동 추가
let currentToken = '';

export function setToken(token: string) {
  currentToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
    // 쿼리 파라미터에도 추가 (GET 요청용)
    if (config.method === 'get') {
      config.params = { ...config.params, token: currentToken };
    }
  }
  return config;
});

// ── API 함수 ──

export async function verifyToken(token: string) {
  const { data } = await apiClient.get('/customer/verify-token', {
    params: { token },
  });
  return data;
}

export async function saveDraft(formData: Record<string, unknown>, currentStep: number) {
  const { data } = await apiClient.post('/customer/save-draft', {
    token: currentToken,
    formData,
    currentStep,
  });
  return data;
}

export async function uploadFile(
  file: File,
  applicantIndex: number,
  fileType: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('applicantIndex', applicantIndex.toString());
  formData.append('fileType', fileType);
  formData.append('token', currentToken);

  const { data } = await apiClient.post('/customer/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadSignature(blob: Blob, applicantIndex: number) {
  const formData = new FormData();
  formData.append('signature', blob, 'signature.png');
  formData.append('applicantIndex', applicantIndex.toString());
  formData.append('token', currentToken);

  const { data } = await apiClient.post('/customer/upload-signature', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitForm(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/customer/submit', {
    token: currentToken,
    ...payload,
  });
  return data;
}

export default apiClient;
