CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS reservations_created_at_idx
  ON reservations (created_at DESC);
