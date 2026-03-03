import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // 서버 로그에는 상세 정보 기록
  console.error('에러 발생:', err.message, err.stack);

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
      error: '파일 업로드 중 오류가 발생했습니다.',
    });
    return;
  }

  // 파일 형식 에러 — 허용된 메시지만 클라이언트에 전달
  if (err.message.includes('허용되지 않는 파일 형식')) {
    res.status(400).json({
      success: false,
      error: '허용되지 않는 파일 형식입니다. JPG, PNG, PDF만 업로드 가능합니다.',
    });
    return;
  }

  // 유효성 검증 에러
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: '입력 데이터가 유효하지 않습니다.',
    });
    return;
  }

  // 기본 서버 에러 — 내부 정보 노출 방지
  res.status(500).json({
    success: false,
    error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
}
