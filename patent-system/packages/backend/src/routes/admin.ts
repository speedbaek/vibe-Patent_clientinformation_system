import { Router, Request, Response } from 'express';
import { getDb } from '../config/database.js';
import { env } from '../config/env.js';
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
    `SELECT id, case_number, application_type, status, contact_name, contact_email, case_title, submitted_at, created_at
     FROM submissions ${where}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, lim, offset],
  );

  res.json({
    success: true,
    data: rows,
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
  } catch { applicants = []; }

  let inventors = [];
  try {
    inventors = JSON.parse((row.inventors_json as string) || '[]');
  } catch { inventors = []; }

  res.json({
    success: true,
    data: {
      ...row,
      applicants,
      inventors,
      files,
    },
  });
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
