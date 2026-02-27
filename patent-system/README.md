# 특허 출원 정보 수집 웹시스템

## 빠른 시작

### 1. 사전 준비
- **Node.js** 18+ (https://nodejs.org)
- **MongoDB** 7+ (https://www.mongodb.com/try/download/community)

### 2. 의존성 설치
```bash
cd patent-system
npm install
```

### 3. 환경변수 설정
```bash
cp .env.example packages/backend/.env
```

### 4. MongoDB 시작
```bash
# macOS (brew)
brew services start mongodb-community

# Windows (서비스로 설치된 경우 자동 실행)
# Linux
sudo systemctl start mongod
```

### 5. 테스트 데이터 생성
```bash
npm run seed
```
실행 후 출력되는 **접속 URL**을 복사하세요.

### 6. 개발 서버 실행
```bash
npm run dev
```
- 백엔드: http://localhost:4000
- 프론트엔드: http://localhost:5173

### 7. 접속
seed 스크립트에서 출력된 URL로 접속:
```
http://localhost:5173/{토큰값}
```

## 프로젝트 구조
```
patent-system/
├── packages/
│   ├── backend/          # Node.js + Express + MongoDB
│   │   ├── src/
│   │   │   ├── models/       # Submission, Token 스키마
│   │   │   ├── services/     # 암호화, 토큰, 파일 서비스
│   │   │   ├── middleware/   # 인증, Rate Limit, 에러처리
│   │   │   ├── controllers/  # API 핸들러
│   │   │   └── routes/       # Express 라우트
│   │   └── .env
│   └── frontend/         # React + TypeScript + Vite
│       └── src/
│           ├── components/   # 공용 컴포넌트
│           ├── pages/        # 5단계 폼 페이지
│           ├── context/      # FormContext (상태관리)
│           ├── hooks/        # 자동저장, 토큰검증
│           └── types/        # TypeScript 타입
└── package.json          # npm workspaces root
```

## 기술 스택
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Mongoose
- **Database**: MongoDB
- **보안**: AES-256 암호화, Rate Limiting, Helmet
