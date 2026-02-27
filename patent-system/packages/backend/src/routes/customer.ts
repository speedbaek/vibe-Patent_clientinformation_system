import { Router } from 'express';
import { customerLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { upload, uploadSignature } from '../services/fileService.js';
import {
  uploadFileHandler,
  uploadSignatureHandler,
  submitHandler,
} from '../controllers/customerController.js';

const router = Router();

// Rate Limiter
router.use(customerLimiter);

// 파일 업로드 (세션 ID 기반, 제출 전 임시 저장)
router.post('/upload', uploadLimiter, upload.single('file'), uploadFileHandler);

// 서명 업로드
router.post('/upload-signature', uploadLimiter, uploadSignature.single('signature'), uploadSignatureHandler);

// 최종 제출
router.post('/submit', submitHandler);

export default router;
