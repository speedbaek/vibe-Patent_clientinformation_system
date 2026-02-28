import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  patent: '특허/실용신안',
  trademark: '상표',
  design: '디자인',
  foreign_patent: '해외(특허)',
  foreign_design: '해외(상표,디자인)',
  pct: 'PCT 국제출원', // 레거시 호환
};

interface SubmissionEmailData {
  caseNumber: string;
  contactName: string;
  contactEmail: string;
  applicationType: string;
  caseTitle?: string;
  submittedAt: string;
}

function isSmtpConfigured(): boolean {
  return !!(env.smtpHost && env.smtpUser && env.smtpPass);
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendSubmissionEmail(data: SubmissionEmailData): Promise<void> {
  const uploadLink = `${env.frontendUrl}/upload-additional?case=${encodeURIComponent(data.caseNumber)}`;
  const typeLabel = APPLICATION_TYPE_LABELS[data.applicationType] || data.applicationType;

  const subject = `[지식재산권 출원] 접수 완료 안내 - ${data.caseNumber}`;

  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a5fb4; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">지식재산권 출원 접수 완료</h1>
      </div>

      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #333; line-height: 1.8;">
          <strong>${data.contactName}</strong>님, 안녕하세요.<br/>
          출원 정보가 정상적으로 접수되었습니다.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666; width: 120px;">접수번호</td>
            <td style="padding: 10px; font-weight: 700; color: #1a5fb4;">${data.caseNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">출원유형</td>
            <td style="padding: 10px;">${typeLabel}</td>
          </tr>
          ${data.caseTitle ? `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">사건명</td>
            <td style="padding: 10px;">${data.caseTitle}</td>
          </tr>` : ''}
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">접수일시</td>
            <td style="padding: 10px;">${data.submittedAt}</td>
          </tr>
        </table>

        <div style="background: #fff3e0; border: 1px solid #ffcc80; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <strong style="color: #e65100;">미제출 서류가 있으신가요?</strong>
          <p style="color: #bf360c; margin: 8px 0 12px 0; line-height: 1.6;">
            서명, 사업자등록증, 인감 등 미제출 서류는 아래 링크에서<br/>
            접수번호를 이용하여 언제든 추가 제출할 수 있습니다.
          </p>
          <a href="${uploadLink}"
             style="display: inline-block; background: #e65100; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            첨부서류 추가제출하기
          </a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 24px; line-height: 1.6;">
          본 메일은 출원 접수 시 입력하신 이메일 주소로 자동 발송되었습니다.<br/>
          문의사항은 관리팀에 연락해 주세요.
        </p>
      </div>
    </div>
  `;

  if (!isSmtpConfigured()) {
    console.log('📧 SMTP 미설정 — 이메일 발송 건너뜀');
    console.log(`  받는 사람: ${data.contactEmail}`);
    console.log(`  제목: ${subject}`);
    console.log(`  추가제출 링크: ${uploadLink}`);
    return;
  }

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to: data.contactEmail,
      subject,
      html,
    });
    console.log(`📧 이메일 발송 완료: ${data.contactEmail}`);
  } catch (err) {
    console.error('📧 이메일 발송 실패:', err);
  }
}
