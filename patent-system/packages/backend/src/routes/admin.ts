import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb, saveDb } from '../config/database.js';
import { env } from '../config/env.js';
import { decryptField } from '../services/encryptionService.js';
import { isPathWithinDir } from '../services/fileService.js';
import path from 'path';

const router = Router();

// ── 세션 토큰 관리 ──
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4시간
const activeSessions = new Map<string, { createdAt: number }>();

// 만료된 세션 정리 (10분마다)
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions) {
    if (now - session.createdAt > SESSION_EXPIRY_MS) {
      activeSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

/** 세션 토큰 생성 */
function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ── 로그인 Rate Limiting ──
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15분

// 만료된 rate limit 기록 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts) {
    if (now - data.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/** 로그인 엔드포인트 */
router.post('/login', (req: Request, res: Response) => {
  // Rate limiting 체크
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const attempts = loginAttempts.get(clientIp);

  if (attempts) {
    if (Date.now() - attempts.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(clientIp);
    } else if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const remainingSec = Math.ceil((LOGIN_WINDOW_MS - (Date.now() - attempts.firstAttempt)) / 1000);
      res.status(429).json({
        success: false,
        error: `로그인 시도가 너무 많습니다. ${Math.ceil(remainingSec / 60)}분 후 다시 시도하세요.`,
      });
      return;
    }
  }

  const { password } = req.body;
  if (!password || password !== env.adminPassword) {
    // 실패 기록
    const current = loginAttempts.get(clientIp);
    if (current) {
      current.count++;
    } else {
      loginAttempts.set(clientIp, { count: 1, firstAttempt: Date.now() });
    }
    res.status(401).json({ success: false, error: '비밀번호가 올바르지 않습니다.' });
    return;
  }

  // 성공 시 실패 기록 초기화
  loginAttempts.delete(clientIp);

  const token = createSessionToken();
  activeSessions.set(token, { createdAt: Date.now() });

  res.json({ success: true, data: { token, expiresIn: SESSION_EXPIRY_MS } });
});

/** 세션 토큰 기반 관리자 인증 미들웨어 */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  // Authorization 헤더에서만 토큰 추출 (query param 사용 안 함)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: '관리자 인증이 필요합니다.' });
    return;
  }

  const session = activeSessions.get(token);
  if (!session) {
    res.status(401).json({ success: false, error: '세션이 만료되었습니다. 다시 로그인하세요.' });
    return;
  }
  if (Date.now() - session.createdAt > SESSION_EXPIRY_MS) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, error: '세션이 만료되었습니다. 다시 로그인하세요.' });
    return;
  }
  next();
}

/** sql.js 헬퍼: 쿼리 실행 후 모든 행을 객체 배열로 반환 */
function queryAll(sql: string, params: any[] = []): Record<string, any>[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results: Record<string, any>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/** sql.js 헬퍼: 단일 행 반환 */
function queryOne(sql: string, params: any[] = []): Record<string, any> | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  let result: Record<string, any> | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/** 접수 목록 조회 */
router.get('/submissions', adminAuth, (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;

  const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
  const lim = parseInt(limit as string, 10);

  let where = '';
  const params: any[] = [];
  if (status && status !== 'all') {
    where = 'WHERE status = ?';
    params.push(status);
  }

  const countRow = queryOne(`SELECT COUNT(*) as cnt FROM submissions ${where}`, params);
  const total = countRow?.cnt ?? 0;

  const rows = queryAll(
    `SELECT id, case_number, application_type, status, contact_name, contact_phone, contact_email, contacts_json, case_title, applicants_json, submitted_at, created_at, newsletter_consent
     FROM submissions ${where}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, lim, offset],
  );

  // 출원인 대표 이름 추출 + 담당자 정보 파싱
  const enrichedRows = rows.map((row) => {
    let applicantName = '';
    try {
      const applicants = JSON.parse((row.applicants_json as string) || '[]');
      if (applicants.length > 0) {
        const first = applicants[0];
        applicantName = first.nameKr || first.corpName || '';
        if (applicants.length > 1) applicantName += ` 외 ${applicants.length - 1}명`;
      }
    } catch { /* ignore */ }

    // contacts_json 파싱 (없으면 기존 단일 담당자 필드로 폴백)
    let contacts: any[] = [];
    try {
      contacts = JSON.parse((row.contacts_json as string) || '[]');
    } catch { /* ignore */ }
    if (contacts.length === 0 && row.contact_name) {
      contacts = [{ name: row.contact_name, phone: row.contact_phone, email: row.contact_email }];
    }

    const { applicants_json, contacts_json, ...rest } = row;
    return { ...rest, applicant_name: applicantName, contacts };
  });

  res.json({
    success: true,
    data: enrichedRows,
    total,
    page: parseInt(page as string, 10),
    totalPages: Math.ceil(total / lim),
  });
});

/** 접수 상세 조회 */
router.get('/submissions/:id', adminAuth, (req: Request, res: Response) => {
  const row = queryOne('SELECT * FROM submissions WHERE id = ?', [parseInt(req.params.id, 10)]);

  if (!row) {
    res.status(404).json({ success: false, error: '접수 데이터를 찾을 수 없습니다.' });
    return;
  }

  const files = queryAll('SELECT * FROM uploaded_files WHERE submission_id = ?', [row.id]);

  let applicants = [];
  try {
    applicants = JSON.parse((row.applicants_json as string) || '[]');
    // 암호화된 민감 필드 복호화
    applicants = applicants.map((ap: any) => {
      if (ap.rrnEncrypted) {
        ap.rrn = decryptField(ap.rrnEncrypted);
        delete ap.rrnEncrypted;
      }
      if (ap.corpRegNumEncrypted) {
        ap.corpRegNum = decryptField(ap.corpRegNumEncrypted);
        delete ap.corpRegNumEncrypted;
      }
      if (ap.bizNumEncrypted) {
        ap.bizNum = decryptField(ap.bizNumEncrypted);
        delete ap.bizNumEncrypted;
      }
      if (ap.passportEncrypted) {
        ap.passport = decryptField(ap.passportEncrypted);
        delete ap.passportEncrypted;
      }
      return ap;
    });
  } catch { applicants = []; }

  let inventors = [];
  try {
    inventors = JSON.parse((row.inventors_json as string) || '[]');
  } catch { inventors = []; }

  // 복수 담당자 파싱 (없으면 기존 단일 담당자 필드로 폴백)
  let contacts: any[] = [];
  try {
    contacts = JSON.parse((row.contacts_json as string) || '[]');
  } catch { /* ignore */ }
  if (contacts.length === 0 && row.contact_name) {
    contacts = [{ name: row.contact_name, phone: row.contact_phone, email: row.contact_email }];
  }

  res.json({
    success: true,
    data: {
      ...row,
      applicants,
      inventors,
      contacts,
      files,
    },
  });
});

/** 접수 상태 변경 */
router.patch('/submissions/:id/status', adminAuth, (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['submitted', 'reviewing', 'complete'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: '유효하지 않은 상태입니다.' });
    return;
  }

  const db = getDb();
  db.run('UPDATE submissions SET status = ? WHERE id = ?', [status, parseInt(req.params.id, 10)]);
  saveDb();

  res.json({ success: true });
});

/** 파일 다운로드 — path traversal 방지 */
router.get('/files/:fileId/download', adminAuth, (req: Request, res: Response) => {
  const file = queryOne('SELECT * FROM uploaded_files WHERE id = ?', [parseInt(req.params.fileId, 10)]);

  if (!file) {
    res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다.' });
    return;
  }

  const storagePath = file.storage_path as string;

  // null byte 방지
  if (storagePath.includes('\0')) {
    res.status(400).json({ success: false, error: '잘못된 파일 경로입니다.' });
    return;
  }

  // path traversal 방지: 업로드 디렉토리 내 파일만 허용
  const resolvedPath = path.resolve(storagePath);
  if (!isPathWithinDir(resolvedPath, env.uploadDir)) {
    console.error('path traversal 시도 차단:', storagePath);
    res.status(403).json({ success: false, error: '파일에 접근할 수 없습니다.' });
    return;
  }

  res.download(resolvedPath, file.original_name as string);
});

/** 접수 통계 */
router.get('/stats', adminAuth, (_req: Request, res: Response) => {
  const total = queryOne('SELECT COUNT(*) as cnt FROM submissions')?.cnt ?? 0;
  const submitted = queryOne("SELECT COUNT(*) as cnt FROM submissions WHERE status = 'submitted'")?.cnt ?? 0;
  const reviewing = queryOne("SELECT COUNT(*) as cnt FROM submissions WHERE status = 'reviewing'")?.cnt ?? 0;
  const complete = queryOne("SELECT COUNT(*) as cnt FROM submissions WHERE status = 'complete'")?.cnt ?? 0;

  res.json({
    success: true,
    data: { total, submitted, reviewing, complete },
  });
});

export default router;
