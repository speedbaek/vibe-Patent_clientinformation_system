import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/tokenService.js';

/**
 * 고객 토큰 인증 미들웨어
 * - 쿼리 파라미터 ?token=xxx 또는 Authorization: Bearer xxx 헤더에서 토큰 추출
 * - req.submission, req.tokenDoc에 검증된 데이터 바인딩
 */
export async function tokenAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 토큰 추출 (쿼리 > 헤더 > 바디)
    let tokenString =
      (req.query.token as string) ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.body?.token;

    if (!tokenString) {
      res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.',
      });
      return;
    }

    const result = await verifyToken(tokenString);

    if (!result.valid || !result.submission || !result.token) {
      res.status(401).json({
        success: false,
        error: result.error || '인증에 실패했습니다.',
      });
      return;
    }

    // 이미 최종 제출된 건은 수정 불가 (조회는 가능)
    if (result.submission.status === 'submitted' && req.method !== 'GET') {
      res.status(403).json({
        success: false,
        error: '이미 제출된 건입니다. 수정이 필요하시면 관리팀에 문의해주세요.',
      });
      return;
    }

    // 요청 객체에 바인딩
    (req as any).submission = result.submission;
    (req as any).tokenDoc = result.token;

    next();
  } catch (error) {
    next(error);
  }
}
