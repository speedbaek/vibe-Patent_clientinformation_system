import { Token, generateToken, getTokenExpiry, IToken } from '../models/Token.js';
import { Submission, generateCaseNumber } from '../models/Submission.js';
import mongoose from 'mongoose';

interface TokenVerifyResult {
  valid: boolean;
  submission?: InstanceType<typeof Submission>;
  token?: IToken;
  error?: string;
}

/**
 * 토큰 유효성 검증
 */
export async function verifyToken(tokenString: string): Promise<TokenVerifyResult> {
  if (!tokenString) {
    return { valid: false, error: '토큰이 제공되지 않았습니다.' };
  }

  const tokenDoc = await Token.findOne({ token: tokenString });

  if (!tokenDoc) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }

  if (tokenDoc.status === 'revoked') {
    return { valid: false, error: '폐기된 토큰입니다.' };
  }

  if (tokenDoc.status === 'expired' || tokenDoc.expiresAt < new Date()) {
    // 만료 상태 업데이트
    if (tokenDoc.status !== 'expired') {
      tokenDoc.status = 'expired';
      await tokenDoc.save();
    }
    return { valid: false, error: '만료된 토큰입니다. 관리팀에 문의해주세요.' };
  }

  // 마지막 접근 시간 갱신
  tokenDoc.lastAccessedAt = new Date();
  await tokenDoc.save();

  // 연결된 접수 데이터 조회
  const submission = await Submission.findById(tokenDoc.submissionId);
  if (!submission) {
    return { valid: false, error: '연결된 접수 데이터를 찾을 수 없습니다.' };
  }

  return { valid: true, submission, token: tokenDoc };
}

/**
 * 새 접수 건 + 토큰 생성 (관리자가 사건 등록 시)
 */
export async function createSubmissionWithToken(createdBy: string = 'system'): Promise<{
  submission: InstanceType<typeof Submission>;
  token: IToken;
  tokenUrl: string;
}> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const caseNumber = generateCaseNumber();
    const submission = new Submission({ caseNumber });
    await submission.save({ session });

    const tokenString = generateToken();
    const token = new Token({
      token: tokenString,
      submissionId: submission._id,
      expiresAt: getTokenExpiry(),
      createdBy,
    });
    await token.save({ session });

    await session.commitTransaction();

    return {
      submission,
      token,
      tokenUrl: `/${tokenString}`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
