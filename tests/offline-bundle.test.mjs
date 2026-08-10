import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const offlineHtmlPath = path.join(projectRoot, "卓能河畔轩-离线版.html");

const expectedRuntimeAssets = [
  "/assets/ppt/project-film.mp4",
  "/assets/ppt/chapter-world.jpg",
  "/assets/ppt/community-aerial.jpg",
  "/assets/ppt/facade.jpg",
  "/assets/ppt/chapter-hangzhou.jpg",
  "/assets/ppt/location-map.jpg",
  "/assets/ppt/river-view.jpeg",
  "/assets/ppt/river-walk.jpeg",
  "/assets/ppt/city-view.png",
  "/assets/ppt/interior.jpeg",
  "/assets/ppt/interior-panorama.jpg",
  "/assets/ppt/unit-a1.jpg",
  "/assets/ppt/unit-a2.jpg",
  "/assets/ppt/unit-d5.jpg",
  "/assets/ppt/unit-f2.jpg",
  "/assets/ppt/contact.jpg",
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
    assert.ok(Buffer.from(assets[assetPath].split(",", 2)[1], "base64").length > 10_000);
  }

  assert.match(html, /卓能河畔轩/);
  assert.match(html, /项目影片/);
  assert.match(html, /86309988/);
  assert.doesNotMatch(html, /assets\/generated/);
});
