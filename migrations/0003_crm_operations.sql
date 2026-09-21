CREATE TABLE IF NOT EXISTS crm_admin_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  login_phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'operator', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

ALTER TABLE crm_sales_accounts ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1));
ALTER TABLE crm_sales_accounts ADD COLUMN disabled_at TEXT;
ALTER TABLE crm_sales_accounts ADD COLUMN disabled_reason TEXT;
ALTER TABLE crm_sales_accounts ADD COLUMN password_reset_at TEXT;
ALTER TABLE crm_sales_accounts ADD COLUMN last_login_at TEXT;

ALTER TABLE crm_customers ADD COLUMN next_followup_at TEXT;
ALTER TABLE crm_customers ADD COLUMN reminder_state TEXT NOT NULL DEFAULT 'pending' CHECK (reminder_state IN ('pending', 'done', 'cancelled'));
ALTER TABLE crm_customers ADD COLUMN merged_into_customer_id INTEGER REFERENCES crm_customers(id);
ALTER TABLE crm_customers ADD COLUMN merged_at TEXT;

ALTER TABLE crm_followups ADD COLUMN next_followup_at TEXT;

ALTER TABLE crm_audit_logs ADD COLUMN actor_admin_id INTEGER REFERENCES crm_admin_accounts(id);
ALTER TABLE crm_audit_logs ADD COLUMN request_id TEXT;
ALTER TABLE crm_audit_logs ADD COLUMN metadata_json TEXT;

CREATE TABLE IF NOT EXISTS crm_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_admin_id INTEGER NOT NULL REFERENCES crm_admin_accounts(id),
  filename TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('preview', 'completed', 'failed')),
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS crm_admin_accounts_phone_idx ON crm_admin_accounts (login_phone);
CREATE INDEX IF NOT EXISTS crm_sales_accounts_active_name_idx ON crm_sales_accounts (active, display_name);
CREATE INDEX IF NOT EXISTS crm_customers_status_id_idx ON crm_customers (status, id DESC);
CREATE INDEX IF NOT EXISTS crm_customers_phone_idx ON crm_customers (phone);
CREATE INDEX IF NOT EXISTS crm_customers_reminder_idx ON crm_customers (sales_id, reminder_state, next_followup_at);
CREATE INDEX IF NOT EXISTS crm_customers_merged_idx ON crm_customers (merged_into_customer_id);
CREATE INDEX IF NOT EXISTS crm_followups_customer_id_idx ON crm_followups (customer_id, id DESC);
CREATE INDEX IF NOT EXISTS crm_audit_logs_admin_id_idx ON crm_audit_logs (actor_admin_id, id DESC);
