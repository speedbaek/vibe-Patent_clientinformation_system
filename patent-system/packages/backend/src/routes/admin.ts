import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { env } from '../config/env.js';
import { decryptField } from '../services/encryptionService.js';
import path from 'path';

const router = Router();

/** 간단한 관리자 비밀번호 확인 미들웨어 */
function adminAuth(req: Request, res: Response, next: Function): void {
  const pw = req.headers['x-admin-password'] || req.query.password;
  if (pw !== env.adminPassword) {
    res.status(401).json({ success: false, error: '관리자 인증이 필요합니다.' });
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
    `SELECT id, case_number, application_type, status, contact_name, contact_phone, contact_email, contacts_json, case_title, applicants_json, submitted_at, created_at
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

/** 파일 다운로드 */
router.get('/files/:fileId/download', adminAuth, (req: Request, res: Response) => {
  const file = queryOne('SELECT * FROM uploaded_files WHERE id = ?', [parseInt(req.params.fileId, 10)]);

  if (!file) {
    res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다.' });
    return;
  }

  res.download(path.resolve(file.storage_path as string), file.original_name as string);
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
