const PHONE_PATTERN = /^1[3-9]\d{9}$/;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function normalizePhone(value) {
  return value.replace(/[\s-]/g, "").replace(/^\+?86/, "");
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, message: "预约服务正在配置中，请拨打品鉴热线。" }, 503);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, message: "请求格式无效。" }, 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > 2_048) return json({ ok: false, message: "提交内容过长。" }, 413);

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "请求格式无效。" }, 400);
  }

  if (String(body.company ?? "").trim()) return json({ ok: true }, 201);

  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? "").trim());
  if (name.length < 2 || name.length > 30 || /[\u0000-\u001f\u007f]/.test(name)) {
    return json({ ok: false, message: "请输入2至30个字符的姓名。" }, 400);
  }
  if (!PHONE_PATTERN.test(phone)) {
    return json({ ok: false, message: "请输入正确的中国大陆手机号码。" }, 400);
  }

  const requestId = crypto.randomUUID();
  try {
    const result = await env.DB.prepare("INSERT INTO reservations (name, phone) VALUES (?, ?)").bind(name, phone).run();
    if (!result.success) throw new Error("D1 insert did not succeed");
    return json({ ok: true, requestId }, 201);
  } catch (error) {
    console.error("Reservation write failed", { requestId, reason: error.message });
    return json({ ok: false, message: "提交暂时未成功，请稍后再试或拨打品鉴热线。", requestId }, 502);
  }
}

export function onRequest() {
  return json({ ok: false, message: "仅支持提交预约信息。" }, 405);
}
