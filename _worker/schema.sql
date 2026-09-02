CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  ho TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  allow_quote INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_ip ON posts(ip_hash, created_at);
-- ゲート総当たり対策: IPハッシュごとの失敗回数(1時間窓)
CREATE TABLE IF NOT EXISTS gate_fails (
  ip_hash TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
