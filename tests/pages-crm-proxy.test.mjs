import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/crm/[[path]].js";

test("proxies CRM requests through the Pages service binding", async () => {
  let upstream;
  const response = await onRequest({
    env: {
      CRM_WORKER: {
        async fetch(request) {
          upstream = request;
          return Response.json({ ok: true }, { status: 201 });
        },
      },
    },
    request: new Request("https://admin.cheuknangriverside.com/api/crm/admin/sales", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://admin.cheuknangriverside.com",
        "x-admin-password": "test-only-password",
      },
      body: JSON.stringify({ displayName: "测试销售" }),
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(upstream.url, "https://admin.cheuknangriverside.com/api/crm/admin/sales");
  assert.equal(upstream.method, "POST");
  assert.equal(upstream.headers.get("origin"), null);
  assert.equal(upstream.headers.get("x-admin-password"), "test-only-password");
  assert.deepEqual(await upstream.json(), { displayName: "测试销售" });
});

test("fails visibly when the CRM service binding is missing", async () => {
  const response = await onRequest({
    env: {},
    request: new Request("https://admin.cheuknangriverside.com/api/crm/admin/sales"),
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, message: "CRM 服务正在配置中。" });
});
