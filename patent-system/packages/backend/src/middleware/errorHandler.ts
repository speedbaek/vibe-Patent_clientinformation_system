import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('에러 발생:', err.message);

  // Multer 에러 (파일 업로드)
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: '파일 크기가 10MB를 초과합니다.',
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: '한 번에 최대 10개까지 업로드할 수 있습니다.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `파일 업로드 오류: ${err.message}`,
    });
    return;
  }

  // 파일 형식 에러
  if (err.message.includes('허용되지 않는')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Mongoose 유효성 검증 에러
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: '입력 데이터가 유효하지 않습니다.',
      details: err.message,
    });
    return;
  }

  // 기본 서버 에러
  res.status(500).json({
    success: false,
    error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
}
