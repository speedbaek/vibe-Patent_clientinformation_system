import { Router } from 'express';
import { tokenAuth } from '../middleware/tokenAuth.js';
import { customerLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { upload, uploadSignature } from '../services/fileService.js';
import {
  verifyTokenHandler,
  saveDraftHandler,
  uploadFileHandler,
  uploadSignatureHandler,
  submitHandler,
} from '../controllers/customerController.js';

const router = Router();

// 모든 고객 API에 Rate Limiter 적용
router.use(customerLimiter);

// 토큰 검증 (폼 진입 시)
router.get('/verify-token', tokenAuth, verifyTokenHandler);

// 임시저장 (3초 디바운스)
router.post('/save-draft', tokenAuth, saveDraftHandler);

// 파일 업로드
router.post('/upload', uploadLimiter, tokenAuth, upload.single('file'), uploadFileHandler);

// 서명 업로드
router.post('/upload-signature', uploadLimiter, tokenAuth, uploadSignature.single('signature'), uploadSignatureHandler);

// 최종 제출
router.post('/submit', tokenAuth, submitHandler);

export default router;
