import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/admin/[[path]].js";

function makeEnv() {
  return {
    ADMIN_PASSWORD: "test-password",
    DB: {
      prepare(sql) {
        return {
          bind() { return { all: async () => ({ results: [] }) }; },
          first: async () => ({ total: 0 }),
        };
      },
    },
  };
}

test("Pages admin API logs in and reads reservation records", async () => {
  const env = makeEnv();
  const login = await onRequest({
    env,
    params: { path: "login" },
    request: new Request("https://records.cheuknangriverside.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "test-password" }),
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];

  const records = await onRequest({
    env,
    params: { path: "reservations" },
    request: new Request("https://records.cheuknangriverside.com/api/admin/reservations", { headers: { cookie } }),
  });
  assert.equal(records.status, 200);
  assert.deepEqual(await records.json(), { ok: true, rows: [], total: 0 });
});
