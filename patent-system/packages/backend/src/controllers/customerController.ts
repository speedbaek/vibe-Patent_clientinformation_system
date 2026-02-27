import { Request, Response } from 'express';
import { Submission } from '../models/Submission.js';
import { encryptApplicantData } from '../services/encryptionService.js';
import path from 'path';
import { env } from '../config/env.js';

/**
 * 토큰 검증 + 기존 draft 반환
 * GET /api/customer/verify-token?token=xxx
 */
export async function verifyTokenHandler(req: Request, res: Response): Promise<void> {
  const submission = (req as any).submission;

  res.json({
    success: true,
    data: {
      caseNumber: submission.caseNumber,
      status: submission.status,
      applicationType: submission.applicationType,
      contactPerson: submission.contactPerson,
      caseTitle: submission.caseTitle,
      privacyConsent: {
        agreed: submission.privacyConsent?.agreed || false,
      },
      // draft 데이터가 있으면 복구용으로 반환
      draftData: submission.draftData || null,
      // 이미 입력된 출원인/발명자 수
      applicantCount: submission.applicants?.length || 0,
      inventorCount: submission.inventors?.length || 0,
    },
  });
}

/**
 * 임시저장
 * POST /api/customer/save-draft
 * Body: { token, formData, currentStep }
 */
export async function saveDraftHandler(req: Request, res: Response): Promise<void> {
  const submission = (req as any).submission;
  const { formData, currentStep } = req.body;

  if (!formData) {
    res.status(400).json({ success: false, error: '저장할 데이터가 없습니다.' });
    return;
  }

  submission.draftData = {
    ...formData,
    currentStep,
    savedAt: new Date().toISOString(),
  };

  // 기본 연락처 정보가 있으면 메인 필드에도 저장
  if (formData.contactPerson) {
    submission.contactPerson = formData.contactPerson;
  }
  if (formData.applicationType) {
    submission.applicationType = formData.applicationType;
  }
  if (formData.caseTitle) {
    submission.caseTitle = formData.caseTitle;
  }

  // 감사 로그
  submission.auditLog.push({
    action: 'draft_saved',
    ipAddress: req.ip || '',
    details: `Step ${currentStep} 임시저장`,
  });

  try {
    await submission.save();
  } catch (saveError: any) {
    console.error('임시저장 실패:', saveError.message);
    res.status(400).json({ success: false, error: '임시저장 실패' });
    return;
  }

  res.json({
    success: true,
    message: '임시저장 완료',
    savedAt: new Date().toISOString(),
  });
}

/**
 * 파일 업로드
 * POST /api/customer/upload
 * FormData: file, applicantIndex, fileType
 */
export async function uploadFileHandler(req: Request, res: Response): Promise<void> {
  const submission = (req as any).submission;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
    return;
  }

  const { applicantIndex, fileType } = req.body;
  const idx = parseInt(applicantIndex, 10);

  // 출원인 인덱스 유효성 확인
  if (isNaN(idx) || idx < 0) {
    res.status(400).json({ success: false, error: '유효하지 않은 출원인 인덱스입니다.' });
    return;
  }

  // 출원인 배열 확장 (필요 시)
  while (submission.applicants.length <= idx) {
    submission.applicants.push({ personType: 'domestic_individual' });
  }

  const docEntry = {
    fileName: file.filename,
    originalName: file.originalname,
    fileType: fileType || 'other',
    mimeType: file.mimetype,
    fileSize: file.size,
    storagePath: file.path,
  };

  submission.applicants[idx].documents.push(docEntry);

  submission.auditLog.push({
    action: 'file_uploaded',
    ipAddress: req.ip || '',
    details: `출원인 ${idx + 1} - ${fileType}: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`,
  });

  await submission.save();

  res.json({
    success: true,
    data: {
      fileName: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      fileType,
    },
  });
}

/**
 * 서명 업로드
 * POST /api/customer/upload-signature
 * FormData: signature (PNG), applicantIndex
 */
export async function uploadSignatureHandler(req: Request, res: Response): Promise<void> {
  const submission = (req as any).submission;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: '서명 이미지가 업로드되지 않았습니다.' });
    return;
  }

  const { applicantIndex } = req.body;
  const idx = parseInt(applicantIndex, 10);

  if (isNaN(idx) || idx < 0) {
    res.status(400).json({ success: false, error: '유효하지 않은 출원인 인덱스입니다.' });
    return;
  }

  while (submission.applicants.length <= idx) {
    submission.applicants.push({ personType: 'domestic_individual' });
  }

  submission.applicants[idx].signature = {
    data: file.path,
    uploadedAt: new Date(),
  };

  submission.auditLog.push({
    action: 'signature_uploaded',
    ipAddress: req.ip || '',
    details: `출원인 ${idx + 1} 서명 업로드`,
  });

  await submission.save();

  res.json({
    success: true,
    message: '서명이 저장되었습니다.',
  });
}

/**
 * 최종 제출
 * POST /api/customer/submit
 * Body: { token, applicationType, contactPerson, caseTitle, applicants[], inventors[], privacyConsent }
 */
export async function submitHandler(req: Request, res: Response): Promise<void> {
  const submission = (req as any).submission;
  const {
    applicationType,
    contactPerson,
    caseTitle,
    applicants,
    inventors,
    privacyConsent,
  } = req.body;

  // 개인정보 동의 확인
  if (!privacyConsent?.agreed) {
    res.status(400).json({
      success: false,
      error: '개인정보 수집·이용에 동의해야 합니다.',
    });
    return;
  }

  // 기본 정보 업데이트
  submission.applicationType = applicationType || submission.applicationType;
  submission.contactPerson = contactPerson || submission.contactPerson;
  submission.caseTitle = caseTitle || submission.caseTitle;
  submission.privacyConsent = {
    agreed: true,
    timestamp: new Date(),
    ipAddress: req.ip || '',
  };

  // 출원인 데이터 (민감 필드 암호화, 빈 문서 제거)
  if (applicants && Array.isArray(applicants)) {
    submission.applicants = applicants.map((ap: Record<string, unknown>) => {
      const encrypted = encryptApplicantData(ap);
      // 빈 문서 항목 필터링
      if (encrypted.documents && Array.isArray(encrypted.documents)) {
        encrypted.documents = (encrypted.documents as any[]).filter(
          (doc: any) => doc.fileName || doc.storagePath
        );
      }
      return encrypted;
    });
  }

  // 발명자 데이터 (빈 발명자 필터링)
  if (inventors && Array.isArray(inventors)) {
    submission.inventors = inventors.filter(
      (inv: any) => inv.nameKr && inv.nameKr.trim() !== ''
    );
  }

  // 상태 변경
  submission.status = 'submitted';
  submission.submittedAt = new Date();
  submission.draftData = null;  // draft 데이터 삭제

  // 감사 로그
  submission.auditLog.push({
    action: 'submitted',
    ipAddress: req.ip || '',
    details: `최종 제출 완료 - 출원인 ${submission.applicants.length}명, 발명자 ${submission.inventors.length}명`,
  });

  try {
    await submission.save();
  } catch (saveError: any) {
    console.error('제출 저장 실패:', saveError.message);
    res.status(400).json({
      success: false,
      error: '데이터 저장 중 오류가 발생했습니다. 입력 내용을 확인해 주세요.',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      caseNumber: submission.caseNumber,
      submittedAt: submission.submittedAt,
      applicantCount: submission.applicants.length,
      inventorCount: submission.inventors.length,
      message: '출원 정보가 정상적으로 접수되었습니다.',
    },
  });
}
