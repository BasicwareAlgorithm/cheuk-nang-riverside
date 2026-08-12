const RESERVATION_PATH = "/api/reservations";
const ADMIN_API_PREFIX = "/api/admin";
const ADMIN_PATH = "/admin/reservations";
const ADMIN_COOKIE = "reservation_admin";
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const RESERVATION_ORIGINS = new Set([
  "https://cheuknangriverside.com",
  "https://www.cheuknangriverside.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

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

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  });
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { location, ...headers } });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhone(value) {
  return value.replace(/[\s-]/g, "").replace(/^\+?86/, "");
}

function hasValidOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).hostname === new URL(request.url).hostname;
  } catch {
    return false;
  }
}

function reservationCorsHeaders(request) {
  const origin = request.headers.get("origin");
  if (!origin) return {};

  let allowed = false;
  try {
    allowed = new URL(origin).hostname === new URL(request.url).hostname || RESERVATION_ORIGINS.has(origin);
  } catch {
    allowed = false;
  }

  if (!allowed) return {};
  return {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-origin": origin,
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function reservationJson(request, body, status = 200) {
  return json(body, status, reservationCorsHeaders(request));
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
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function adminSignature(password) {
  const data = new TextEncoder().encode(`cheuk-nang-reservations:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = getCookie(request, ADMIN_COOKIE);
  if (!cookie) return false;
  return constantTimeEqual(cookie, await adminSignature(env.ADMIN_PASSWORD));
}

function pageShell(title, content) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>
:root{color:#152535;background:#f4f0e9;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}*{box-sizing:border-box}body{margin:0}a{color:inherit}.top{align-items:center;background:#071d34;color:white;display:flex;justify-content:space-between;padding:22px clamp(22px,5vw,70px)}.brand{font-family:Georgia,"Songti SC",serif;letter-spacing:.14em}.top form{margin:0}.top button{background:transparent;border:1px solid #8190a0;color:white;cursor:pointer;padding:8px 14px}.wrap{margin:0 auto;max-width:1240px;padding:54px 24px 80px}.eyebrow{color:#a47a3d;font-family:Georgia,serif;font-size:11px;letter-spacing:.22em}.head{align-items:end;display:flex;gap:24px;justify-content:space-between;margin-bottom:34px}.head h1{font-family:"Songti SC",serif;font-size:clamp(34px,5vw,58px);font-weight:400;letter-spacing:.08em;margin:12px 0 0}.head p{color:#68737c;margin:10px 0}.download{background:#071d34;color:white;padding:13px 18px;text-decoration:none;white-space:nowrap}.card{background:white;box-shadow:0 18px 55px rgba(7,29,52,.08);overflow:auto}.stats{border-bottom:1px solid #e3ded6;color:#68737c;padding:18px 22px}.stats strong{color:#a47a3d;font-family:Georgia,serif;font-size:22px;margin-right:6px}table{border-collapse:collapse;min-width:720px;width:100%}th,td{border-bottom:1px solid #ece7df;padding:17px 22px;text-align:left}th{background:#f8f5ef;color:#68737c;font-size:11px;letter-spacing:.12em}td{font-size:14px}.empty{color:#68737c;padding:70px 24px;text-align:center}.login{background:white;box-shadow:0 25px 80px rgba(7,29,52,.12);margin:12vh auto 0;max-width:460px;padding:48px}.login h1{font-family:"Songti SC",serif;font-size:36px;font-weight:400;letter-spacing:.1em;margin:12px 0}.login p{color:#68737c;line-height:1.8}.login label{display:grid;font-size:12px;gap:10px;margin:30px 0 18px}.login input{border:0;border-bottom:1px solid #b8b0a5;font:inherit;padding:13px 0}.login button{background:#071d34;border:0;color:white;cursor:pointer;padding:15px;width:100%}.error{color:#a64235!important;font-size:12px}@media(max-width:640px){.top{padding:18px 20px}.wrap{padding:38px 16px 60px}.head{align-items:start;display:grid}.download{text-align:center}.login{margin:8vh 16px 0;padding:36px 26px}}
</style></head><body>${content}</body></html>`;
}

function loginPage(error = "") {
  return pageShell("预约后台登录", `<main class="login"><p class="eyebrow">CHEUK NANG RIVERSIDE</p><h1>预约后台</h1><p>输入管理员密码，查看客户预约记录并下载 Excel 表格。</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}<form method="post" action="/admin/login"><label><span>管理员密码</span><input name="password" type="password" autocomplete="current-password" required autofocus></label><button type="submit">进入后台</button></form></main>`);
}

function adminPage(rows, total) {
  const tableRows = rows.map((row) => `<tr><td>${row.id}</td><td>${escapeHtml(row.name)}</td><td><a href="tel:${escapeHtml(row.phone)}">${escapeHtml(row.phone)}</a></td><td>${escapeHtml(row.created_at)}</td></tr>`).join("");
  const content = `<header class="top"><div class="brand">卓能·河畔轩</div><form method="post" action="/admin/logout"><button type="submit">退出登录</button></form></header><main class="wrap"><div class="head"><div><p class="eyebrow">RESERVATION ADMIN</p><h1>预约客户记录</h1><p>提交时间为中国标准时间，最新记录排在最前。</p></div><a class="download" href="/admin/reservations.csv">下载 Excel 表格（CSV）</a></div><section class="card"><div class="stats"><strong>${total}</strong> 条预约记录</div>${rows.length ? `<table><thead><tr><th>编号</th><th>姓名</th><th>手机号码</th><th>提交时间</th></tr></thead><tbody>${tableRows}</tbody></table>` : '<div class="empty">还没有预约记录</div>'}</section></main>`;
  return pageShell("卓能河畔轩预约后台", content);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function reservationCsv(rows) {
  const lines = ["编号,姓名,手机号码,提交时间", ...rows.map((row) => [row.id, row.name, row.phone, row.created_at].map(csvCell).join(","))];
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\ufeff${lines.join("\r\n")}`, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="cheuk-nang-reservations-${date}.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}

async function listReservations(env, limit = 1000) {
  const [records, count] = await Promise.all([
    env.DB.prepare("SELECT id, name, phone, created_at FROM reservations ORDER BY id DESC LIMIT ?").bind(limit).all(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM reservations").first(),
  ]);
  return { rows: records.results || [], total: Number(count?.total || 0) };
}

export async function handleReservation(request, env) {
  if (request.method === "OPTIONS") {
    const headers = reservationCorsHeaders(request);
    if (!headers["access-control-allow-origin"]) {
      return reservationJson(request, { ok: false, message: "请求来源无效。" }, 403);
    }
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return reservationJson(request, { ok: false, message: "仅支持提交预约信息。" }, 405);
  }
  const corsHeaders = reservationCorsHeaders(request);
  if (request.headers.get("origin") && !corsHeaders["access-control-allow-origin"]) {
    return reservationJson(request, { ok: false, message: "请求来源无效。" }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reservationJson(request, { ok: false, message: "请求格式无效。" }, 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > 2_048) {
    return reservationJson(request, { ok: false, message: "提交内容过长。" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return reservationJson(request, { ok: false, message: "请求格式无效。" }, 400);
  }

  if (String(body.company ?? "").trim()) {
    return reservationJson(request, { ok: true }, 201);
  }

  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? "").trim());
  if (name.length < 2 || name.length > 30 || /[\u0000-\u001f\u007f]/.test(name)) {
    return reservationJson(request, { ok: false, message: "请输入2至30个字符的姓名。" }, 400);
  }
  if (!PHONE_PATTERN.test(phone)) {
    return reservationJson(request, { ok: false, message: "请输入正确的中国大陆手机号码。" }, 400);
  }
  if (!env.DB) {
    return reservationJson(request, { ok: false, message: "预约服务正在配置中，请拨打品鉴热线。" }, 503);
  }

  const requestId = crypto.randomUUID();
  try {
    const result = await env.DB.prepare("INSERT INTO reservations (name, phone) VALUES (?, ?)").bind(name, phone).run();
    if (!result.success) throw new Error("D1 insert did not succeed");
    return reservationJson(request, { ok: true, requestId }, 201);
  } catch (error) {
    console.error("Reservation write failed", { requestId, reason: error.message });
    return reservationJson(request, { ok: false, message: "提交暂时未成功，请稍后再试或拨打品鉴热线。", requestId }, 502);
  }
}

export async function handleAdminApi(request, env) {
  const url = new URL(request.url);
  if (!env.ADMIN_PASSWORD || !env.DB) {
    return json({ ok: false, message: "后台服务正在配置中。" }, 503);
  }

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    if (!hasValidOrigin(request)) return json({ ok: false, message: "请求来源无效。" }, 403);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, message: "请求格式无效。" }, 400);
    }
    const supplied = await adminSignature(String(body.password || ""));
    const expected = await adminSignature(env.ADMIN_PASSWORD);
    if (!constantTimeEqual(supplied, expected)) return json({ ok: false, message: "密码不正确。" }, 401);
    return json({ ok: true }, 200, {
      "set-cookie": `${ADMIN_COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
    });
  }

  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    return json({ ok: true }, 200, {
      "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    });
  }

  if (!(await isAdmin(request, env))) {
    return json({ ok: false, message: "请先输入管理员密码。" }, 401);
  }

  if (url.pathname === "/api/admin/reservations.csv" && request.method === "GET") {
    const { rows } = await listReservations(env, 5000);
    return reservationCsv(rows);
  }

  if (url.pathname === "/api/admin/reservations" && request.method === "GET") {
    const { rows, total } = await listReservations(env);
    return json({ ok: true, rows, total });
  }

  return json({ ok: false, message: "Not found" }, 404);
}

export async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const isRecordsDomain = url.hostname === "records.cheuknangriverside.com";
  const dashboardPath = isRecordsDomain ? "/" : ADMIN_PATH;
  if (!env.ADMIN_PASSWORD || !env.DB) {
    return html(pageShell("后台配置中", '<main class="login"><p class="eyebrow">CHEUK NANG RIVERSIDE</p><h1>后台配置中</h1><p>数据库或管理员密码尚未完成配置。</p></main>'), 503);
  }

  if (url.pathname === "/admin/login" && request.method === "POST") {
    const params = new URLSearchParams(await request.text());
    const supplied = await adminSignature(params.get("password") || "");
    const expected = await adminSignature(env.ADMIN_PASSWORD);
    if (!constantTimeEqual(supplied, expected)) return html(loginPage("密码不正确，请重新输入。"), 401);
    return redirect(dashboardPath, { "set-cookie": `${ADMIN_COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
  }

  if (url.pathname === "/admin/logout" && request.method === "POST") {
    return redirect(dashboardPath, { "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (url.pathname === "/admin") return redirect(ADMIN_PATH);
  if (!(await isAdmin(request, env))) {
    if (url.pathname.endsWith(".csv")) return redirect(dashboardPath);
    return html(loginPage());
  }

  if (url.pathname === "/admin/reservations.csv" && request.method === "GET") {
    const { rows } = await listReservations(env, 5000);
    return reservationCsv(rows);
  }

  if ((url.pathname === ADMIN_PATH || (isRecordsDomain && url.pathname === "/")) && request.method === "GET") {
    const { rows, total } = await listReservations(env);
    return html(adminPage(rows, total));
  }
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(ADMIN_API_PREFIX)) return handleAdminApi(request, env);
    if (url.pathname === RESERVATION_PATH) return handleReservation(request, env);
    if (url.pathname.startsWith("/admin") || (url.hostname === "records.cheuknangriverside.com" && url.pathname === "/")) {
      return handleAdmin(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
