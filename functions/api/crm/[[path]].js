function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function onRequest({ request, env }) {
  if (!env.CRM_WORKER?.fetch) {
    return json({ ok: false, message: "CRM 服务正在配置中。" }, 503);
  }

  const headers = new Headers(request.headers);
  headers.delete("origin");
  return env.CRM_WORKER.fetch(new Request(request, { headers }));
}
