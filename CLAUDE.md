# 특허법인 테헤란 - 출원 정보 수집 시스템

## 프로젝트 개요
특허법인 테헤란의 고객 출원 정보(출원인, 발명자, 서류 등)를 온라인으로 수집하는 웹 시스템.
고객이 폼을 작성하면 관리자가 확인하고 출원 절차를 진행.

## 기술 스택
- **프론트엔드**: React 18 + TypeScript + Vite (port 5173)
- **백엔드**: Express + TypeScript (port 4000)
- **DB**: SQLite (sql.js, in-memory + 파일 저장)
- **암호화**: AES-256 (출원인 민감정보)
- **모노레포**: `patent-system/packages/frontend` + `patent-system/packages/backend`

## 배포 정보
- **플랫폼**: Railway (Hobby plan)
- **URL**: https://vibe-patentclientinformationsystem-production.up.railway.app
- **GitHub**: speedbaek/vibe-Patent_clientinformation_system
- **Volume**: `/data` (SQLite DB + 업로드 파일)
- **빌드**: `npm run build` (루트에서 concurrently로 frontend/backend 동시 빌드)
- **시작**: `npm start` → `node packages/backend/dist/server.js`
- **관리자**: `/admin` 경로, 비밀번호는 환경변수 `ADMIN_PASSWORD`

## Railway 환경변수
```
NODE_ENV=production
PORT=4000
DB_PATH=/data/patent.db
UPLOAD_DIR=/data/uploads
AES_ENCRYPTION_KEY=(64자 hex)
ADMIN_PASSWORD=(설정값)
FRONTEND_URL=*
```

## 주요 파일 구조
```
patent-system/
  packages/
    frontend/
      src/
        pages/CustomerForm.tsx      # 메인 고객 폼 (5단계 위저드)
        pages/AdminDashboard.tsx    # 관리자 대시보드
        pages/UploadAdditional.tsx  # 추가 서류 제출
        components/
          PrivacyConsent.tsx        # 개인정보 동의 (Step 0)
          ApplicationTypeStep.tsx   # 출원유형/담당자 (Step 1)
          ApplicantStep.tsx         # 출원인 정보 (Step 2)
          InventorStep.tsx          # 발명자 정보 (Step 3)
          FileUploadStep.tsx        # 파일 첨부 (Step 4)
          SubmissionComplete.tsx    # 접수완료 (Step 5)
          Footer.tsx                # 공통 푸터
        styles/global.css           # 전역 CSS (반응형 포함)
    backend/
      src/
        app.ts                      # Express 앱 설정 (helmet, CORS, CSP)
        config/
          env.ts                    # 환경변수 관리
          database.ts               # SQLite 초기화/저장
        controllers/
          customerController.ts     # 고객 API (업로드, 제출)
          adminController.ts        # 관리자 API (목록, 상세, 복호화)
        services/
          encryptionService.ts      # AES-256 암호화/복호화
          emailService.ts           # 이메일 발송 (nodemailer)
        routes/
          customerRoutes.ts
          adminRoutes.ts
```

## 개발 환경 실행
```bash
cd patent-system
npm install
npm run dev          # frontend(5173) + backend(4000) 동시 실행
```

## CSP / 보안 설정 (app.ts)
- Daum 주소검색 API: `t1.daumcdn.net`, `postcode.map.daum.net` 허용
- `crossOriginOpenerPolicy: false` / `crossOriginEmbedderPolicy: false` (팝업 통신용)

## 모바일 반응형
- 520px 이하: 푸터 `position: relative` (fixed 아님)
- `form-container` 하단 패딩 24px (푸터 가림 방지)

---

## 미구현 기능 (플랜 완료, 구현 대기)

### 이메일 알림 + Google Sheets 연동

고객 정보 제출 시:
1. 담당자 이메일로 접수 확인 이메일 (기존 구현됨)
2. **관리 이메일(patent@thrlaw.co.kr)로 상세 알림** (미구현)
3. **Google Sheets에 접수 정보 순차 기록** (미구현)

#### SMTP 설정
- 네이버웍스: `smtp.worksmobile.com:587`
- 발신/관리 이메일: `patent@thrlaw.co.kr`

#### 구현 계획 (5개 파일 수정)

**1. `packages/backend/package.json`** — `googleapis` 패키지 추가

**2. `packages/backend/src/config/env.ts`** — 환경변수 추가:
```typescript
adminEmail: process.env.ADMIN_EMAIL || 'patent@thrlaw.co.kr',
googleSheetsId: process.env.GOOGLE_SHEETS_ID || '',
googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
```

**3. `packages/backend/src/services/emailService.ts`** — `sendAdminNotificationEmail()` 추가:
- 제목: `[신규접수] RCP-YYYYMMDD-XXXX - 출원유형 - 사건명`
- 본문: 접수번호, 출원유형, 담당자/출원인/발명자 테이블
- 민감정보(주민번호, 여권번호 등) 절대 미포함

**4. `packages/backend/src/services/googleSheetsService.ts`** — 신규 파일:
- `google.auth.JWT`로 서비스 계정 인증
- `sheets.spreadsheets.values.append()`로 행 추가
- 컬럼: 접수일시 | 접수번호 | 출원유형 | 사건명 | 담당자 | 출원인수 | 출원인상세 | 발명자수 | 발명자상세 | 뉴스레터동의
- 민감정보 미포함

**5. `packages/backend/src/controllers/customerController.ts`** — 신규 서비스 호출:
- 기존 이메일 루프 후, `res.json()` 전에 비동기 호출
- `sendAdminNotificationEmail({...}).catch(() => {})`
- `appendSubmissionToSheet({...}).catch(() => {})`

#### 추가 Railway 환경변수 (구현 시 설정)
```
SMTP_HOST=smtp.worksmobile.com
SMTP_PORT=587
SMTP_USER=patent@thrlaw.co.kr
SMTP_PASS=(사용자 제공)
SMTP_FROM=patent@thrlaw.co.kr
ADMIN_EMAIL=patent@thrlaw.co.kr
GOOGLE_SHEETS_ID=(스프레드시트 URL에서 추출)
GOOGLE_SERVICE_ACCOUNT_EMAIL=(JSON 키의 client_email)
GOOGLE_PRIVATE_KEY=(JSON 키의 private_key)
```

#### Google Sheet 준비 (사용자)
1. 스프레드시트를 서비스 계정 이메일에 Editor로 공유
2. Sheet1 첫 행 헤더: 접수일시 | 접수번호 | 출원유형 | 사건명 | 담당자 | 출원인수 | 출원인상세 | 발명자수 | 발명자상세 | 뉴스레터동의

> **참고**: 사용자가 이메일 주소를 변경하여 테스트한 후 배포할 예정. 구현 시 이메일 주소 확인 필요.
