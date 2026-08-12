import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker, { handleAdmin, handleAdminApi, handleReservation } from "../worker/index.js";

function createD1(initialRows = []) {
  const rows = initialRows.map((row) => ({ ...row }));
  return {
    rows,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async run() {
          if (!sql.startsWith("INSERT INTO reservations")) throw new Error(`Unexpected run: ${sql}`);
          rows.push({ id: rows.length + 1, name: values[0], phone: values[1], created_at: "2026-08-11 16:30:00" });
          return { success: true };
        },
        async all() {
          if (!sql.startsWith("SELECT id, name, phone")) throw new Error(`Unexpected all: ${sql}`);
          return { results: [...rows].reverse().slice(0, values[0] || 1000) };
        },
        async first() {
          if (!sql.startsWith("SELECT COUNT(*)")) throw new Error(`Unexpected first: ${sql}`);
          return { total: rows.length };
        },
      };
    },
  };
}

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("rejects invalid reservation data before writing to the database", async () => {
  let assetCalls = 0;
  const response = await worker.fetch(
    new Request("https://example.test/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify({ name: "张三", phone: "12345" }),
    }),
    {
      ASSETS: { fetch: async () => { assetCalls += 1; return new Response("missing", { status: 404 }); } },
    },
  );

  assert.equal(response.status, 400);
  assert.equal(assetCalls, 0);
  assert.deepEqual(await response.json(), { ok: false, message: "请输入正确的中国大陆手机号码。" });
});

test("writes a valid reservation to D1", async () => {
  const DB = createD1();
  const response = await handleReservation(
    new Request("https://example.test/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify({ name: "张三", phone: "+86 138-0013-8000", company: "" }),
    }),
    { DB },
  );

  assert.equal(response.status, 201);
  assert.deepEqual(DB.rows, [{ id: 1, name: "张三", phone: "13800138000", created_at: "2026-08-11 16:30:00" }]);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.match(result.requestId, /^[0-9a-f-]{36}$/);
});

test("allows the public website to submit reservations on the same origin", async () => {
  const origin = "https://www.cheuknangriverside.com";
  const endpoint = `${origin}/api/reservations`;

  const preflight = await handleReservation(new Request(endpoint, {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-headers": "content-type",
      "access-control-request-method": "POST",
    },
  }), {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.match(preflight.headers.get("access-control-allow-methods"), /POST/);

  const DB = createD1();
  const response = await handleReservation(new Request(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name: "张三", phone: "13800138000" }),
  }), { DB });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(DB.rows.length, 1);
});

test("rejects reservation requests from unapproved origins", async () => {
  const response = await handleReservation(new Request(
    "https://cheuk-nang-riverside.hezhenzhen.workers.dev/api/reservations",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://untrusted.example" },
      body: JSON.stringify({ name: "张三", phone: "13800138000" }),
    },
  ), { DB: createD1() });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("silently accepts honeypot submissions without storing a record", async () => {
  const DB = createD1();
  const response = await handleReservation(
    new Request("https://example.test/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify({ name: "Bot Name", phone: "13800138000", company: "spam" }),
    }),
    { DB },
  );

  assert.equal(response.status, 201);
  assert.equal(DB.rows.length, 0);
  assert.deepEqual(await response.json(), { ok: true });
});

test("protects the reservation dashboard and exports an Excel-compatible CSV", async () => {
  const DB = createD1([{ id: 1, name: "李女士", phone: "13900139000", created_at: "2026-08-11 16:31:00" }]);
  const env = { DB, ADMIN_PASSWORD: "strong-test-password" };

  const loginPage = await handleAdmin(new Request("https://example.test/admin/reservations"), env);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /管理员密码/);

  const login = await handleAdmin(new Request("https://example.test/admin/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "strong-test-password" }),
  }), env);
  assert.equal(login.status, 303);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];

  const dashboard = await handleAdmin(new Request("https://example.test/admin/reservations", { headers: { cookie } }), env);
  const dashboardHtml = await dashboard.text();
  assert.equal(dashboard.status, 200);
  assert.match(dashboardHtml, /李女士/);
  assert.match(dashboardHtml, /13900139000/);

  const csv = await handleAdmin(new Request("https://example.test/admin/reservations.csv", { headers: { cookie } }), env);
  const csvBytes = new Uint8Array(await csv.arrayBuffer());
  const csvText = new TextDecoder().decode(csvBytes);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-disposition"), /\.csv/);
  assert.deepEqual([...csvBytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.match(csvText, /"李女士","13900139000"/);
});

test("supports the cache-safe SPA admin API", async () => {
  const DB = createD1([{ id: 1, name: "王先生", phone: "13800138000", created_at: "2026-08-11 16:32:00" }]);
  const env = { DB, ADMIN_PASSWORD: "strong-test-password" };

  const unauthorized = await handleAdminApi(new Request("https://example.test/api/admin/reservations"), env);
  assert.equal(unauthorized.status, 401);

  const login = await handleAdminApi(new Request("https://example.test/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.test" },
    body: JSON.stringify({ password: "strong-test-password" }),
  }), env);
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  assert.match(login.headers.get("set-cookie"), /Path=\//);

  const records = await handleAdminApi(new Request("https://example.test/api/admin/reservations", { headers: { cookie } }), env);
  assert.equal(records.status, 200);
  assert.deepEqual(await records.json(), {
    ok: true,
    rows: [{ id: 1, name: "王先生", phone: "13800138000", created_at: "2026-08-11 16:32:00" }],
    total: 1,
  });

  const csv = await handleAdminApi(new Request("https://example.test/api/admin/reservations.csv", { headers: { cookie } }), env);
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /王先生/);
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});

test("routes same-origin APIs from the public and admin domains to the Worker", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));

  assert.deepEqual(config.routes, [
    {
      pattern: "www.cheuknangriverside.com/api/*",
      zone_name: "cheuknangriverside.com",
    },
    {
      pattern: "admin.cheuknangriverside.com/api/*",
      zone_name: "cheuknangriverside.com",
    },
  ]);
});
