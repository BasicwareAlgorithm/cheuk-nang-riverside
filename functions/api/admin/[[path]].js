const ADMIN_COOKIE = "reservation_admin";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", ...extraHeaders },
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

async function signature(password) {
  const data = new TextEncoder().encode(`cheuk-nang-reservations:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = getCookie(request, ADMIN_COOKIE);
  return Boolean(cookie) && constantTimeEqual(cookie, await signature(env.ADMIN_PASSWORD));
}

async function listReservations(env, limit = 1000) {
  const [records, count] = await Promise.all([
    env.DB.prepare("SELECT id, name, phone, created_at FROM reservations ORDER BY id DESC LIMIT ?").bind(limit).all(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM reservations").first(),
  ]);
  return { rows: records.results || [], total: Number(count?.total || 0) };
}

function csv(rows) {
  const cell = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = ["编号,姓名,手机号码,提交时间", ...rows.map((row) => [row.id, row.name, row.phone, row.created_at].map(cell).join(","))];
  return new Response(`\ufeff${lines.join("\r\n")}`, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="cheuk-nang-reservations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}

export async function onRequest({ request, env, params }) {
  if (!env.ADMIN_PASSWORD || !env.DB) return json({ ok: false, message: "后台服务正在配置中。" }, 503);
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");

  if (path === "login" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, message: "请求格式无效。" }, 400); }
    const supplied = await signature(String(body.password || ""));
    const expected = await signature(env.ADMIN_PASSWORD);
    if (!constantTimeEqual(supplied, expected)) return json({ ok: false, message: "密码不正确。" }, 401);
    return json({ ok: true }, 200, { "set-cookie": `${ADMIN_COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
  }

  if (path === "logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (!(await isAdmin(request, env))) return json({ ok: false, message: "请先输入管理员密码。" }, 401);
  if (path === "reservations.csv" && request.method === "GET") return csv((await listReservations(env, 5000)).rows);
  if (path === "reservations" && request.method === "GET") return json({ ok: true, ...(await listReservations(env)) });
  return json({ ok: false, message: "Not found" }, 404);
}
