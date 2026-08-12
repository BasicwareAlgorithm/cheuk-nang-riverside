const RESERVATION_UPSTREAM = "https://cheuk-nang-riverside.hezhenzhen.workers.dev/api/reservations";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function onRequestPost({ request }) {
  try {
    const response = await fetch(RESERVATION_UPSTREAM, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        origin: new URL(request.url).origin,
      },
      body: await request.text(),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Reservation proxy failed", { reason: error.message });
    return json({ ok: false, message: "预约服务暂时无法连接，请稍后再试或拨打品鉴热线。" }, 502);
  }
}

export function onRequest() {
  return json({ ok: false, message: "仅支持提交预约信息。" }, 405);
}
