import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const offlineHtmlPath = path.join(projectRoot, "卓能河畔轩-离线版.html");

const expectedRuntimeAssets = [
  "/assets/brand/cheuk-nang-riverside-mark.png",
  "/assets/ppt/project-film.mp4",
  "/assets/ppt/group-estate.jpeg",
  "/assets/ppt/hangzhou-city-clean.jpg",
  "/assets/ppt/interior-panorama.jpg",
  "/assets/ppt/contact-clean.jpg",
  "/assets/phase2/hero-aerial.jpg",
  "/assets/phase2/arrival-gate.jpg",
  "/assets/phase2/location-map.jpg",
  "/assets/phase2/playground.jpg",
  "/assets/phase2/clubhouse-lawn.jpg",
  "/assets/phase2/garden-club.jpg",
  "/assets/phase2/small-living.jpg",
  "/assets/phase2/small-bedroom.jpg",
  "/assets/phase2/large-living.jpg",
  "/assets/phase2/large-bedroom.jpg",
  "/assets/phase2/unit-a1.jpg",
  "/assets/phase2/unit-a2.jpg",
  "/assets/phase2/unit-d5.jpg",
  "/assets/phase2/unit-f2.jpg",
];

test("offline HTML embeds its runtime, styles, and image assets", async () => {
  const html = await readFile(offlineHtmlPath, "utf8");
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<style>[^]*<\/style>/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet/i);

  const prefix = "globalThis.__OFFLINE_ASSETS__ = Object.freeze(";
  const start = html.indexOf(prefix);
  const end = html.indexOf(");</script>", start);
  assert.notEqual(start, -1, "offline asset map must exist");
  assert.notEqual(end, -1, "offline asset map must be closed");

  const assets = JSON.parse(html.slice(start + prefix.length, end));
  assert.ok(Object.keys(assets).length >= expectedRuntimeAssets.length);

  for (const assetPath of expectedRuntimeAssets) {
    assert.match(assets[assetPath], /^data:(?:image\/(?:jpeg|png|webp)|video\/mp4);base64,/);
    const minimumBytes = assetPath.includes("/assets/brand/") ? 1_000 : 10_000;
    assert.ok(Buffer.from(assets[assetPath].split(",", 2)[1], "base64").length > minimumBytes);
  }

  assert.match(html, /卓能河畔轩/);
  assert.match(html, /项目影片/);
  assert.match(html, /86309988/);
  assert.doesNotMatch(html, /assets\/generated/);
});
