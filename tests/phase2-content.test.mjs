import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("phase 2 homepage uses reviewed facts and status-qualified claims", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /成立于1963年/);
  assert.match(app, /港交所股份代号/);
  assert.match(app, /计划2028年开通/);
  assert.match(app, /以政府部门、运营机构及现场实际为准/);
  assert.match(app, /\["约53%", "90㎡以下户型占比"\]/);
  assert.match(app, /\["约47%", "90㎡以上户型占比"\]/);
  assert.doesNotMatch(app, /\[\s*["']1973["']\s*,\s*["']港交所上市["']/);
  assert.doesNotMatch(app, /租房不如买房/);
});

test("phase 2 source assets required by the homepage are local", async () => {
  const assets = [
    "hero-aerial.jpg", "arrival-gate.jpg", "clubhouse-lawn.jpg", "playground.jpg",
    "sparse-grove.jpg", "location-map.jpg", "group-works-hk.jpg", "group-works-regional.jpg",
    "landscape-masterplan.jpg", "commercial-street.jpg", "north-entrance.jpg", "east-entrance.jpg",
    "liuguang-courtyard.jpg", "art-screen.jpg", "liuguang-island.jpg", "sales-centre-plan.jpg",
    "sales-lobby.jpg", "sales-waterbar.jpg", "sales-corridor.jpg", "sales-signing-room.jpg",
    "sales-restroom.jpg", "small-living.jpg", "small-bedroom.jpg", "large-entry.jpg",
    "large-living.jpg", "large-main-bedroom.jpg", "large-shower.jpg", "large-bedroom.jpg", "unit-a1.jpg", "unit-a2.jpg",
    "unit-d5.jpg", "unit-f2.jpg",
  ];

  for (const asset of assets) {
    await access(path.join(root, "public", "assets", "phase2", asset));
  }
});

test("phase 2 sections cover community renewal, show homes and home selection", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /id="community"/);
  assert.match(app, /id="timeline"/);
  assert.match(app, /function GroupFootprint/);
  assert.match(app, /function ProjectArchive/);
  assert.match(app, /function RenewalGallery/);
  assert.match(app, /function SalesCentre/);
  assert.match(app, /id="interiors"/);
  assert.match(app, /id="homes"/);
  assert.match(app, /鎏光逸境 焕新社区/);
  assert.match(app, /从空间尺度 预见生活日常/);
  assert.match(app, /1961/);
  assert.match(app, /1972\/1973/);
  assert.match(app, /2016/);
  assert.match(app, /document\.getElementById\(id\)\?\.scrollIntoView/);
});

test("test mode keeps the appointment form visible without sending customer data", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /function BookingModal/);
  assert.match(app, /IS_TEST_RESERVATION_ENVIRONMENT/);
  assert.match(app, /hostname\.endsWith\("\.chatgpt\.site"\)/);
  assert.match(app, /const RESERVATIONS_ENABLED = !IS_TEST_RESERVATION_ENVIRONMENT/);
  assert.match(app, /这是测试表单，提交内容不会保存或发送给销售人员。/);
  assert.match(app, /<BookingModal open=\{bookingOpen\} onClose=\{closeBooking\} \/>/);
  assert.match(app, /if \(!RESERVATIONS_ENABLED\) \{/);
});

test("production CRM stays on the admin domain and uses its same-origin proxy", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /const CRM_APP_ORIGIN = "https:\/\/admin\.cheuknangriverside\.com"/);
  assert.match(app, /globalThis\.location\?\.origin === CRM_APP_ORIGIN \? "\/api\/crm"/);
  assert.match(app, /const target = `\$\{CRM_APP_ORIGIN\}\/\$\{globalThis\.location\?\.hash/);
  assert.doesNotMatch(app, /const target = `\$\{CRM_WORKER_ORIGIN\}/);
});

test("appointment submissions use the same-origin Pages proxy", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /const RESERVATION_ENDPOINT = "\/api\/reservations"/);
  assert.doesNotMatch(app, /CRM_WORKER_ORIGIN\}\/api\/reservations/);
});

test("homepage exposes a share title, description and phase 2 cover image", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");
  const html = await readFile(path.join(root, "index.html"), "utf8");

  assert.match(app, /className="hero-image" src=\{asset\(`\$\{PHASE2\}\/hero-aerial\.jpg`\)\}/);
  assert.match(app, /tr\("卓能河畔轩整体改造效果图"\)/);
  assert.match(app, /tr\("整体改造效果图"\)/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:image" content="https:\/\/www\.cheuknangriverside\.com\/assets\/phase2\/hero-aerial\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});
