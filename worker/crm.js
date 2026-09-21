const CRM_SALES_COOKIE = "crm_sales";
const CRM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const OWNERSHIP_LOCK_DAYS = 90;
const PUBLIC_SITE_ORIGIN = "https://cheuknangriverside.com";
const PBKDF2_ITERATIONS = 100000;
const SALES_LOGIN_PATTERN = /^1[3-9]\d{9}$/;
const CRM_STATUSES = new Set(["new", "contacted", "appointment", "visited", "intent", "closed", "invalid"]);
const textEncoder = new TextEncoder();

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) throw new Error("Invalid hex");
  return Uint8Array.from(hex.match(/.{2}/g), (part) => Number.parseInt(part, 16));
}

async function derivePasswordHash(password, salt, iterations = PBKDF2_ITERATIONS) {
  const material = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

async function createPasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${hash}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, iterations, salt, expected] = String(stored || "").split("$");
  if (algorithm !== "pbkdf2" || !Number.isSafeInteger(Number(iterations)) || !salt || !expected) return false;
  try {
    const actual = await derivePasswordHash(password, hexToBytes(salt), Number(iterations));
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function hmacSignature(message, secret) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

async function sessionSignature(salesId, expiresAt, secret) {
  return hmacSignature(`crm-sales:${salesId}:${expiresAt}`, secret);
}

export async function createInviteSignature(inviteCode, secret) {
  return hmacSignature(`crm-invite:${normalizeInviteCode(inviteCode)}`, secret);
}

async function isValidInviteSignature(inviteCode, signature, env) {
  if (!env.CRM_INVITE_SECRET || !/^[0-9a-f]{64}$/i.test(String(signature || ""))) return false;
  const expected = await createInviteSignature(inviteCode, env.CRM_INVITE_SECRET);
  return constantTimeEqual(String(signature), expected);
}

async function salesInviteUrl(request, inviteCode, env) {
  if (!env.CRM_INVITE_SECRET) return null;
  const url = new URL(env.PUBLIC_SITE_ORIGIN || PUBLIC_SITE_ORIGIN);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set("invite", inviteCode);
  url.searchParams.set("sig", await createInviteSignature(inviteCode, env.CRM_INVITE_SECRET));
  return url.toString();
}

async function createSalesSession(salesId, env) {
  if (!env.CRM_SESSION_SECRET) throw new Error("CRM_SESSION_SECRET is required");
  const expiresAt = Math.floor(Date.now() / 1000) + CRM_SESSION_MAX_AGE_SECONDS;
  const signature = await sessionSignature(salesId, expiresAt, env.CRM_SESSION_SECRET);
  return `${salesId}.${expiresAt}.${signature}`;
}

async function salesSession(request, env) {
  if (!env.CRM_SESSION_SECRET) return null;
  const authorization = request.headers.get("authorization") || "";
  const value = authorization.startsWith("Bearer ") ? authorization.slice(7) : getCookie(request, CRM_SALES_COOKIE);
  const [id, expiresAt, signature] = value.split(".");
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expiresAt) || !/^[0-9a-f]{64}$/i.test(signature)) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const expected = await sessionSignature(id, expiresAt, env.CRM_SESSION_SECRET);
  if (!constantTimeEqual(signature, expected)) return null;
  const sales = await env.DB.prepare("SELECT id, display_name, login_name, invite_code, active FROM crm_sales_accounts WHERE id = ?").bind(Number(id)).first();
  return sales?.active ? sales : null;
}

function normalizeInviteCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizePhone(value) {
  return String(value || "").replace(/[\s-]/g, "").replace(/^\+?86/, "");
}

function validText(value, minimum, maximum) {
  const text = String(value || "").trim();
  return text.length >= minimum && text.length <= maximum && !/[\u0000-\u001f\u007f]/.test(text) ? text : "";
}

async function crmSchemaReady(env) {
  try {
    await env.DB.prepare("SELECT id FROM crm_sales_accounts LIMIT 1").all();
    return true;
  } catch {
    return false;
  }
}

async function activeSalesForInvite(env, inviteCode) {
  if (!inviteCode) return null;
  return env.DB.prepare("SELECT id, invite_code FROM crm_sales_accounts WHERE invite_code = ? AND active = 1 AND (invite_expires_at IS NULL OR invite_expires_at > datetime('now'))")
    .bind(inviteCode)
    .first();
}

async function audit(env, entry) {
  await env.DB.prepare("INSERT INTO crm_audit_logs (actor_type, actor_id, action, customer_id, from_sales_id, to_sales_id, reason) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(entry.actorType, entry.actorId || null, entry.action, entry.customerId || null, entry.fromSalesId || null, entry.toSalesId || null, entry.reason || null)
    .run();
}

export async function recordCrmReservation(env, { name, phone, inviteCode, inviteSignature, reservationId }) {
  if (!env.DB || !(await crmSchemaReady(env))) return { captured: false, reason: "schema_unavailable" };
  const normalizedPhone = normalizePhone(phone);
  const sourceCode = normalizeInviteCode(inviteCode);
  const sourceSales = (await isValidInviteSignature(sourceCode, inviteSignature, env)) ? await activeSalesForInvite(env, sourceCode) : null;
  let customer = await env.DB.prepare("SELECT id, sales_id FROM crm_customers WHERE phone = ?").bind(normalizedPhone).first();

  if (!customer) {
    const result = await env.DB.prepare("INSERT INTO crm_customers (name, phone, sales_id, first_assigned_at, ownership_locked_until) VALUES (?, ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', '+8 hours') END, CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', '+8 hours', '+90 days') END)")
      .bind(name, normalizedPhone, sourceSales?.id || null, sourceSales?.id || null, sourceSales?.id || null)
      .run();
    customer = { id: result.meta?.last_row_id, sales_id: sourceSales?.id || null };
    await audit(env, {
      actorType: "system",
      action: sourceSales ? "customer_assigned_from_invite" : "customer_created_in_public_pool",
      customerId: customer.id,
      toSalesId: sourceSales?.id,
      reason: sourceCode || "no_invite_code",
    });
  } else {
    await env.DB.prepare("UPDATE crm_customers SET name = ?, last_consulted_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE id = ?")
      .bind(name, customer.id)
      .run();
  }

  await env.DB.prepare("INSERT INTO crm_consultations (customer_id, reservation_id, source_sales_id, invite_code) VALUES (?, ?, ?, ?)")
    .bind(customer.id, reservationId || null, sourceSales?.id || null, sourceCode || null)
    .run();

  return { captured: true, customerId: customer.id, salesId: customer.sales_id || null };
}

async function requireCrmSchema(env) {
  return crmSchemaReady(env) ? null : json({ ok: false, message: "CRM 数据库尚未升级，请先执行 CRM 数据迁移。" }, 503);
}

async function listLeads(env, salesId = null) {
  const condition = salesId ? "WHERE c.sales_id = ?" : "";
  const statement = env.DB.prepare(`SELECT c.id, c.name, c.phone, c.status, c.sales_id, c.first_assigned_at, c.ownership_locked_until, c.last_consulted_at, c.created_at, s.display_name AS sales_name, (SELECT f.note FROM crm_followups f WHERE f.customer_id = c.id ORDER BY f.id DESC LIMIT 1) AS latest_note, (SELECT f.created_at FROM crm_followups f WHERE f.customer_id = c.id ORDER BY f.id DESC LIMIT 1) AS last_followup_at FROM crm_customers c LEFT JOIN crm_sales_accounts s ON c.sales_id = s.id ${condition} ORDER BY c.last_consulted_at DESC LIMIT 1000`);
  const records = salesId ? await statement.bind(salesId).all() : await statement.all();
  return records.results || [];
}

async function updateLeadForSales(env, sales, customerId, body) {
  const status = String(body.status || "");
  const note = validText(body.note, 1, 1000);
  if (!CRM_STATUSES.has(status) || !note) return json({ ok: false, message: "请填写有效的跟进状态和1至1000字备注。" }, 400);
  const customer = await env.DB.prepare("SELECT id FROM crm_customers WHERE id = ? AND sales_id = ?").bind(customerId, sales.id).first();
  if (!customer) return json({ ok: false, message: "无权查看或修改该客户。" }, 404);
  await env.DB.prepare("UPDATE crm_customers SET status = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(status, customer.id).run();
  await env.DB.prepare("INSERT INTO crm_followups (customer_id, sales_id, status, note) VALUES (?, ?, ?, ?)").bind(customer.id, sales.id, status, note).run();
  await audit(env, { actorType: "sales", actorId: sales.id, action: "lead_followed_up", customerId: customer.id, reason: status });
  return json({ ok: true });
}

async function adminCreateSales(request, env, body) {
  const displayName = validText(body.displayName, 2, 30);
  const loginName = normalizePhone(String(body.loginName || ""));
  const password = String(body.password || "");
  const inviteCode = normalizeInviteCode(body.inviteCode) || generateInviteCode();
  if (!displayName || !SALES_LOGIN_PATTERN.test(loginName) || password.length < 10 || password.length > 128) {
    return json({ ok: false, message: "请填写销售姓名、正确的11位登录手机号和至少10位密码。" }, 400);
  }
  try {
    const passwordHash = await createPasswordHash(password);
    const result = await env.DB.prepare("INSERT INTO crm_sales_accounts (display_name, login_name, password_hash, invite_code) VALUES (?, ?, ?, ?)")
      .bind(displayName, loginName, passwordHash, inviteCode)
      .run();
    await audit(env, { actorType: "admin", action: "sales_account_created", toSalesId: result.meta?.last_row_id, reason: inviteCode });
    return json({ ok: true, sales: { id: result.meta?.last_row_id, displayName, loginName, inviteCode, inviteUrl: await salesInviteUrl(request, inviteCode, env), active: true } }, 201);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message)) return json({ ok: false, message: "登录名或邀请码已存在。" }, 409);
    throw error;
  }
}

async function adminAssignLead(env, customerId, body) {
  const salesId = Number(body.salesId);
  const reason = validText(body.reason, 1, 500);
  if (!Number.isSafeInteger(salesId) || salesId < 1 || !reason) return json({ ok: false, message: "请选择销售并填写调整原因。" }, 400);
  const [customer, target] = await Promise.all([
    env.DB.prepare("SELECT id, sales_id FROM crm_customers WHERE id = ?").bind(customerId).first(),
    env.DB.prepare("SELECT id FROM crm_sales_accounts WHERE id = ? AND active = 1").bind(salesId).first(),
  ]);
  if (!customer || !target) return json({ ok: false, message: "客户或目标销售不存在。" }, 404);
  await env.DB.prepare("UPDATE crm_customers SET sales_id = ?, first_assigned_at = COALESCE(first_assigned_at, datetime('now', '+8 hours')), ownership_locked_until = datetime('now', '+8 hours', '+90 days'), updated_at = datetime('now', '+8 hours') WHERE id = ?")
    .bind(salesId, customer.id)
    .run();
  await audit(env, { actorType: "admin", action: "lead_assigned_or_transferred", customerId: customer.id, fromSalesId: customer.sales_id, toSalesId: salesId, reason });
  return json({ ok: true });
}

export async function handleCrmApi(request, env, isAdmin) {
  const unavailable = await requireCrmSchema(env);
  if (unavailable) return unavailable;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/crm\/?/, "");

  if (path === "login" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    const loginName = validText(body.loginName, 3, 48).toLowerCase();
    const password = String(body.password || "");
    const sales = await env.DB.prepare("SELECT id, display_name, login_name, invite_code, password_hash, active FROM crm_sales_accounts WHERE login_name = ?").bind(loginName).first();
    if (!sales?.active || !(await verifyPassword(password, sales.password_hash))) return json({ ok: false, message: "登录名或密码不正确。" }, 401);
    const session = await createSalesSession(sales.id, env);
    return json({ ok: true, token: session, sales: { id: sales.id, displayName: sales.display_name, inviteCode: sales.invite_code, inviteUrl: await salesInviteUrl(request, sales.invite_code, env) } }, 200, {
      "set-cookie": `${CRM_SALES_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${CRM_SESSION_MAX_AGE_SECONDS}`,
    });
  }

  if (path === "logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${CRM_SALES_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (path.startsWith("admin/")) {
    if (!(await isAdmin(request, env))) return json({ ok: false, message: "请先输入管理员密码。" }, 401);
    if (path === "admin/sales" && request.method === "GET") {
      const result = await env.DB.prepare("SELECT id, display_name, login_name, invite_code, active, invite_expires_at, created_at FROM crm_sales_accounts ORDER BY id ASC").all();
      const sales = await Promise.all((result.results || []).map(async (person) => ({ ...person, invite_url: await salesInviteUrl(request, person.invite_code, env) })));
      return json({ ok: true, sales });
    }
    if (path === "admin/sales" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return adminCreateSales(request, env, body);
    }
    if (path === "admin/leads" && request.method === "GET") return json({ ok: true, leads: await listLeads(env) });
    const assignMatch = path.match(/^admin\/leads\/(\d+)\/assign$/);
    if (assignMatch && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return adminAssignLead(env, Number(assignMatch[1]), body);
    }
    return json({ ok: false, message: "Not found" }, 404);
  }

  const sales = await salesSession(request, env);
  if (!sales) return json({ ok: false, message: "请先登录销售后台。" }, 401);
  if (path === "me" && request.method === "GET") return json({ ok: true, sales: { id: sales.id, displayName: sales.display_name, inviteCode: sales.invite_code, inviteUrl: await salesInviteUrl(request, sales.invite_code, env) } });
  if (path === "leads" && request.method === "GET") return json({ ok: true, leads: await listLeads(env, sales.id) });
  const leadMatch = path.match(/^leads\/(\d+)$/);
  if (leadMatch && request.method === "PATCH") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    return updateLeadForSales(env, sales, Number(leadMatch[1]), body);
  }
  return json({ ok: false, message: "Not found" }, 404);
}
