import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createInviteSignature, handleCrmApi, recordCrmReservation } from "../worker/crm.js";

function createCrmD1(sales) {
  const customers = [];
  const consultations = [];
  const audits = [];
  const db = {
    customers,
    consultations,
    audits,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async all() {
          if (sql.startsWith("SELECT id FROM crm_sales_accounts LIMIT 1")) return { results: sales.map(({ id }) => ({ id })) };
          throw new Error(`Unexpected all query: ${sql}`);
        },
        async first() {
          if (sql.startsWith("SELECT id, invite_code FROM crm_sales_accounts")) {
            return sales.find((salesperson) => salesperson.invite_code === values[0] && salesperson.active) || null;
          }
          if (sql.startsWith("SELECT id, sales_id FROM crm_customers WHERE phone")) {
            return customers.find((customer) => customer.phone === values[0]) || null;
          }
          throw new Error(`Unexpected first query: ${sql}`);
        },
        async run() {
          if (sql.startsWith("INSERT INTO crm_customers")) {
            const customer = { id: customers.length + 1, name: values[0], phone: values[1], sales_id: values[2] || null };
            customers.push(customer);
            return { success: true, meta: { last_row_id: customer.id } };
          }
          if (sql.startsWith("UPDATE crm_customers SET name")) {
            const customer = customers.find(({ id }) => id === values[1]);
            customer.name = values[0];
            return { success: true };
          }
          if (sql.startsWith("INSERT INTO crm_consultations")) {
            consultations.push({ customer_id: values[0], reservation_id: values[1], source_sales_id: values[2], invite_code: values[3] });
            return { success: true };
          }
          if (sql.startsWith("INSERT INTO crm_audit_logs")) {
            audits.push({ actor_type: values[0], action: values[2], customer_id: values[3], to_sales_id: values[5], reason: values[6] });
            return { success: true };
          }
          throw new Error(`Unexpected run query: ${sql}`);
        },
      };
    },
  };
  return db;
}

test("CRM captures a valid invite and does not let a later invite steal the customer", async () => {
  const DB = createCrmD1([
    { id: 1, invite_code: "ALPHA2026", active: 1 },
    { id: 2, invite_code: "BRAVO2026", active: 1 },
  ]);
  const CRM_INVITE_SECRET = "crm-invite-test-secret";

  const first = await recordCrmReservation({ DB, CRM_INVITE_SECRET }, {
    name: "李女士",
    phone: "13800138000",
    inviteCode: "alpha-2026",
    inviteSignature: await createInviteSignature("alpha-2026", CRM_INVITE_SECRET),
    reservationId: 101,
  });
  const second = await recordCrmReservation({ DB, CRM_INVITE_SECRET }, {
    name: "李女士",
    phone: "13800138000",
    inviteCode: "bravo-2026",
    inviteSignature: await createInviteSignature("bravo-2026", CRM_INVITE_SECRET),
    reservationId: 102,
  });

  assert.deepEqual(first, { captured: true, customerId: 1, salesId: 1 });
  assert.deepEqual(second, { captured: true, customerId: 1, salesId: 1 });
  assert.equal(DB.customers.length, 1);
  assert.equal(DB.customers[0].sales_id, 1);
  assert.deepEqual(DB.consultations.map(({ source_sales_id, reservation_id }) => ({ source_sales_id, reservation_id })), [
    { source_sales_id: 1, reservation_id: 101 },
    { source_sales_id: 2, reservation_id: 102 },
  ]);
});

test("CRM sends unsigned, unknown or absent invite codes to the public pool", async () => {
  const DB = createCrmD1([{ id: 1, invite_code: "ALPHA2026", active: 1 }]);
  const result = await recordCrmReservation({ DB, CRM_INVITE_SECRET: "crm-invite-test-secret" }, {
    name: "王先生",
    phone: "13900139000",
    inviteCode: "ALPHA2026",
    inviteSignature: "not-a-valid-signature",
    reservationId: 103,
  });

  assert.deepEqual(result, { captured: true, customerId: 1, salesId: null });
  assert.equal(DB.customers[0].sales_id, null);
  assert.equal(DB.consultations[0].source_sales_id, null);
});

test("CRM migration contains sales isolation, ownership and audit structures", async () => {
  const migration = await readFile(new URL("../migrations/0002_create_sales_crm.sql", import.meta.url), "utf8");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_sales_accounts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_customers/);
  assert.match(migration, /ownership_locked_until/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_consultations/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_followups/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_audit_logs/);
});

test("password hashing stays within the Cloudflare Workers PBKDF2 limit", async () => {
  const source = await readFile(new URL("../worker/crm.js", import.meta.url), "utf8");
  const iterations = Number(source.match(/const PBKDF2_ITERATIONS = (\d+);/)?.[1]);

  assert.equal(iterations, 100000);
  assert.match(source, /iterations = PBKDF2_ITERATIONS/);
  assert.match(source, /`pbkdf2\$\$\{PBKDF2_ITERATIONS\}\$/);
});

function createCrmApiD1() {
  const sales = [];
  const followups = [];
  const customers = [
    { id: 1, name: "客户 A", phone: "13800138000", sales_id: 1, status: "new", last_consulted_at: "2026-09-18 10:00:00" },
    { id: 2, name: "客户 B", phone: "13900139000", sales_id: 2, status: "new", last_consulted_at: "2026-09-18 10:00:00" },
  ];
  return {
    sales,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async run() {
          if (sql.startsWith("INSERT INTO crm_sales_accounts")) {
            const account = { id: sales.length + 1, display_name: values[0], login_name: values[1], password_hash: values[2], invite_code: values[3], active: 1, created_at: "2026-09-18 10:00:00" };
            sales.push(account);
            return { success: true, meta: { last_row_id: account.id } };
          }
          if (sql.startsWith("UPDATE crm_customers SET status")) {
            const customer = customers.find((item) => item.id === values[1]);
            customer.status = values[0];
            return { success: true };
          }
          if (sql.startsWith("INSERT INTO crm_followups")) {
            followups.push({ id: followups.length + 1, customer_id: values[0], sales_id: values[1], status: values[2], note: values[3], created_at: "2026-09-21 18:30:00" });
            return { success: true };
          }
          if (sql.startsWith("INSERT INTO crm_audit_logs")) return { success: true };
          throw new Error(`Unexpected run query: ${sql}`);
        },
        async first() {
          if (sql.startsWith("SELECT id, display_name, login_name, invite_code, password_hash")) return sales.find((account) => account.login_name === values[0]) || null;
          if (sql.startsWith("SELECT id, display_name, login_name, invite_code, active FROM crm_sales_accounts WHERE id")) return sales.find((account) => account.id === values[0]) || null;
          if (sql.startsWith("SELECT id FROM crm_customers WHERE id = ? AND sales_id = ?")) return customers.find((customer) => customer.id === values[0] && customer.sales_id === values[1]) || null;
          throw new Error(`Unexpected first query: ${sql}`);
        },
        async all() {
          if (sql.startsWith("SELECT id FROM crm_sales_accounts LIMIT 1")) return { results: sales.slice(0, 1) };
          if (sql.startsWith("SELECT id, display_name, login_name, invite_code, active, invite_expires_at")) return { results: sales };
          if (sql.startsWith("SELECT c.id, c.name, c.phone")) {
            const visible = values.length ? customers.filter((customer) => customer.sales_id === values[0]) : customers;
            return { results: visible.map((customer) => {
              const latest = followups.filter((followup) => followup.customer_id === customer.id).at(-1);
              return { ...customer, sales_name: sales.find((account) => account.id === customer.sales_id)?.display_name || null, latest_note: latest?.note || null, last_followup_at: latest?.created_at || null };
            }) };
          }
          throw new Error(`Unexpected all query: ${sql}`);
        },
      };
    },
  };
}

test("sales API only returns the signed-in sales person's own customers", async () => {
  const DB = createCrmApiD1();
  const env = { DB, CRM_SESSION_SECRET: "crm-test-session-secret", CRM_INVITE_SECRET: "crm-invite-test-secret" };
  const isAdmin = async () => true;

  for (const [displayName, loginName, inviteCode] of [["销售 A", "sales-a", "ALPHA2026"], ["销售 B", "sales-b", "BRAVO2026"]]) {
    const response = await handleCrmApi(new Request("https://example.test/api/crm/admin/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, loginName, inviteCode, password: "a-long-test-password" }),
    }), env, isAdmin);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.sales.inviteUrl, /^https:\/\/cheuknangriverside\.com\/\?invite=/);
    assert.match(result.sales.inviteUrl, /&sig=[0-9a-f]{64}$/);
  }

  const login = await handleCrmApi(new Request("https://example.test/api/crm/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ loginName: "sales-a", password: "a-long-test-password" }),
  }), env, async () => false);
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];

  const ownLeads = await handleCrmApi(new Request("https://example.test/api/crm/leads", { headers: { cookie } }), env, async () => false);
  assert.equal(ownLeads.status, 200);
  assert.deepEqual((await ownLeads.json()).leads.map((lead) => lead.id), [1]);

  const followup = await handleCrmApi(new Request("https://example.test/api/crm/leads/1", {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ status: "contacted", note: "客户希望周末再次联系" }),
  }), env, async () => false);
  assert.equal(followup.status, 200);

  const refreshedLeads = await handleCrmApi(new Request("https://example.test/api/crm/leads", { headers: { cookie } }), env, async () => false);
  const [refreshedLead] = (await refreshedLeads.json()).leads;
  assert.equal(refreshedLead.status, "contacted");
  assert.equal(refreshedLead.latest_note, "客户希望周末再次联系");
  assert.equal(refreshedLead.last_followup_at, "2026-09-21 18:30:00");

  const otherLead = await handleCrmApi(new Request("https://example.test/api/crm/leads/2", {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ status: "contacted", note: "尝试越权修改" }),
  }), env, async () => false);
  assert.equal(otherLead.status, 404);
});
