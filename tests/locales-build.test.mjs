import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "client");
const articlePath = "insights/hangzhou-home-buying-eligibility-policy-2026";

test("build emits a homepage and ten articles plus the hub for every language", async () => {
  const routes = [
    "", "insights", "insights/chongxian-home-buying-decision-guide",
    "insights/hangzhou-home-buying-eligibility-policy-2026", "tools/hangzhou-new-home-cost-calculator",
    "insights/hangzhou-2-million-home-screening-guide", "insights/hangzhou-district-home-buying-comparison",
    "insights/hangzhou-north-home-buying-comparison", "insights/hangzhou-metro-line-15-home-buying-guide",
    "insights/hangzhou-small-apartment-selection", "insights/hangzhou-property-site-visit-guide",
    "insights/hangzhou-sales-office-viewing-checklist",
  ];
  for (const prefix of ["", "zh-hk", "en"]) {
    for (const route of routes) await access(path.join(outputRoot, prefix, route, "index.html"));
  }
});

test("English article has self canonical, reciprocal hreflang and translated content", async () => {
  const html = await readFile(path.join(outputRoot, "en", articlePath, "index.html"), "utf8");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.cheuknangriverside\.com\/en\/insights\/hangzhou-home-buying-eligibility-policy-2026\/">/);
  assert.match(html, /hreflang="zh-HK" href="https:\/\/www\.cheuknangriverside\.com\/zh-hk\/insights\/hangzhou-home-buying-eligibility-policy-2026\/"/);
  assert.match(html, /Do you still need home-buying qualifications|home purchase qualifications/i);
  assert.match(html, /class="locale-nav"/);
  assert.doesNotMatch(html, /<h1>[^<]*[\p{Script=Han}]/u);
});

test("Traditional Chinese page is localized and keeps the same page relationship", async () => {
  const html = await readFile(path.join(outputRoot, "zh-hk", articlePath, "index.html"), "utf8");
  assert.match(html, /<html lang="zh-HK">/);
  assert.match(html, /購房資格/);
  assert.match(html, /hreflang="en" href="https:\/\/www\.cheuknangriverside\.com\/en\/insights\/hangzhou-home-buying-eligibility-policy-2026\/"/);
});

test("language sitemap index references all three language maps", async () => {
  const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
  assert.match(sitemap, /<sitemapindex/);
  assert.match(sitemap, /sitemap-zh-cn\.xml/);
  assert.match(sitemap, /sitemap-zh-hk\.xml/);
  assert.match(sitemap, /sitemap-en\.xml/);
  const english = await readFile(path.join(outputRoot, "sitemap-en.xml"), "utf8");
  assert.equal((english.match(/<url>/g) || []).length, 12);
  assert.match(english, /hreflang="x-default"/);
});

test("localized interactive forms still submit to the same-origin API", async () => {
  const html = await readFile(path.join(outputRoot, "en", articlePath, "index.html"), "utf8");
  const script = await readFile(path.join(outputRoot, "en", "seo-assets", "cluster.js"), "utf8");
  assert.match(html, /action="\/api\/content-tool-leads"/);
  assert.match(script, /fetch\('\/api\/reservations'/);
});
