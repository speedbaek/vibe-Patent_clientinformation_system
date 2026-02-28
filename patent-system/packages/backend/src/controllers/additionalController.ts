import { Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';

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

/** 접수건 조회 — 담당자 연락처 또는 이메일로 검색 */
export function verifySubmission(req: Request, res: Response): void {
  const { contactPhone, contactEmail } = req.body;

  if (!contactPhone && !contactEmail) {
    res.status(400).json({
      success: false,
      error: '담당자 연락처 또는 이메일을 입력해 주세요.',
    });
    return;
  }

  const db = getDb();
  let row: Record<string, any> | null = null;

  // 연락처 또는 이메일로 최신 접수건 검색 (기본 필드 + contacts_json)
  const conditions: string[] = [];
  const params: any[] = [];

  if (contactPhone && contactPhone.trim()) {
    const phone = contactPhone.trim();
    conditions.push('(contact_phone = ? OR contacts_json LIKE ?)');
    params.push(phone, `%"phone":"${phone}"%`);
  }
  if (contactEmail && contactEmail.trim()) {
    const email = contactEmail.trim();
    conditions.push('(LOWER(contact_email) = LOWER(?) OR LOWER(contacts_json) LIKE LOWER(?))');
    params.push(email, `%"email":"${email}"%`);
  }

  const where = conditions.join(' OR ');
  const rows = queryAll(
    `SELECT id, case_number, contact_name, contact_email, application_type, case_title, status
     FROM submissions WHERE ${where} ORDER BY id DESC LIMIT 1`,
    params,
  );

  if (rows.length === 0) {
    res.status(404).json({ success: false, error: '일치하는 접수 내역을 찾을 수 없습니다.' });
    return;
  }
  row = rows[0];

  // 기존 첨부파일 목록 조회
  const fileStmt = db.prepare(
    'SELECT id, original_name, file_type, file_size FROM uploaded_files WHERE submission_id = ?',
  );
  fileStmt.bind([row!.id]);
  const files: Record<string, any>[] = [];
  while (fileStmt.step()) {
    files.push(fileStmt.getAsObject());
  }
  fileStmt.free();

  res.json({
    success: true,
    data: {
      submissionId: row!.id,
      caseNumber: row!.case_number,
      applicationType: row!.application_type,
      caseTitle: row!.case_title,
      status: row!.status,
      existingFiles: files,
    },
  });
}

/** 추가 파일 업로드 */
export function uploadAdditionalFile(req: Request, res: Response): void {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
    return;
  }

  const { submissionId, applicantIndex, fileType } = req.body;
  if (!submissionId) {
    res.status(400).json({ success: false, error: 'submissionId가 필요합니다.' });
    return;
  }

  const db = getDb();
  const stmt = db.prepare('SELECT id FROM submissions WHERE id = ?');
  stmt.bind([parseInt(submissionId, 10)]);
  const exists = stmt.step();
  stmt.free();

  if (!exists) {
    res.status(404).json({ success: false, error: '접수 데이터를 찾을 수 없습니다.' });
    return;
  }

  const sessionId = `additional-${Date.now()}`;
  db.run(
    `INSERT INTO uploaded_files (submission_id, session_id, file_name, original_name, file_type, mime_type, file_size, storage_path, applicant_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parseInt(submissionId, 10),
      sessionId,
      file.filename,
      file.originalname,
      fileType || 'other',
      file.mimetype,
      file.size,
      file.path,
      parseInt(applicantIndex, 10) || 0,
    ],
  );
  saveDb();

  res.json({
    success: true,
    data: {
      fileName: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      fileType: fileType || 'other',
    },
  });
}
