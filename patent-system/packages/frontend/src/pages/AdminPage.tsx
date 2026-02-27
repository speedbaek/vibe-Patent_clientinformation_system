import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';
import { APPLICATION_TYPE_LABELS } from '../types/index.js';

interface Submission {
  id: number;
  case_number: string;
  application_type: string;
  status: string;
  contact_name: string;
  contact_email: string;
  case_title: string;
  submitted_at: string;
}

interface SubmissionDetail extends Submission {
  contact_phone: string;
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

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const headers = { 'x-admin-password': password };

  const fetchList = useCallback(async (p: number) => {
    try {
      const { data } = await apiClient.get('/admin/submissions', {
        headers,
        params: { page: p, limit: 20 },
      });
      setSubmissions(data.data);
      setTotalPages(data.totalPages);
    } catch {
      setSubmissions([]);
    }
  }, [password]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/stats', { headers });
      setStats(data.data);
    } catch { /* ignore */ }
  }, [password]);

  async function handleLogin() {
    try {
      const { data } = await apiClient.get('/admin/stats', {
        headers: { 'x-admin-password': password },
      });
      if (data.success) {
        setAuthenticated(true);
        setAuthError('');
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

  async function viewDetail(id: number) {
    try {
      const { data } = await apiClient.get(`/admin/submissions/${id}`, { headers });
      setDetail(data.data);
      setSelectedId(id);
    } catch { /* ignore */ }
  }

  // 로그인 화면
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

  // 상세 보기
  if (detail && selectedId) {
    return (
      <div className="form-container">
        <header className="form-header">
          <h1>접수 상세 — {detail.case_number}</h1>
        </header>

        <button className="btn btn-secondary" onClick={() => { setDetail(null); setSelectedId(null); }} style={{ marginBottom: '16px' }}>
          ← 목록으로
        </button>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head"><h2>기본 정보</h2></div>
          <div className="card-body">
            <div className="receipt-box" style={{ maxWidth: '100%' }}>
              <div className="receipt-row"><span className="receipt-label">접수번호</span><span className="receipt-value">{detail.case_number}</span></div>
              <div className="receipt-row"><span className="receipt-label">출원유형</span><span className="receipt-value">{APPLICATION_TYPE_LABELS[detail.application_type as keyof typeof APPLICATION_TYPE_LABELS] || detail.application_type}</span></div>
              <div className="receipt-row"><span className="receipt-label">상태</span><span className="receipt-value">{STATUS_LABELS[detail.status] || detail.status}</span></div>
              <div className="receipt-row"><span className="receipt-label">담당자</span><span className="receipt-value">{detail.contact_name} / {detail.contact_phone}</span></div>
              <div className="receipt-row"><span className="receipt-label">이메일</span><span className="receipt-value">{detail.contact_email}</span></div>
              {detail.case_title && <div className="receipt-row"><span className="receipt-label">사건명</span><span className="receipt-value">{detail.case_title}</span></div>}
              <div className="receipt-row"><span className="receipt-label">접수일시</span><span className="receipt-value">{detail.submitted_at}</span></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-head"><h2>출원인 ({detail.applicants.length}명)</h2></div>
          <div className="card-body">
            {detail.applicants.map((ap: any, idx: number) => (
              <div key={idx} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '8px' }}>
                <strong>{ap.nameKr || ap.corpName || `출원인 ${idx + 1}`}</strong>
                {ap.nameEn && <span style={{ color: '#666', marginLeft: '8px' }}>({ap.nameEn})</span>}
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                  {ap.personType && <span style={{ marginRight: '12px' }}>유형: {ap.personType}</span>}
                  {ap.phone && <span style={{ marginRight: '12px' }}>연락처: {ap.phone}</span>}
                  {ap.email && <span>이메일: {ap.email}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {detail.inventors.length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-head"><h2>발명자 ({detail.inventors.length}명)</h2></div>
            <div className="card-body">
              {detail.inventors.map((inv: any, idx: number) => (
                <div key={idx} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '8px' }}>
                  <strong>{inv.nameKr || `발명자 ${idx + 1}`}</strong>
                  {inv.nameEn && <span style={{ color: '#666', marginLeft: '8px' }}>({inv.nameEn})</span>}
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                    {inv.phone && <span style={{ marginRight: '12px' }}>연락처: {inv.phone}</span>}
                    {inv.email && <span>이메일: {inv.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {detail.files.length > 0 && (
          <div className="card">
            <div className="card-head"><h2>첨부파일 ({detail.files.length}개)</h2></div>
            <div className="card-body">
              {detail.files.map((f: any) => (
                <div key={f.id} className="file-item">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{f.original_name}</span>
                  <span className="file-size" style={{ color: '#666', fontSize: '12px' }}>{f.file_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 목록 화면
  return (
    <div className="form-container">
      <header className="form-header">
        <h1>접수 관리</h1>
        <p>고객이 제출한 출원 정보를 확인합니다</p>
      </header>

      {stats && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: '전체', value: stats.total, color: '#1a5fb4' },
            { label: '접수됨', value: stats.submitted, color: '#e65100' },
            { label: '검토중', value: stats.reviewing, color: '#1a5fb4' },
            { label: '완료', value: stats.complete, color: '#2e7d32' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ flex: 1, textAlign: 'center' }}>
              <div className="card-body" style={{ padding: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>접수 목록</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchList(page); fetchStats(); }}>
            새로고침
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {submissions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              접수된 데이터가 없습니다.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#fafbfc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>접수번호</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>유형</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>담당자</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>사건명</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>접수일</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>상세</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sub.case_number}</td>
                    <td style={{ padding: '10px 12px' }}>{APPLICATION_TYPE_LABELS[sub.application_type as keyof typeof APPLICATION_TYPE_LABELS] || sub.application_type}</td>
                    <td style={{ padding: '10px 12px' }}>{sub.contact_name}</td>
                    <td style={{ padding: '10px 12px' }}>{sub.case_title || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ko-KR') : '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => viewDetail(sub.id)}>보기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
