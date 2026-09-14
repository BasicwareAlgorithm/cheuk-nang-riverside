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
  assert.doesNotMatch(app, /\[\s*["']1973["']\s*,\s*["']港交所上市["']/);
  assert.doesNotMatch(app, /租房不如买房/);
});

test("phase 2 source assets required by the homepage are local", async () => {
  const assets = [
    "hero-aerial.jpg", "arrival-gate.jpg", "clubhouse-lawn.jpg", "playground.jpg",
    "garden-club.jpg", "location-map.jpg", "small-living.jpg", "small-bedroom.jpg",
    "large-living.jpg", "large-bedroom.jpg", "unit-a1.jpg", "unit-a2.jpg",
    "unit-d5.jpg", "unit-f2.jpg",
  ];

  for (const asset of assets) {
    await access(path.join(root, "public", "assets", "phase2", asset));
  }
});

test("phase 2 sections cover community renewal, show homes and home selection", async () => {
  const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");

  assert.match(app, /id="community"/);
  assert.match(app, /id="interiors"/);
  assert.match(app, /id="homes"/);
  assert.match(app, /鎏光逸境 焕新社区/);
  assert.match(app, /从空间尺度 预见生活日常/);
  assert.match(app, /document\.getElementById\(id\)\?\.scrollIntoView/);
});
