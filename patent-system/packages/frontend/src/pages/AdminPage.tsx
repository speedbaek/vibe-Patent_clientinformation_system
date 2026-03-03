import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client.js';
import { APPLICATION_TYPE_LABELS, PERSON_TYPE_LABELS, NATIONALITY_OPTIONS } from '../types/index.js';

interface ContactPerson {
  name: string;
  phone: string;
  email: string;
  taxEmail?: string;
}

interface Submission {
  id: number;
  case_number: string;
  application_type: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contacts: ContactPerson[];
  case_title: string;
  applicant_name: string;
  submitted_at: string;
  newsletter_consent: number;
}

interface SubmissionDetail extends Submission {
  applicants: any[];
  inventors: any[];
  files: any[];
}

interface Stats {
  total: number;
  submitted: number;
  reviewing: number;
  complete: number;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: '접수됨',
  reviewing: '검토중',
  complete: '완료',
};

const NATIONALITY_MAP: Record<string, string> = Object.fromEntries(
  NATIONALITY_OPTIONS.map(({ value, label }) => [value, label]),
);

// ── 유틸: 클립보드 복사 ──
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ── 복사 버튼 ──
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        marginLeft: '6px', padding: '1px 6px', fontSize: '11px', cursor: 'pointer',
        border: '1px solid #ccc', borderRadius: '4px', background: copied ? '#e8f5e9' : '#fff',
        color: copied ? '#2e7d32' : '#666',
      }}
    >
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

// ── 서명 다운로드 ──
function downloadSignature(dataUrl: string, name: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `서명_${name || '출원인'}.png`;
  link.click();
}

// ── 파일 다운로드 (fetch + blob — 토큰을 URL에 노출하지 않음) ──
async function downloadFile(fileId: number, fileName: string, token: string) {
  try {
    const resp = await fetch(`/api/admin/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error('다운로드 실패');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('파일 다운로드에 실패했습니다.');
  }
}

// ── 주소 포맷팅 ──
function formatAddress(addr: any): string {
  if (!addr) return '';
  const parts = [addr.zipcode ? `(${addr.zipcode})` : '', addr.roadAddr || '', addr.detailAddr || ''];
  return parts.filter(Boolean).join(' ').trim();
}

// ── 정보 행 컴포넌트 ──
function InfoRow({ label, value, sensitive }: { label: string; value: string; sensitive?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
      <span style={{ width: '120px', flexShrink: 0, color: '#888', fontWeight: 500 }}>{label}</span>
      <span style={{ flex: 1, wordBreak: 'break-all', color: sensitive ? '#c62828' : '#222' }}>
        {value}
        <CopyBtn text={value} />
      </span>
    </div>
  );
}

// ── 출원인 전체 복사 텍스트 생성 ──
function buildApplicantText(ap: any): string {
  const lines: string[] = [];
  const personLabel = PERSON_TYPE_LABELS[ap.personType as keyof typeof PERSON_TYPE_LABELS] || ap.personType;
  lines.push(`[출원인 유형] ${personLabel}`);

  if (ap.nameKr) lines.push(`[성명(한글)] ${ap.nameKr}`);
  if (ap.nameEn) lines.push(`[성명(영문)] ${ap.nameEn}`);
  if (ap.corpName) lines.push(`[법인명] ${ap.corpName}`);
  if (ap.ceoName) lines.push(`[대표자명] ${ap.ceoName}`);
  if (ap.rrn) lines.push(`[주민등록번호] ${ap.rrn}`);
  if (ap.corpRegNum) lines.push(`[법인등록번호] ${ap.corpRegNum}`);
  if (ap.bizNum) lines.push(`[사업자등록번호] ${ap.bizNum}`);
  if (ap.passport) lines.push(`[여권번호] ${ap.passport}`);
  if (ap.nationality) lines.push(`[국적] ${NATIONALITY_MAP[ap.nationality] || ap.nationality}`);
  if (ap.bizLicenseFileName) lines.push(`[사업자등록증] ${ap.bizLicenseFileName}`);

  const addr = formatAddress(ap.address);
  if (addr) lines.push(`[주소] ${addr}`);
  const mailAddr = formatAddress(ap.mailAddress);
  if (ap.useMailAddress && mailAddr) lines.push(`[우편물 수령 주소] ${mailAddr}`);

  return lines.join('\n');
}

// ── 발명자 전체 복사 텍스트 생성 ──
function buildInventorText(inv: any): string {
  const lines: string[] = [];
  if (inv.nameKr) lines.push(`[성명(한글)] ${inv.nameKr}`);
  if (inv.nameEn) lines.push(`[성명(영문)] ${inv.nameEn}`);
  if (inv.rrn) lines.push(`[주민등록번호] ${inv.rrn}`);
  if (inv.phone) lines.push(`[전화번호] ${inv.phone}`);
  if (inv.email) lines.push(`[이메일] ${inv.email}`);

  const addr = formatAddress(inv.address);
  if (addr) lines.push(`[주소] ${addr}`);
  const mailAddr = formatAddress(inv.mailAddress);
  if (inv.useMailAddress && mailAddr) lines.push(`[우편물 수령 주소] ${mailAddr}`);

  return lines.join('\n');
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authToken, setAuthToken] = useState('');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const fetchList = useCallback(async (p: number, filter?: string) => {
    try {
      const currentFilter = filter ?? statusFilter;
      const { data } = await apiClient.get('/admin/submissions', {
        headers,
        params: { page: p, limit: 20, ...(currentFilter !== 'all' ? { status: currentFilter } : {}) },
      });
      setSubmissions(data.data);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setAuthenticated(false);
        setAuthToken('');
      }
      setSubmissions([]);
    }
  }, [authToken, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/stats', { headers });
      setStats(data.data);
    } catch { /* ignore */ }
  }, [authToken]);

  async function handleLogin() {
    try {
      const { data } = await apiClient.post('/admin/login', { password });
      if (data.success) {
        setAuthToken(data.data.token);
        setAuthenticated(true);
        setAuthError('');
        setPassword(''); // 비밀번호를 메모리에서 제거
      }
    } catch {
      setAuthError('비밀번호가 올바르지 않습니다.');
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchList(page);
      fetchStats();
    }
  }, [authenticated, page]);

  const isPopState = useRef(false);

  async function viewDetail(id: number) {
    try {
      const { data } = await apiClient.get(`/admin/submissions/${id}`, { headers });
      setDetail(data.data);
      setSelectedId(id);
      // 브라우저 히스토리에 상세 상태 기록
      window.history.pushState({ adminView: 'detail', id }, '');
    } catch { /* ignore */ }
  }

  function goBackToList() {
    setDetail(null);
    setSelectedId(null);
  }

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const st = e.state;
      if (st?.adminView === 'detail') {
        // 앞으로가기로 상세 복원 → 다시 fetch
        if (st.id) viewDetail(st.id);
      } else {
        // 뒤로가기 → 목록으로
        isPopState.current = true;
        setDetail(null);
        setSelectedId(null);
      }
    }

    window.addEventListener('popstate', handlePopState);

    // 최초 마운트 시 목록 상태를 replaceState로 기록
    if (authenticated && !selectedId) {
      window.history.replaceState({ adminView: 'list' }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [authenticated, password]);

  async function updateStatus(id: number, newStatus: string) {
    try {
      await apiClient.patch(`/admin/submissions/${id}/status`, { status: newStatus }, { headers });
      if (detail) setDetail({ ...detail, status: newStatus });
      fetchList(page);
      fetchStats();
    } catch { /* ignore */ }
  }

  // ═══ 로그인 화면 ═══
  if (!authenticated) {
    return (
      <div className="form-container" style={{ maxWidth: '400px' }}>
        <header className="form-header">
          <h1>관리자 로그인</h1>
          <p>접수 데이터를 확인하려면 비밀번호를 입력하세요</p>
        </header>
        <div className="card">
          <div className="card-body">
            <div className="field-group">
              <label className="field-label">관리자 비밀번호</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호 입력"
              />
            </div>
            {authError && <div className="field-error" style={{ marginBottom: '12px' }}>{authError}</div>}
            <button className="btn btn-primary btn-full" onClick={handleLogin}>
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ 상세 보기 ═══
  if (detail && selectedId) {
    return (
      <div className="form-container" style={{ maxWidth: '1100px' }}>
        <header className="form-header">
          <h1>접수 상세 — {detail.case_number}</h1>
        </header>

        <button className="btn btn-secondary" onClick={() => { window.history.back(); }} style={{ marginBottom: '16px' }}>
          ← 목록으로
        </button>

        {/* 기본 정보 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head">
            <h2>기본 정보</h2>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>상태:</span>
              <select
                value={detail.status}
                onChange={(e) => updateStatus(selectedId, e.target.value)}
                style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="submitted">접수됨</option>
                <option value="reviewing">검토중</option>
                <option value="complete">완료</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="receipt-box" style={{ maxWidth: '100%' }}>
              <div className="receipt-row"><span className="receipt-label">접수번호</span><span className="receipt-value">{detail.case_number}<CopyBtn text={detail.case_number} /></span></div>
              <div className="receipt-row"><span className="receipt-label">출원유형</span><span className="receipt-value">{APPLICATION_TYPE_LABELS[detail.application_type as keyof typeof APPLICATION_TYPE_LABELS] || detail.application_type}</span></div>
              <div className="receipt-row"><span className="receipt-label">상태</span><span className="receipt-value" style={{ color: detail.status === 'complete' ? '#2e7d32' : detail.status === 'reviewing' ? '#1a5fb4' : '#e65100' }}>{STATUS_LABELS[detail.status] || detail.status}</span></div>
              {(detail.contacts && detail.contacts.length > 0 ? detail.contacts : [{ name: detail.contact_name, phone: detail.contact_phone, email: detail.contact_email }]).map((ct, ctIdx) => (
                <div key={ctIdx}>
                  <div className="receipt-row">
                    <span className="receipt-label">{detail.contacts?.length > 1 ? `담당자 ${ctIdx + 1}` : '담당자'}</span>
                    <span className="receipt-value">{ct.name}<CopyBtn text={ct.name} /></span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">{detail.contacts?.length > 1 ? `연락처 ${ctIdx + 1}` : '연락처'}</span>
                    <span className="receipt-value">{ct.phone}<CopyBtn text={ct.phone} /></span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">{detail.contacts?.length > 1 ? `이메일 ${ctIdx + 1}` : '이메일'}</span>
                    <span className="receipt-value">{ct.email}<CopyBtn text={ct.email} /></span>
                  </div>
                  {ct.taxEmail && (
                    <div className="receipt-row">
                      <span className="receipt-label">{detail.contacts?.length > 1 ? `세금계산서 ${ctIdx + 1}` : '세금계산서 이메일'}</span>
                      <span className="receipt-value">{ct.taxEmail}<CopyBtn text={ct.taxEmail} /></span>
                    </div>
                  )}
                </div>
              ))}
              {detail.case_title && <div className="receipt-row"><span className="receipt-label">사건명</span><span className="receipt-value">{detail.case_title}<CopyBtn text={detail.case_title} /></span></div>}
              <div className="receipt-row"><span className="receipt-label">접수일시</span><span className="receipt-value">{detail.submitted_at ? new Date(detail.submitted_at).toLocaleString('ko-KR') : '-'}</span></div>
              <div className="receipt-row">
                <span className="receipt-label">뉴스레터 수신동의</span>
                <span className="receipt-value" style={{ color: detail.newsletter_consent ? '#1a5fb4' : '#999', fontWeight: detail.newsletter_consent ? 600 : 400 }}>
                  {detail.newsletter_consent ? '동의함' : '미동의'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 출원인 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head"><h2>출원인 ({detail.applicants.length}명)</h2></div>
          <div className="card-body">
            {detail.applicants.map((ap: any, idx: number) => {
              const personLabel = PERSON_TYPE_LABELS[ap.personType as keyof typeof PERSON_TYPE_LABELS] || ap.personType;
              const isIndividual = ap.personType?.includes('individual');
              const isCorp = ap.personType?.includes('corp') || ap.personType === 'govt' || ap.personType === 'association';

              return (
                <div key={idx} style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e8e8e8' }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex', width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center',
                        background: '#1a5fb4', color: '#fff', borderRadius: '50%', fontSize: '12px', fontWeight: 600,
                      }}>{idx + 1}</span>
                      <strong style={{ fontSize: '15px' }}>{ap.nameKr || ap.corpName || `출원인 ${idx + 1}`}</strong>
                      {ap.nameEn && <span style={{ color: '#666', fontSize: '13px' }}>({ap.nameEn})</span>}
                      <span style={{ fontSize: '11px', padding: '2px 8px', background: '#e8f0fe', color: '#1a5fb4', borderRadius: '10px' }}>{personLabel}</span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { copyToClipboard(buildApplicantText(ap)); }}
                      style={{ fontSize: '11px' }}
                    >
                      전체 복사
                    </button>
                  </div>

                  {/* 상세 정보 */}
                  {isIndividual && <InfoRow label="성명(한글)" value={ap.nameKr} />}
                  {isIndividual && <InfoRow label="성명(영문)" value={ap.nameEn} />}
                  {isCorp && <InfoRow label="법인명" value={ap.corpName} />}
                  {isCorp && <InfoRow label="대표자명" value={ap.ceoName} />}
                  {ap.rrn && <InfoRow label="주민등록번호" value={ap.rrn} sensitive />}
                  {ap.corpRegNum && <InfoRow label="법인등록번호" value={ap.corpRegNum} sensitive />}
                  {ap.bizNum && <InfoRow label="사업자등록번호" value={ap.bizNum} sensitive />}
                  {ap.passport && <InfoRow label="여권번호" value={ap.passport} sensitive />}
                  {ap.nationality && <InfoRow label="국적" value={NATIONALITY_MAP[ap.nationality] || ap.nationality} />}
                  <InfoRow label="주소" value={formatAddress(ap.address)} />
                  {ap.useMailAddress && <InfoRow label="우편물 수령 주소" value={formatAddress(ap.mailAddress)} />}

                  {/* 사업자등록증 */}
                  {ap.bizLicenseDataUrl && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>사업자등록증 ({ap.bizLicenseFileName || '파일'})</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = ap.bizLicenseDataUrl;
                            link.download = ap.bizLicenseFileName || '사업자등록증';
                            link.click();
                          }}
                          style={{ fontSize: '11px' }}
                        >
                          다운로드
                        </button>
                      </div>
                      {ap.bizLicenseDataUrl.startsWith('data:image') && (
                        <img
                          src={ap.bizLicenseDataUrl}
                          alt="사업자등록증"
                          style={{ maxWidth: '400px', height: 'auto', border: '1px solid #ddd', borderRadius: '4px', background: '#fff' }}
                        />
                      )}
                    </div>
                  )}

                  {/* 서명 */}
                  {ap.signatureDataUrl && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>서명</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => downloadSignature(ap.signatureDataUrl, ap.nameKr || ap.corpName)}
                          style={{ fontSize: '11px' }}
                        >
                          서명 다운로드
                        </button>
                      </div>
                      <img
                        src={ap.signatureDataUrl}
                        alt={`${ap.nameKr || '출원인'} 서명`}
                        style={{ maxWidth: '280px', height: 'auto', border: '1px solid #ddd', borderRadius: '4px', background: '#fff' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 발명자 */}
        {detail.inventors.length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-head"><h2>발명자 ({detail.inventors.length}명)</h2></div>
            <div className="card-body">
              {detail.inventors.map((inv: any, idx: number) => (
                <div key={idx} style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e8e8e8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex', width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center',
                        background: '#2e7d32', color: '#fff', borderRadius: '50%', fontSize: '12px', fontWeight: 600,
                      }}>{idx + 1}</span>
                      <strong style={{ fontSize: '15px' }}>{inv.nameKr || `발명자 ${idx + 1}`}</strong>
                      {inv.nameEn && <span style={{ color: '#666', fontSize: '13px' }}>({inv.nameEn})</span>}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { copyToClipboard(buildInventorText(inv)); }}
                      style={{ fontSize: '11px' }}
                    >
                      전체 복사
                    </button>
                  </div>

                  <InfoRow label="성명(한글)" value={inv.nameKr} />
                  <InfoRow label="성명(영문)" value={inv.nameEn} />
                  {inv.rrn && <InfoRow label="주민등록번호" value={inv.rrn} sensitive />}
                  <InfoRow label="전화번호" value={inv.phone} />
                  <InfoRow label="이메일" value={inv.email} />
                  <InfoRow label="주소" value={formatAddress(inv.address)} />
                  {inv.useMailAddress && <InfoRow label="우편물 수령 주소" value={formatAddress(inv.mailAddress)} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 첨부파일 */}
        {detail.files.length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-head"><h2>첨부파일 ({detail.files.length}개)</h2></div>
            <div className="card-body">
              {detail.files.map((f: any) => (
                <div key={f.id} className="file-item" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span className="file-icon">📄</span>
                    <span className="file-name">{f.original_name}</span>
                    <span style={{ color: '#666', fontSize: '12px' }}>{f.file_type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadFile(f.id, f.original_name, authToken)}
                    style={{ fontSize: '12px', color: '#1a5fb4', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    다운로드
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ 목록 화면 ═══
  return (
    <div className="form-container" style={{ maxWidth: '1100px' }}>
      <header className="form-header">
        <h1>접수 관리</h1>
        <p>고객이 제출한 출원 정보를 확인합니다</p>
      </header>

      {stats && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: '전체', value: stats.total, color: '#1a5fb4', filterKey: 'all' },
            { label: '접수됨', value: stats.submitted, color: '#e65100', filterKey: 'submitted' },
            { label: '검토중', value: stats.reviewing, color: '#1a5fb4', filterKey: 'reviewing' },
            { label: '완료', value: stats.complete, color: '#2e7d32', filterKey: 'complete' },
          ].map(({ label, value, color, filterKey }) => {
            const isActive = statusFilter === filterKey;
            return (
              <div
                key={label}
                className="card"
                onClick={() => { setStatusFilter(filterKey); setPage(1); fetchList(1, filterKey); }}
                style={{
                  flex: 1, textAlign: 'center', cursor: 'pointer',
                  border: isActive ? `2px solid ${color}` : '2px solid transparent',
                  background: isActive ? (filterKey === 'submitted' ? '#fff3e0' : filterKey === 'complete' ? '#e8f5e9' : '#e8f0fe') : '#fff',
                  transition: 'all 0.2s',
                }}
              >
                <div className="card-body" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: '12px', color: isActive ? color : '#666', fontWeight: isActive ? 600 : 400 }}>{label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>접수 목록</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchList(page, statusFilter); fetchStats(); }}>
            새로고침
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {submissions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              접수된 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', background: '#fafbfc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>출원인</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>유형</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>사건명</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>접수일</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>담당자</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>연락처</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>접수번호</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>뉴스레터</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>상태</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>상세</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const statusColor = sub.status === 'complete' ? '#2e7d32' : sub.status === 'reviewing' ? '#1a5fb4' : '#e65100';
                    const statusBg = sub.status === 'complete' ? '#e8f5e9' : sub.status === 'reviewing' ? '#e8f0fe' : '#fff3e0';
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sub.applicant_name || '-'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{APPLICATION_TYPE_LABELS[sub.application_type as keyof typeof APPLICATION_TYPE_LABELS] || sub.application_type}</td>
                        <td style={{ padding: '10px 12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.case_title || '-'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ko-KR') : '-'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {sub.contacts?.length > 0
                            ? sub.contacts[0].name + (sub.contacts.length > 1 ? ` 외 ${sub.contacts.length - 1}명` : '')
                            : sub.contact_name || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{sub.contacts?.[0]?.phone || sub.contact_phone || '-'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{sub.case_number}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {sub.newsletter_consent ? (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', color: '#1a5fb4', background: '#e8f0fe' }}>O</span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#999' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                            color: statusColor, background: statusBg,
                          }}>
                            {STATUS_LABELS[sub.status] || sub.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => viewDetail(sub.id)}>보기</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
          <span style={{ padding: '6px 12px', fontSize: '13px' }}>{page} / {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>
      )}
    </div>
  );
}
