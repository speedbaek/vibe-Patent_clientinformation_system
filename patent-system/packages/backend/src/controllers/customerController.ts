import { Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { encryptApplicantData } from '../services/encryptionService.js';
import { sendSubmissionEmail } from '../services/emailService.js';

/** 접수번호 자동 생성 */
function generateCaseNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${y}${m}${d}-${rand}`;
}

/**
 * 파일 업로드
 * POST /api/customer/upload
 */
export function uploadFileHandler(req: Request, res: Response): void {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
    return;
  }

  const { sessionId, applicantIndex, fileType } = req.body;
  if (!sessionId) {
    res.status(400).json({ success: false, error: 'sessionId가 필요합니다.' });
    return;
  }

  const db = getDb();
  db.run(
    `INSERT INTO uploaded_files (session_id, file_name, original_name, file_type, mime_type, file_size, storage_path, applicant_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, file.filename, file.originalname, fileType || 'other', file.mimetype, file.size, file.path, parseInt(applicantIndex, 10) || 0],
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

/**
 * 서명 업로드
 * POST /api/customer/upload-signature
 */
export function uploadSignatureHandler(req: Request, res: Response): void {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: '서명 이미지가 업로드되지 않았습니다.' });
    return;
  }

  const { sessionId, applicantIndex } = req.body;
  if (!sessionId) {
    res.status(400).json({ success: false, error: 'sessionId가 필요합니다.' });
    return;
  }

  const db = getDb();
  db.run(
    `INSERT INTO uploaded_files (session_id, file_name, original_name, file_type, mime_type, file_size, storage_path, applicant_index)
     VALUES (?, ?, 'signature.png', 'signature', ?, ?, ?, ?)`,
    [sessionId, file.filename, file.mimetype, file.size, file.path, parseInt(applicantIndex, 10) || 0],
  );
  saveDb();

  res.json({
    success: true,
    message: '서명이 저장되었습니다.',
    data: { fileName: file.filename },
  });
}

/**
 * 최종 제출
 * POST /api/customer/submit
 */
export function submitHandler(req: Request, res: Response): void {
  const {
    sessionId,
    applicationType,
    contactPerson,
    caseTitle,
    applicants,
    inventors,
    privacyConsent,
    newsletterConsent,
  } = req.body;

  if (!privacyConsent?.agreed) {
    res.status(400).json({ success: false, error: '개인정보 수집·이용에 동의해야 합니다.' });
    return;
  }

  if (!contactPerson?.name || !contactPerson?.phone || !contactPerson?.email) {
    res.status(400).json({ success: false, error: '담당자 연락처 정보를 입력해 주세요.' });
    return;
  }

  // 출원인 데이터 암호화
  const encryptedApplicants = (applicants || []).map((ap: Record<string, unknown>) => {
    const encrypted = encryptApplicantData(ap);
    if (encrypted.documents && Array.isArray(encrypted.documents)) {
      encrypted.documents = (encrypted.documents as any[]).filter(
        (doc: any) => doc.fileName || doc.storagePath
      );
    }
    return encrypted;
  });

  // 빈 발명자 필터링
  const filteredInventors = (inventors || []).filter(
    (inv: any) => inv.nameKr && inv.nameKr.trim() !== ''
  );

  const caseNumber = generateCaseNumber();
  const now = new Date().toISOString();
  const db = getDb();

  try {
    db.run(
      `INSERT INTO submissions (
        case_number, application_type, status,
        contact_name, contact_phone, contact_email,
        case_title, privacy_agreed, privacy_timestamp, privacy_ip,
        applicants_json, inventors_json, ip_address, newsletter_consent, submitted_at
      ) VALUES (?, ?, 'submitted', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseNumber,
        applicationType || 'patent',
        contactPerson.name,
        contactPerson.phone,
        contactPerson.email,
        caseTitle || '',
        now,
        req.ip || '',
        JSON.stringify(encryptedApplicants),
        JSON.stringify(filteredInventors),
        req.ip || '',
        newsletterConsent ? 1 : 0,
        now,
      ],
    );

    // 방금 삽입된 submission의 ID 가져오기
    const stmt = db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const row = stmt.getAsObject() as { id: number };
    stmt.free();
    const submissionId = row.id;

    // 업로드된 파일을 이 submission에 연결
    if (sessionId) {
      db.run('UPDATE uploaded_files SET submission_id = ? WHERE session_id = ?', [submissionId, sessionId]);
    }

    saveDb();

    // 이메일 발송 (비동기, 실패해도 제출은 성공)
    sendSubmissionEmail({
      caseNumber,
      contactName: contactPerson.name,
      contactEmail: contactPerson.email,
      applicationType: applicationType || 'patent',
      caseTitle: caseTitle || undefined,
      submittedAt: now,
    }).catch(() => {});

    res.json({
      success: true,
      data: {
        caseNumber,
        submittedAt: now,
        applicantCount: encryptedApplicants.length,
        inventorCount: filteredInventors.length,
        message: '출원 정보가 정상적으로 접수되었습니다.',
      },
    });
  } catch (err: any) {
    console.error('제출 저장 실패:', err.message);
    res.status(500).json({ success: false, error: '데이터 저장 중 오류가 발생했습니다.' });
  }
}
