import assert from "node:assert/strict";
import test from "node:test";
import { onRequest, onRequestPost } from "../functions/api/reservations.js";

function makeEnv() {
  const writes = [];
  return {
    writes,
    env: {
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              writes.push({ sql, values });
              return { run: async () => ({ success: true }) };
            },
          };
        },
      },
    },
  };
}

test("writes same-origin reservation submissions directly to D1", async () => {
  const { env, writes } = makeEnv();
  const response = await onRequestPost({
    env,
    request: new Request("https://www.cheuknangriverside.com/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "张三", phone: "13800138000" }),
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].values, ["张三", "13800138000"]);
  assert.equal((await response.json()).ok, true);
});

test("rejects non-POST requests", async () => {
  const response = onRequest();
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { ok: false, message: "仅支持提交预约信息。" });
});
