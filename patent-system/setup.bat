@echo off
chcp 65001 >nul
echo ==========================================
echo   특허 출원 정보 수집 시스템 - 자동 설정
echo ==========================================
echo.

:: 1. Node.js 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 설치 후 다시 실행해 주세요.
    pause
    exit /b 1
)
echo [✓] Node.js 버전:
node --version

:: 2. 의존성 설치
echo.
echo [1/4] 의존성 설치 중... (약 1-2분 소요)
call npm install
if %errorlevel% neq 0 (
    echo [오류] npm install 실패
    pause
    exit /b 1
)
echo [✓] 의존성 설치 완료

:: 3. 환경변수 복사
echo.
echo [2/4] 환경 설정...
if not exist "packages\backend\.env" (
    copy ".env.example" "packages\backend\.env" >nul
    echo [✓] .env 파일 생성됨
) else (
    echo [✓] .env 파일 이미 존재
)

:: 4. uploads 폴더 생성
if not exist "packages\backend\uploads" mkdir "packages\backend\uploads"
if not exist "packages\backend\uploads\signatures" mkdir "packages\backend\uploads\signatures"
echo [✓] 업로드 폴더 준비됨

:: 5. MongoDB 확인
echo.
echo [3/4] MongoDB 확인...
where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo [경고] MongoDB가 PATH에 없습니다.
    echo MongoDB가 설치되어 있고 실행 중인지 확인해 주세요.
    echo https://www.mongodb.com/try/download/community
) else (
    echo [✓] MongoDB 발견
)

:: 6. Seed 데이터
echo.
echo [4/4] 테스트 데이터 생성...
echo MongoDB가 실행 중이어야 합니다. 계속하시겠습니까?
pause
call npm run seed
if %errorlevel% neq 0 (
    echo [경고] Seed 실패 - MongoDB가 실행 중인지 확인하세요
) else (
    echo [✓] 테스트 데이터 생성 완료
)

echo.
echo ==========================================
echo   설정 완료! 아래 명령어로 서버를 시작하세요:
echo   npm run dev
echo ==========================================
echo.
pause
