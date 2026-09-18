CREATE TABLE IF NOT EXISTS crm_sales_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  login_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  invite_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  invite_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS crm_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  sales_id INTEGER REFERENCES crm_sales_accounts(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'appointment', 'visited', 'intent', 'closed', 'invalid')),
  first_assigned_at TEXT,
  ownership_locked_until TEXT,
  last_consulted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS crm_consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES crm_customers(id),
  reservation_id INTEGER REFERENCES reservations(id),
  source_sales_id INTEGER REFERENCES crm_sales_accounts(id),
  invite_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS crm_followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES crm_customers(id),
  sales_id INTEGER NOT NULL REFERENCES crm_sales_accounts(id),
  status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'appointment', 'visited', 'intent', 'closed', 'invalid')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'sales', 'system')),
  actor_id INTEGER,
  action TEXT NOT NULL,
  customer_id INTEGER REFERENCES crm_customers(id),
  from_sales_id INTEGER REFERENCES crm_sales_accounts(id),
  to_sales_id INTEGER REFERENCES crm_sales_accounts(id),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS crm_customers_sales_last_consulted_idx
  ON crm_customers (sales_id, last_consulted_at DESC);
CREATE INDEX IF NOT EXISTS crm_consultations_customer_created_idx
  ON crm_consultations (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_followups_customer_created_idx
  ON crm_followups (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_audit_logs_customer_created_idx
  ON crm_audit_logs (customer_id, created_at DESC);
