import assert from "node:assert/strict";
import test from "node:test";
import { onRequest, onRequestPost } from "../functions/api/reservations.js";

test("proxies same-origin reservation submissions to the existing Worker", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url, init };
    return new Response(JSON.stringify({ ok: true, requestId: "request-1" }), {
      status: 201,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  };

  try {
    const response = await onRequestPost({
      request: new Request("https://www.cheuknangriverside.com/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "张三", phone: "13800138000" }),
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(upstreamRequest.url, "https://cheuk-nang-riverside.hezhenzhen.workers.dev/api/reservations");
    assert.equal(upstreamRequest.init.headers.origin, "https://www.cheuknangriverside.com");
    assert.deepEqual(JSON.parse(upstreamRequest.init.body), { name: "张三", phone: "13800138000" });
    assert.deepEqual(await response.json(), { ok: true, requestId: "request-1" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-POST requests without contacting the upstream", async () => {
  const response = onRequest();
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { ok: false, message: "仅支持提交预约信息。" });
});
