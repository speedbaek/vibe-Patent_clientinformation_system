/**
 * 전화번호 자동 하이픈 (010-1234-5678)
 */
export function formatPhone(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
}

/**
 * 주민등록번호 자동 하이픈 (123456-1234567)
 */
export function formatRRN(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 6) return nums;
  return `${nums.slice(0, 6)}-${nums.slice(6, 13)}`;
}

/**
 * 사업자등록번호 자동 하이픈 (123-45-67890)
 */
export function formatBizNum(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 5) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5, 10)}`;
}

/**
 * 법인등록번호 자동 하이픈 (123456-1234567)
 */
export function formatCorpRegNum(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 6) return nums;
  return `${nums.slice(0, 6)}-${nums.slice(6, 13)}`;
}

/**
 * 파일 크기 포맷 (KB/MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
