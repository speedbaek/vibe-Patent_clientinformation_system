import rateLimit from 'express-rate-limit';

// 고객용: 30 req/min per IP
export const customerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 파일 업로드: 50 req/hour per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: '파일 업로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 관리자용: 60 req/min per IP (Phase 2)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: '요청이 너무 많습니다.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
