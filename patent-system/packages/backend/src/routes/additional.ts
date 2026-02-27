import { Router } from 'express';
import { customerLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../services/fileService.js';
import { verifySubmission, uploadAdditionalFile } from '../controllers/additionalController.js';

const router = Router();
router.use(customerLimiter);

// 접수번호 인증
router.post('/verify', verifySubmission);

// 추가 파일 업로드
router.post('/upload', uploadLimiter, upload.single('file'), uploadAdditionalFile);

export default router;
