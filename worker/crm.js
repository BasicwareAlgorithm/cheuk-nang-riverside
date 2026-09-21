const CRM_SALES_COOKIE = "crm_sales";
const CRM_ADMIN_COOKIE = "crm_admin";
const CRM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const OWNERSHIP_LOCK_DAYS = 90;
const PUBLIC_SITE_ORIGIN = "https://cheuknangriverside.com";
const PBKDF2_ITERATIONS = 100000;
const SALES_LOGIN_PATTERN = /^1[3-9]\d{9}$/;
const CRM_STATUSES = new Set(["new", "contacted", "appointment", "visited", "intent", "closed", "invalid"]);
const ADMIN_ROLES = new Set(["super_admin", "operator", "viewer"]);
const ROLE_PERMISSIONS = {
  super_admin: new Set(["read", "sales_manage", "admin_manage", "lead_assign", "lead_merge", "import", "export_full", "audit"]),
  operator: new Set(["read", "lead_assign", "import", "export_masked"]),
  viewer: new Set(["read"]),
};
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

async function sessionSignature(kind, accountId, expiresAt, secret) {
  return hmacSignature(`crm-${kind}:${accountId}:${expiresAt}`, secret);
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
  const signature = await sessionSignature("sales", salesId, expiresAt, env.CRM_SESSION_SECRET);
  return `${salesId}.${expiresAt}.${signature}`;
}

async function createAdminSession(adminId, env) {
  if (!env.CRM_SESSION_SECRET) throw new Error("CRM_SESSION_SECRET is required");
  const expiresAt = Math.floor(Date.now() / 1000) + CRM_SESSION_MAX_AGE_SECONDS;
  const signature = await sessionSignature("admin", adminId, expiresAt, env.CRM_SESSION_SECRET);
  return `${adminId}.${expiresAt}.${signature}`;
}

function sessionValue(request, cookieName) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : getCookie(request, cookieName);
}

async function salesSession(request, env) {
  if (!env.CRM_SESSION_SECRET) return null;
  const value = sessionValue(request, CRM_SALES_COOKIE);
  const [id, expiresAt, signature] = value.split(".");
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expiresAt) || !/^[0-9a-f]{64}$/i.test(signature)) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const expected = await sessionSignature("sales", id, expiresAt, env.CRM_SESSION_SECRET);
  if (!constantTimeEqual(signature, expected)) return null;
  const sales = await env.DB.prepare("SELECT id, display_name, login_name, invite_code, active, must_change_password FROM crm_sales_accounts WHERE id = ?").bind(Number(id)).first();
  return sales?.active ? sales : null;
}

async function adminSession(request, env) {
  if (!env.CRM_SESSION_SECRET) return null;
  const value = sessionValue(request, CRM_ADMIN_COOKIE);
  const [id, expiresAt, signature] = value.split(".");
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expiresAt) || !/^[0-9a-f]{64}$/i.test(signature)) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const expected = await sessionSignature("admin", id, expiresAt, env.CRM_SESSION_SECRET);
  if (!constantTimeEqual(signature, expected)) return null;
  const admin = await env.DB.prepare("SELECT id, display_name, login_phone, role, active, must_change_password FROM crm_admin_accounts WHERE id = ?").bind(Number(id)).first();
  return admin?.active ? admin : null;
}

function permissionsFor(admin) {
  return Array.from(ROLE_PERMISSIONS[admin?.role] || []);
}

function can(admin, permission) {
  return ROLE_PERMISSIONS[admin?.role]?.has(permission) || false;
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

function normalizeDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return undefined;
  const normalized = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6] || "00"}`;
  return Number.isNaN(Date.parse(normalized.replace(" ", "T") + "+08:00")) ? undefined : normalized;
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
  await env.DB.prepare("INSERT INTO crm_audit_logs (actor_type, actor_id, action, customer_id, from_sales_id, to_sales_id, reason, actor_admin_id, request_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(entry.actorType, entry.actorId || null, entry.action, entry.customerId || null, entry.fromSalesId || null, entry.toSalesId || null, entry.reason || null, entry.actorAdminId || null, entry.requestId || crypto.randomUUID(), entry.metadata ? JSON.stringify(entry.metadata) : null)
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

function requestedPageSize(url) {
  return Math.min(Math.max(Number.parseInt(url.searchParams.get("page_size") || "50", 10) || 50, 1), 100);
}

function maskPhone(phone) {
  const value = String(phone || "");
  return value.length === 11 ? `${value.slice(0, 3)}****${value.slice(-4)}` : value;
}

async function listSales(env, url) {
  const pageSize = requestedPageSize(url);
  const cursor = Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0;
  const q = validText(url.searchParams.get("q"), 1, 60);
  const active = url.searchParams.get("active");
  const conditions = [];
  const params = [];
  if (cursor > 0) { conditions.push("id < ?"); params.push(cursor); }
  if (q) { conditions.push("(display_name LIKE ? OR login_name LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  if (active === "1" || active === "0") { conditions.push("active = ?"); params.push(Number(active)); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await env.DB.prepare(`SELECT id, display_name, login_name, invite_code, active, invite_expires_at, disabled_at, disabled_reason, password_reset_at, last_login_at, must_change_password, created_at FROM crm_sales_accounts ${where} ORDER BY id DESC LIMIT ?`)
    .bind(...params, pageSize + 1).all();
  const items = result.results || [];
  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();
  const countConditions = conditions.filter((condition) => condition !== "id < ?");
  const countParams = cursor > 0 ? params.slice(1) : params;
  const countWhere = countConditions.length ? `WHERE ${countConditions.join(" AND ")}` : "";
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM crm_sales_accounts ${countWhere}`).bind(...countParams).first();
  return { items, hasMore, nextCursor: hasMore ? String(items.at(-1)?.id || "") : null, total: Number(count?.total || 0) };
}

async function listLeads(env, { salesId = null, url, revealPhone = true } = {}) {
  const pageSize = requestedPageSize(url);
  const cursor = Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0;
  const q = validText(url.searchParams.get("q"), 1, 80);
  const status = url.searchParams.get("status");
  const reminder = url.searchParams.get("reminder");
  const filterSalesId = Number.parseInt(url.searchParams.get("sales_id") || "0", 10) || 0;
  const baseConditions = ["c.merged_into_customer_id IS NULL"];
  const baseParams = [];
  if (salesId) { baseConditions.push("c.sales_id = ?"); baseParams.push(salesId); }
  else if (filterSalesId > 0) { baseConditions.push("c.sales_id = ?"); baseParams.push(filterSalesId); }
  if (q) { baseConditions.push("(c.name LIKE ? OR c.phone LIKE ?)"); baseParams.push(`%${q}%`, `%${q}%`); }
  if (CRM_STATUSES.has(status)) { baseConditions.push("c.status = ?"); baseParams.push(status); }
  if (reminder === "overdue") baseConditions.push("c.reminder_state = 'pending' AND c.next_followup_at < datetime('now', '+8 hours')");
  if (reminder === "today") baseConditions.push("c.reminder_state = 'pending' AND date(c.next_followup_at) = date('now', '+8 hours')");
  if (reminder === "week") baseConditions.push("c.reminder_state = 'pending' AND c.next_followup_at >= datetime('now', '+8 hours') AND c.next_followup_at <= datetime('now', '+8 hours', '+7 days')");
  if (reminder === "none") baseConditions.push("c.next_followup_at IS NULL");
  const pageConditions = [...baseConditions];
  const pageParams = [...baseParams];
  if (cursor > 0) { pageConditions.push("c.id < ?"); pageParams.push(cursor); }
  const where = `WHERE ${pageConditions.join(" AND ")}`;
  const result = await env.DB.prepare(`SELECT c.id, c.name, c.phone, c.status, c.sales_id, c.first_assigned_at, c.ownership_locked_until, c.last_consulted_at, c.next_followup_at, c.reminder_state, c.created_at, s.display_name AS sales_name, (SELECT f.note FROM crm_followups f WHERE f.customer_id = c.id ORDER BY f.id DESC LIMIT 1) AS latest_note, (SELECT f.created_at FROM crm_followups f WHERE f.customer_id = c.id ORDER BY f.id DESC LIMIT 1) AS last_followup_at FROM crm_customers c LEFT JOIN crm_sales_accounts s ON c.sales_id = s.id ${where} ORDER BY c.id DESC LIMIT ?`)
    .bind(...pageParams, pageSize + 1).all();
  const items = (result.results || []).map((item) => revealPhone ? item : { ...item, phone: maskPhone(item.phone) });
  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM crm_customers c WHERE ${baseConditions.join(" AND ")}`).bind(...baseParams).first();
  return { items, hasMore, nextCursor: hasMore ? String(items.at(-1)?.id || "") : null, total: Number(count?.total || 0) };
}

async function updateLeadForSales(env, sales, customerId, body) {
  const status = String(body.status || "");
  const note = validText(body.note, 1, 1000);
  const nextFollowupAt = normalizeDateTime(body.nextFollowupAt);
  if (!CRM_STATUSES.has(status) || !note || nextFollowupAt === undefined) return json({ ok: false, message: "请填写有效的跟进状态、1至1000字备注和正确的下次跟进时间。" }, 400);
  const customer = await env.DB.prepare("SELECT id FROM crm_customers WHERE id = ? AND sales_id = ?").bind(customerId, sales.id).first();
  if (!customer) return json({ ok: false, message: "无权查看或修改该客户。" }, 404);
  await env.DB.prepare("UPDATE crm_customers SET status = ?, next_followup_at = ?, reminder_state = CASE WHEN ? IS NULL THEN 'done' ELSE 'pending' END, updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(status, nextFollowupAt, nextFollowupAt, customer.id).run();
  await env.DB.prepare("INSERT INTO crm_followups (customer_id, sales_id, status, note, next_followup_at) VALUES (?, ?, ?, ?, ?)").bind(customer.id, sales.id, status, note, nextFollowupAt).run();
  await audit(env, { actorType: "sales", actorId: sales.id, action: "lead_followed_up", customerId: customer.id, reason: status });
  return json({ ok: true });
}

async function listFollowups(env, customerId, cursor = 0, pageSize = 20) {
  const conditions = ["f.customer_id = ?"];
  const params = [customerId];
  if (cursor > 0) { conditions.push("f.id < ?"); params.push(cursor); }
  const result = await env.DB.prepare(`SELECT f.id, f.customer_id, f.sales_id, f.status, f.note, f.next_followup_at, f.created_at, s.display_name AS sales_name FROM crm_followups f LEFT JOIN crm_sales_accounts s ON f.sales_id = s.id WHERE ${conditions.join(" AND ")} ORDER BY f.id DESC LIMIT ?`)
    .bind(...params, Math.min(pageSize, 50) + 1).all();
  const items = result.results || [];
  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();
  return { items, hasMore, nextCursor: hasMore ? String(items.at(-1)?.id || "") : null };
}

function adminPublicRecord(admin) {
  return {
    id: admin.id,
    displayName: admin.display_name,
    loginPhone: admin.login_phone,
    role: admin.role,
    active: Boolean(admin.active),
    mustChangePassword: Boolean(admin.must_change_password),
    permissions: permissionsFor(admin),
  };
}

async function adminBootstrapStatus(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM crm_admin_accounts").first();
  return Number(row?.total || 0) === 0;
}

async function ensureDefaultAdmin(env) {
  if (!(await adminBootstrapStatus(env)) || !env.ADMIN_PASSWORD) return false;
  const result = await env.DB.prepare("INSERT INTO crm_admin_accounts (display_name, login_phone, password_hash, role) VALUES ('超级管理员', 'admin', ?, 'super_admin')")
    .bind(await createPasswordHash(env.ADMIN_PASSWORD)).run();
  await audit(env, { actorType: "system", action: "admin_bootstrapped", actorAdminId: result.meta?.last_row_id, reason: "automatic_worker_secret" });
  return true;
}

async function bootstrapAdmin(request, env, isBootstrapAdmin, body) {
  if (!(await adminBootstrapStatus(env))) return json({ ok: false, message: "具名管理员已经初始化。" }, 409);
  if (!(await isBootstrapAdmin(request, env))) return json({ ok: false, message: "初始化凭证不正确。" }, 401);
  const displayName = validText(body.displayName, 2, 30);
  const loginPhone = normalizePhone(body.loginPhone);
  const password = String(body.password || "");
  if (!displayName || !SALES_LOGIN_PATTERN.test(loginPhone) || password.length < 10 || password.length > 128) {
    return json({ ok: false, message: "请填写管理员姓名、正确手机号和至少10位密码。" }, 400);
  }
  const passwordHash = await createPasswordHash(password);
  const result = await env.DB.prepare("INSERT INTO crm_admin_accounts (display_name, login_phone, password_hash, role) VALUES (?, ?, ?, 'super_admin')")
    .bind(displayName, loginPhone, passwordHash).run();
  await audit(env, { actorType: "system", action: "admin_bootstrapped", actorAdminId: result.meta?.last_row_id, reason: "first_super_admin" });
  return json({ ok: true }, 201);
}

async function loginAdmin(request, env, body, isBootstrapAdmin) {
  const rawLogin = String(body.loginName || body.loginPhone || "").trim().toLowerCase();
  const loginPhone = rawLogin === "admin" ? "admin" : normalizePhone(rawLogin);
  const password = String(body.password || "");
  if (await adminBootstrapStatus(env)) {
    if (loginPhone !== "admin" || !(await isBootstrapAdmin(request, env))) return json({ ok: false, message: "管理员账号或密码不正确。" }, 401);
    const result = await env.DB.prepare("INSERT INTO crm_admin_accounts (display_name, login_phone, password_hash, role) VALUES ('超级管理员', 'admin', ?, 'super_admin')")
      .bind(await createPasswordHash(password)).run();
    await audit(env, { actorType: "system", action: "admin_bootstrapped", actorAdminId: result.meta?.last_row_id, reason: "automatic_admin_login" });
  }
  const admin = await env.DB.prepare("SELECT id, display_name, login_phone, password_hash, role, active, must_change_password FROM crm_admin_accounts WHERE login_phone = ?").bind(loginPhone).first();
  if (!admin?.active || !(await verifyPassword(password, admin.password_hash))) return json({ ok: false, message: "管理员手机号或密码不正确。" }, 401);
  await env.DB.prepare("UPDATE crm_admin_accounts SET last_login_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(admin.id).run();
  const token = await createAdminSession(admin.id, env);
  return json({ ok: true, token, admin: adminPublicRecord(admin) }, 200, {
    "set-cookie": `${CRM_ADMIN_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${CRM_SESSION_MAX_AGE_SECONDS}`,
  });
}

async function createAdminAccount(env, actor, body) {
  if (!can(actor, "admin_manage")) return json({ ok: false, message: "无权管理管理员账号。" }, 403);
  const displayName = validText(body.displayName, 2, 30);
  const loginPhone = normalizePhone(body.loginPhone);
  const role = String(body.role || "viewer");
  const password = String(body.password || "");
  if (!displayName || !SALES_LOGIN_PATTERN.test(loginPhone) || !ADMIN_ROLES.has(role) || password.length < 10 || password.length > 128) {
    return json({ ok: false, message: "请填写有效的管理员姓名、手机号、角色和至少10位密码。" }, 400);
  }
  try {
    const result = await env.DB.prepare("INSERT INTO crm_admin_accounts (display_name, login_phone, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)")
      .bind(displayName, loginPhone, await createPasswordHash(password), role).run();
    await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "admin_account_created", reason: role, metadata: { adminId: result.meta?.last_row_id, loginPhone } });
    return json({ ok: true }, 201);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message)) return json({ ok: false, message: "管理员手机号已存在。" }, 409);
    throw error;
  }
}

async function changeAdminPassword(env, admin, body) {
  const currentPassword = String(body.currentPassword || "");
  const nextPassword = String(body.nextPassword || "");
  const row = await env.DB.prepare("SELECT password_hash FROM crm_admin_accounts WHERE id = ?").bind(admin.id).first();
  if (!(await verifyPassword(currentPassword, row?.password_hash || ""))) return json({ ok: false, message: "当前密码不正确。" }, 401);
  if (nextPassword.length < 10 || nextPassword.length > 128) return json({ ok: false, message: "新密码至少10位。" }, 400);
  await env.DB.prepare("UPDATE crm_admin_accounts SET password_hash = ?, must_change_password = 0, updated_at = datetime('now', '+8 hours') WHERE id = ?")
    .bind(await createPasswordHash(nextPassword), admin.id).run();
  await audit(env, { actorType: "admin", actorAdminId: admin.id, action: "admin_password_changed" });
  return json({ ok: true });
}

async function adminCreateSales(request, env, body, actor) {
  if (actor && !can(actor, "sales_manage")) return json({ ok: false, message: "无权创建销售账号。" }, 403);
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
    await audit(env, { actorType: "admin", actorAdminId: actor?.id, action: "sales_account_created", toSalesId: result.meta?.last_row_id, reason: inviteCode });
    return json({ ok: true, sales: { id: result.meta?.last_row_id, displayName, loginName, inviteCode, inviteUrl: await salesInviteUrl(request, inviteCode, env), active: true } }, 201);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message)) return json({ ok: false, message: "登录名或邀请码已存在。" }, 409);
    throw error;
  }
}

async function updateSalesStatus(env, actor, salesId, body) {
  if (!can(actor, "sales_manage")) return json({ ok: false, message: "无权修改销售账号。" }, 403);
  const active = body.active === true ? 1 : body.active === false ? 0 : null;
  const reason = validText(body.reason, 2, 300);
  if (active === null || !reason) return json({ ok: false, message: "请填写停用或恢复原因。" }, 400);
  const sales = await env.DB.prepare("SELECT id, active FROM crm_sales_accounts WHERE id = ?").bind(salesId).first();
  if (!sales) return json({ ok: false, message: "销售账号不存在。" }, 404);
  await env.DB.prepare("UPDATE crm_sales_accounts SET active = ?, disabled_at = CASE WHEN ? = 0 THEN datetime('now', '+8 hours') ELSE NULL END, disabled_reason = CASE WHEN ? = 0 THEN ? ELSE NULL END, updated_at = datetime('now', '+8 hours') WHERE id = ?")
    .bind(active, active, active, reason, salesId).run();
  await audit(env, { actorType: "admin", actorAdminId: actor.id, action: active ? "sales_account_reactivated" : "sales_account_disabled", toSalesId: salesId, reason });
  return json({ ok: true });
}

async function updateSalesPhone(env, actor, salesId, body) {
  if (!can(actor, "sales_manage")) return json({ ok: false, message: "无权修改销售账号。" }, 403);
  const loginPhone = normalizePhone(body.loginPhone);
  const reason = validText(body.reason, 2, 300);
  if (!SALES_LOGIN_PATTERN.test(loginPhone) || !reason) return json({ ok: false, message: "请填写正确手机号和修改原因。" }, 400);
  try {
    await env.DB.prepare("UPDATE crm_sales_accounts SET login_name = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(loginPhone, salesId).run();
    await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "sales_login_phone_changed", toSalesId: salesId, reason, metadata: { loginPhone } });
    return json({ ok: true });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message)) return json({ ok: false, message: "该手机号已被其他销售使用。" }, 409);
    throw error;
  }
}

async function resetSalesPassword(env, actor, salesId, body) {
  if (!can(actor, "sales_manage")) return json({ ok: false, message: "无权重置销售密码。" }, 403);
  const password = String(body.password || "");
  const reason = validText(body.reason, 2, 300);
  if (password.length < 10 || password.length > 128 || !reason) return json({ ok: false, message: "请填写至少10位临时密码和重置原因。" }, 400);
  await env.DB.prepare("UPDATE crm_sales_accounts SET password_hash = ?, must_change_password = 1, password_reset_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE id = ?")
    .bind(await createPasswordHash(password), salesId).run();
  await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "sales_password_reset", toSalesId: salesId, reason });
  return json({ ok: true });
}

async function changeSalesPassword(env, sales, body) {
  const currentPassword = String(body.currentPassword || "");
  const nextPassword = String(body.nextPassword || "");
  const row = await env.DB.prepare("SELECT password_hash FROM crm_sales_accounts WHERE id = ?").bind(sales.id).first();
  if (!(await verifyPassword(currentPassword, row?.password_hash || ""))) return json({ ok: false, message: "当前密码不正确。" }, 401);
  if (nextPassword.length < 10 || nextPassword.length > 128) return json({ ok: false, message: "新密码至少10位。" }, 400);
  await env.DB.prepare("UPDATE crm_sales_accounts SET password_hash = ?, must_change_password = 0, updated_at = datetime('now', '+8 hours') WHERE id = ?")
    .bind(await createPasswordHash(nextPassword), sales.id).run();
  await audit(env, { actorType: "sales", actorId: sales.id, action: "sales_password_changed" });
  return json({ ok: true });
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

async function batchAssignLeads(env, actor, body) {
  if (!can(actor, "lead_assign")) return json({ ok: false, message: "无权批量分配客户。" }, 403);
  const customerIds = Array.from(new Set((body.customerIds || []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))).slice(0, 500);
  const salesId = Number(body.salesId);
  const reason = validText(body.reason, 2, 500);
  if (!customerIds.length || !Number.isSafeInteger(salesId) || !reason) return json({ ok: false, message: "请选择客户、目标销售并填写原因。" }, 400);
  const target = await env.DB.prepare("SELECT id FROM crm_sales_accounts WHERE id = ? AND active = 1").bind(salesId).first();
  if (!target) return json({ ok: false, message: "目标销售不存在或已停用。" }, 404);
  const statements = customerIds.map((customerId) => env.DB.prepare("UPDATE crm_customers SET sales_id = ?, first_assigned_at = COALESCE(first_assigned_at, datetime('now', '+8 hours')), ownership_locked_until = datetime('now', '+8 hours', '+90 days'), updated_at = datetime('now', '+8 hours') WHERE id = ? AND merged_into_customer_id IS NULL").bind(salesId, customerId));
  await env.DB.batch(statements);
  const requestId = crypto.randomUUID();
  for (const customerId of customerIds) await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "leads_batch_assigned", customerId, toSalesId: salesId, reason, requestId });
  return json({ ok: true, updated: customerIds.length, requestId });
}

async function validateImportRows(env, rows) {
  const output = [];
  for (let index = 0; index < rows.length; index += 1) {
    const source = rows[index] || {};
    const name = validText(source.name, 2, 30);
    const phone = normalizePhone(source.phone);
    const status = CRM_STATUSES.has(source.status) ? source.status : "new";
    const nextFollowupAt = normalizeDateTime(source.nextFollowupAt);
    const note = source.note ? validText(source.note, 1, 1000) : "";
    const salesPhone = normalizePhone(source.salesLoginPhone);
    const errors = [];
    if (!name) errors.push("客户姓名无效");
    if (!SALES_LOGIN_PATTERN.test(phone)) errors.push("客户手机号无效");
    if (nextFollowupAt === undefined) errors.push("下次跟进时间无效");
    if (source.note && !note) errors.push("备注超出限制");
    let sales = null;
    if (salesPhone) {
      sales = await env.DB.prepare("SELECT id FROM crm_sales_accounts WHERE login_name = ? AND active = 1").bind(salesPhone).first();
      if (!sales) errors.push("销售手机号不存在或已停用");
    }
    const existing = SALES_LOGIN_PATTERN.test(phone) ? await env.DB.prepare("SELECT id FROM crm_customers WHERE phone = ? AND merged_into_customer_id IS NULL").bind(phone).first() : null;
    output.push({ index: index + 1, name, phone, status, note, nextFollowupAt, salesId: sales?.id || null, action: existing ? "skip" : errors.length ? "error" : "insert", errors: existing ? ["手机号已存在，按规则跳过"] : errors });
  }
  return output;
}

async function importCustomers(env, actor, body) {
  if (!can(actor, "import")) return json({ ok: false, message: "无权导入客户。" }, 403);
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
  if (!rows.length) return json({ ok: false, message: "导入文件没有有效数据。" }, 400);
  const preview = await validateImportRows(env, rows);
  const summary = {
    total: preview.length,
    insert: preview.filter((row) => row.action === "insert").length,
    skip: preview.filter((row) => row.action === "skip").length,
    error: preview.filter((row) => row.action === "error").length,
  };
  if (body.mode !== "commit") return json({ ok: true, preview, summary });
  let imported = 0;
  for (const row of preview.filter((item) => item.action === "insert")) {
    const result = await env.DB.prepare("INSERT INTO crm_customers (name, phone, sales_id, status, first_assigned_at, ownership_locked_until, next_followup_at, reminder_state) VALUES (?, ?, ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', '+8 hours') END, CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', '+8 hours', '+90 days') END, ?, CASE WHEN ? IS NULL THEN 'done' ELSE 'pending' END)")
      .bind(row.name, row.phone, row.salesId, row.status, row.salesId, row.salesId, row.nextFollowupAt, row.nextFollowupAt).run();
    if (row.note && row.salesId) await env.DB.prepare("INSERT INTO crm_followups (customer_id, sales_id, status, note, next_followup_at) VALUES (?, ?, ?, ?, ?)").bind(result.meta?.last_row_id, row.salesId, row.status, row.note, row.nextFollowupAt).run();
    imported += 1;
  }
  const batch = await env.DB.prepare("INSERT INTO crm_import_batches (actor_admin_id, filename, total_rows, imported_rows, skipped_rows, error_rows, status, result_json) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)")
    .bind(actor.id, validText(body.filename, 1, 200) || null, summary.total, imported, summary.skip, summary.error, JSON.stringify(summary)).run();
  await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "customers_csv_imported", reason: body.filename || "csv", metadata: { batchId: batch.meta?.last_row_id, ...summary, imported } });
  return json({ ok: true, batchId: batch.meta?.last_row_id, imported, preview, summary });
}

async function mergeCustomers(env, actor, body) {
  if (!can(actor, "lead_merge")) return json({ ok: false, message: "无权合并客户。" }, 403);
  const masterId = Number(body.masterId);
  const duplicateIds = Array.from(new Set((body.duplicateIds || []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0 && id !== masterId))).slice(0, 20);
  const reason = validText(body.reason, 2, 500);
  if (!Number.isSafeInteger(masterId) || !duplicateIds.length || !reason) return json({ ok: false, message: "请选择主客户、重复客户并填写原因。" }, 400);
  const master = await env.DB.prepare("SELECT id, phone FROM crm_customers WHERE id = ? AND merged_into_customer_id IS NULL").bind(masterId).first();
  if (!master) return json({ ok: false, message: "主客户不存在。" }, 404);
  const duplicates = [];
  for (const duplicateId of duplicateIds) {
    const duplicate = await env.DB.prepare("SELECT id, phone FROM crm_customers WHERE id = ? AND merged_into_customer_id IS NULL").bind(duplicateId).first();
    if (!duplicate || normalizePhone(duplicate.phone) !== normalizePhone(master.phone)) return json({ ok: false, message: "只能合并标准化手机号相同的客户。" }, 409);
    duplicates.push(duplicate);
  }
  const statements = [];
  for (const duplicate of duplicates) {
    statements.push(env.DB.prepare("UPDATE crm_consultations SET customer_id = ? WHERE customer_id = ?").bind(masterId, duplicate.id));
    statements.push(env.DB.prepare("UPDATE crm_followups SET customer_id = ? WHERE customer_id = ?").bind(masterId, duplicate.id));
    statements.push(env.DB.prepare("UPDATE crm_audit_logs SET customer_id = ? WHERE customer_id = ?").bind(masterId, duplicate.id));
    statements.push(env.DB.prepare("UPDATE crm_customers SET merged_into_customer_id = ?, merged_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(masterId, duplicate.id));
  }
  await env.DB.batch(statements);
  const requestId = crypto.randomUUID();
  await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "customers_merged", customerId: masterId, reason, requestId, metadata: { duplicateIds } });
  return json({ ok: true, masterId, merged: duplicateIds.length, requestId });
}

function csvValue(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csvResponse(filename, headers, rows) {
  const content = `\ufeff${[headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
  return new Response(content, { headers: { "cache-control": "no-store", "content-disposition": `attachment; filename="${filename}"`, "content-type": "text/csv; charset=utf-8" } });
}

async function exportAdminCsv(request, env, actor, type) {
  const permission = can(actor, "export_full") ? "full" : can(actor, "export_masked") ? "masked" : null;
  if (!permission) return json({ ok: false, message: "无权导出数据。" }, 403);
  const url = new URL(request.url);
  let response;
  let count = 0;
  if (type === "sales") {
    const q = validText(url.searchParams.get("q"), 1, 60);
    const where = q ? "WHERE display_name LIKE ? OR login_name LIKE ?" : "";
    const statement = env.DB.prepare(`SELECT display_name, login_name, invite_code, active, created_at FROM crm_sales_accounts ${where} ORDER BY id DESC LIMIT 5000`);
    const result = q ? await statement.bind(`%${q}%`, `%${q}%`).all() : await statement.all();
    const rows = result.results || [];
    count = rows.length;
    response = csvResponse("crm-sales.csv", ["销售姓名", "登录手机号／历史登录名", "邀请码", "状态", "创建时间"], rows.map((row) => [row.display_name, row.login_name, row.invite_code, row.active ? "启用" : "停用", row.created_at]));
  } else {
    const q = validText(url.searchParams.get("q"), 1, 80);
    const status = url.searchParams.get("status");
    const conditions = ["c.merged_into_customer_id IS NULL"];
    const params = [];
    if (q) { conditions.push("(c.name LIKE ? OR c.phone LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
    if (CRM_STATUSES.has(status)) { conditions.push("c.status = ?"); params.push(status); }
    const result = await env.DB.prepare(`SELECT c.name, c.phone, c.status, s.display_name AS sales_name, c.last_consulted_at, c.next_followup_at FROM crm_customers c LEFT JOIN crm_sales_accounts s ON c.sales_id = s.id WHERE ${conditions.join(" AND ")} ORDER BY c.id DESC LIMIT 5000`).bind(...params).all();
    const rows = result.results || [];
    count = rows.length;
    response = csvResponse("crm-leads.csv", ["客户姓名", "手机号", "状态", "当前归属", "最近咨询", "下次跟进"], rows.map((row) => [row.name, permission === "full" ? row.phone : maskPhone(row.phone), row.status, row.sales_name || "公共客户池", row.last_consulted_at, row.next_followup_at || ""]));
  }
  await audit(env, { actorType: "admin", actorAdminId: actor.id, action: `csv_${type}_exported`, reason: permission, metadata: { count, filters: Object.fromEntries(url.searchParams) } });
  return response;
}

async function listAuditLogs(env, actor, url) {
  if (!can(actor, "audit")) return json({ ok: false, message: "无权查看审计记录。" }, 403);
  const pageSize = requestedPageSize(url);
  const cursor = Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0;
  const where = cursor > 0 ? "WHERE l.id < ?" : "";
  const result = await env.DB.prepare(`SELECT l.id, l.actor_type, l.actor_id, l.action, l.customer_id, l.from_sales_id, l.to_sales_id, l.reason, l.request_id, l.metadata_json, l.created_at, a.display_name AS admin_name FROM crm_audit_logs l LEFT JOIN crm_admin_accounts a ON l.actor_admin_id = a.id ${where} ORDER BY l.id DESC LIMIT ?`)
    .bind(...(cursor > 0 ? [cursor] : []), pageSize + 1).all();
  const items = result.results || [];
  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();
  return json({ ok: true, items, has_more: hasMore, next_cursor: hasMore ? String(items.at(-1)?.id || "") : null });
}

export async function handleCrmApi(request, env, isAdmin) {
  const unavailable = await requireCrmSchema(env);
  if (unavailable) return unavailable;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/crm\/?/, "");

  if (path === "admin/bootstrap" && request.method === "GET") {
    const created = await ensureDefaultAdmin(env);
    return json({ ok: true, required: await adminBootstrapStatus(env), created });
  }
  if (path === "admin/bootstrap" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    return bootstrapAdmin(request, env, isAdmin, body);
  }
  if (path === "admin/login" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    return loginAdmin(request, env, body, isAdmin);
  }
  if (path === "admin/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${CRM_ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (path === "login" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    const loginName = validText(body.loginName, 3, 48).toLowerCase();
    const password = String(body.password || "");
    const sales = await env.DB.prepare("SELECT id, display_name, login_name, invite_code, password_hash, active, must_change_password FROM crm_sales_accounts WHERE login_name = ?").bind(loginName).first();
    if (!sales?.active || !(await verifyPassword(password, sales.password_hash))) return json({ ok: false, message: "登录名或密码不正确。" }, 401);
    await env.DB.prepare("UPDATE crm_sales_accounts SET last_login_at = datetime('now', '+8 hours'), updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(sales.id).run();
    const session = await createSalesSession(sales.id, env);
    return json({ ok: true, token: session, sales: { id: sales.id, displayName: sales.display_name, inviteCode: sales.invite_code, inviteUrl: await salesInviteUrl(request, sales.invite_code, env), mustChangePassword: Boolean(sales.must_change_password) } }, 200, {
      "set-cookie": `${CRM_SALES_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${CRM_SESSION_MAX_AGE_SECONDS}`,
    });
  }

  if (path === "logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${CRM_SALES_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (path.startsWith("admin/")) {
    const actor = await adminSession(request, env);
    if (!actor) return json({ ok: false, message: "请先登录具名管理员账号。" }, 401);
    if (path === "admin/me" && request.method === "GET") return json({ ok: true, admin: adminPublicRecord(actor) });
    if (path === "admin/change-password" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return changeAdminPassword(env, actor, body);
    }
    if (actor.must_change_password) return json({ ok: false, message: "请先修改临时密码。", mustChangePassword: true }, 403);
    if (path === "admin/admins" && request.method === "GET") {
      if (!can(actor, "admin_manage")) return json({ ok: false, message: "无权查看管理员账号。" }, 403);
      const result = await env.DB.prepare("SELECT id, display_name, login_phone, role, active, must_change_password, last_login_at, created_at FROM crm_admin_accounts ORDER BY id DESC").all();
      return json({ ok: true, admins: result.results || [] });
    }
    if (path === "admin/admins" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return createAdminAccount(env, actor, body);
    }
    if (path === "admin/sales" && request.method === "GET") {
      const result = await listSales(env, url);
      const sales = await Promise.all(result.items.map(async (person) => ({ ...person, invite_url: await salesInviteUrl(request, person.invite_code, env) })));
      return json({ ok: true, sales, total: result.total, has_more: result.hasMore, next_cursor: result.nextCursor });
    }
    if (path === "admin/sales" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return adminCreateSales(request, env, body, actor);
    }
    const salesStatusMatch = path.match(/^admin\/sales\/(\d+)\/status$/);
    if (salesStatusMatch && request.method === "PATCH") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return updateSalesStatus(env, actor, Number(salesStatusMatch[1]), body);
    }
    const salesPhoneMatch = path.match(/^admin\/sales\/(\d+)\/phone$/);
    if (salesPhoneMatch && request.method === "PATCH") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return updateSalesPhone(env, actor, Number(salesPhoneMatch[1]), body);
    }
    const salesPasswordMatch = path.match(/^admin\/sales\/(\d+)\/reset-password$/);
    if (salesPasswordMatch && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return resetSalesPassword(env, actor, Number(salesPasswordMatch[1]), body);
    }
    if (path === "admin/leads" && request.method === "GET") {
      const result = await listLeads(env, { url, revealPhone: actor.role === "super_admin" });
      return json({ ok: true, leads: result.items, total: result.total, has_more: result.hasMore, next_cursor: result.nextCursor });
    }
    const assignMatch = path.match(/^admin\/leads\/(\d+)\/assign$/);
    if (assignMatch && request.method === "POST") {
      if (!can(actor, "lead_assign")) return json({ ok: false, message: "无权分配客户。" }, 403);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      const response = await adminAssignLead(env, Number(assignMatch[1]), body);
      if (response.ok) await audit(env, { actorType: "admin", actorAdminId: actor.id, action: "lead_assignment_confirmed", customerId: Number(assignMatch[1]), reason: body.reason || "管理员分配" });
      return response;
    }
    const adminFollowupsMatch = path.match(/^admin\/leads\/(\d+)\/followups$/);
    if (adminFollowupsMatch && request.method === "GET") return json({ ok: true, ...(await listFollowups(env, Number(adminFollowupsMatch[1]), Number(url.searchParams.get("cursor") || 0))) });
    if (path === "admin/leads/batch-assign" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return batchAssignLeads(env, actor, body);
    }
    if (path === "admin/imports/customers" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return importCustomers(env, actor, body);
    }
    if (path === "admin/leads/merge" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
      return mergeCustomers(env, actor, body);
    }
    if (path === "admin/exports/sales.csv" && request.method === "GET") return exportAdminCsv(request, env, actor, "sales");
    if (path === "admin/exports/leads.csv" && request.method === "GET") return exportAdminCsv(request, env, actor, "leads");
    if (path === "admin/audit" && request.method === "GET") return listAuditLogs(env, actor, url);
    return json({ ok: false, message: "Not found" }, 404);
  }

  const sales = await salesSession(request, env);
  if (!sales) return json({ ok: false, message: "请先登录销售后台。" }, 401);
  if (path === "change-password" && request.method === "POST") {
    let body; try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    return changeSalesPassword(env, sales, body);
  }
  if (path === "me" && request.method === "GET") return json({ ok: true, sales: { id: sales.id, displayName: sales.display_name, inviteCode: sales.invite_code, inviteUrl: await salesInviteUrl(request, sales.invite_code, env), mustChangePassword: Boolean(sales.must_change_password) } });
  if (sales.must_change_password) return json({ ok: false, message: "请先修改临时密码。", mustChangePassword: true }, 403);
  if (path === "leads" && request.method === "GET") {
    const result = await listLeads(env, { salesId: sales.id, url, revealPhone: true });
    return json({ ok: true, leads: result.items, total: result.total, has_more: result.hasMore, next_cursor: result.nextCursor });
  }
  const followupsMatch = path.match(/^leads\/(\d+)\/followups$/);
  if (followupsMatch && request.method === "GET") {
    const customerId = Number(followupsMatch[1]);
    const customer = await env.DB.prepare("SELECT id FROM crm_customers WHERE id = ? AND sales_id = ? AND merged_into_customer_id IS NULL").bind(customerId, sales.id).first();
    if (!customer) return json({ ok: false, message: "无权查看该客户。" }, 404);
    return json({ ok: true, ...(await listFollowups(env, customerId, Number(url.searchParams.get("cursor") || 0))) });
  }
  const leadMatch = path.match(/^leads\/(\d+)$/);
  if (leadMatch && request.method === "PATCH") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    return updateLeadForSales(env, sales, Number(leadMatch[1]), body);
  }
  return json({ ok: false, message: "Not found" }, 404);
}
