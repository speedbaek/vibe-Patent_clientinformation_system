import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { env } from '../config/env.js';

// 업로드 디렉토리 확인/생성
const uploadDir = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 허용 확장자 화이트리스트
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// 파일 필터 (확장자 + MIME 타입 검증)
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error(`허용되지 않는 파일 형식입니다: ${ext}. 허용: JPG, PNG, PDF`));
    return;
  }

  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(new Error(`허용되지 않는 MIME 타입입니다: ${file.mimetype}`));
    return;
  }

  cb(null, true);
};

// multer 인스턴스 (일반 파일 업로드)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSize,   // 10MB per file
    files: 10,                   // 최대 10개 동시 업로드
  },
});

// multer 인스턴스 (서명 이미지 업로드)
const signatureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sigDir = path.join(uploadDir, 'signatures');
    if (!fs.existsSync(sigDir)) {
      fs.mkdirSync(sigDir, { recursive: true });
    }
    cb(null, sigDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `sig-${uuidv4()}.png`);
  },
});

export const uploadSignature = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 서명은 5MB 제한
    files: 1,
  },
});

/**
 * 파일 경로가 허용된 디렉토리 내에 있는지 검증
 */
export function isPathWithinDir(filePath: string, allowedDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(allowedDir);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

/**
 * 파일 삭제 — 업로드 디렉토리 내 파일만 삭제 허용
 */
export function deleteFile(filePath: string): void {
  // null byte 방지
  if (filePath.includes('\0')) {
    console.error('파일 경로에 null byte 감지:', filePath);
    return;
  }

  const fullPath = path.resolve(filePath);

  // 업로드 디렉토리 밖의 파일 삭제 방지
  if (!isPathWithinDir(fullPath, uploadDir)) {
    console.error('업로드 디렉토리 밖 파일 삭제 시도 차단:', fullPath);
    return;
  }

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
