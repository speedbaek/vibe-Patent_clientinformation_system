import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { env } from './env.js';

let db: SqlJsDatabase;

// 주기적 자동 저장 간격 (ms)
const AUTO_SAVE_INTERVAL = 5000;
let saveTimer: ReturnType<typeof setInterval> | null = null;

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('DB가 초기화되지 않았습니다. initDatabase()를 먼저 호출하세요.');
  }
  return db;
}

/** DB를 디스크에 저장 */
export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(env.dbPath, buffer);
}

export async function initDatabase(): Promise<void> {
  // data 디렉토리 생성
  const dir = path.dirname(env.dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // 기존 DB 파일이 있으면 로드, 없으면 새로 생성
  if (fs.existsSync(env.dbPath)) {
    const fileBuffer = fs.readFileSync(env.dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // foreign keys 활성화
  db.run('PRAGMA foreign_keys = ON');

  // ── 테이블 생성 ──
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT NOT NULL UNIQUE,
      application_type TEXT NOT NULL DEFAULT 'patent',
      status TEXT NOT NULL DEFAULT 'submitted',
      contact_name TEXT NOT NULL DEFAULT '',
      contact_phone TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      case_title TEXT NOT NULL DEFAULT '',
      privacy_agreed INTEGER NOT NULL DEFAULT 0,
      privacy_timestamp TEXT,
      privacy_ip TEXT DEFAULT '',
      applicants_json TEXT NOT NULL DEFAULT '[]',
      inventors_json TEXT NOT NULL DEFAULT '[]',
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      newsletter_consent INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT
    )
  `);

  // 기존 DB에 newsletter_consent 컬럼이 없을 수 있으므로 안전하게 추가
  try {
    db.run('ALTER TABLE submissions ADD COLUMN newsletter_consent INTEGER NOT NULL DEFAULT 0');
  } catch { /* 이미 존재하면 무시 */ }

  // 복수 담당자 지원을 위한 contacts_json 컬럼 추가
  try {
    db.run("ALTER TABLE submissions ADD COLUMN contacts_json TEXT NOT NULL DEFAULT '[]'");
  } catch { /* 이미 존재하면 무시 */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      session_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'other',
      mime_type TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      applicant_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_files_session ON uploaded_files(session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_files_submission ON uploaded_files(submission_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)');

  // 초기 저장
  saveDb();

  // 주기적 자동 저장 (메모리 DB → 디스크)
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => saveDb(), AUTO_SAVE_INTERVAL);

  console.log('SQLite DB 초기화 완료:', env.dbPath);
}
