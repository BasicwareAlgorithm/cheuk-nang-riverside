#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectScriptStrings, extractTranslatableStrings, protectTerms, restoreTerms } from "./localization-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "content", "articles", "production-static");
const cachePath = path.join(root, "content", "articles", "locales", "en.json");
const htmlFiles = [
  "insights/index.html",
  "insights/chongxian-home-buying-decision-guide/index.html",
  "insights/hangzhou-2-million-home-screening-guide/index.html",
  "insights/hangzhou-district-home-buying-comparison/index.html",
  "insights/hangzhou-home-buying-eligibility-policy-2026/index.html",
  "insights/hangzhou-metro-line-15-home-buying-guide/index.html",
  "insights/hangzhou-north-home-buying-comparison/index.html",
  "insights/hangzhou-property-site-visit-guide/index.html",
  "insights/hangzhou-sales-office-viewing-checklist/index.html",
  "insights/hangzhou-small-apartment-selection/index.html",
  "tools/hangzhou-new-home-cost-calculator/index.html",
];

const strings = new Set();
for (const file of htmlFiles) {
  const html = await readFile(path.join(sourceRoot, file), "utf8");
  extractTranslatableStrings(html).forEach((value) => strings.add(value));
}
collectScriptStrings(await readFile(path.join(sourceRoot, "seo-assets", "cluster.js"), "utf8"), strings);

let cache = {};
try { cache = JSON.parse(await readFile(cachePath, "utf8")); } catch {}
const pending = [...strings].filter((value) => !cache[value]);
console.log(`Translation cache: ${Object.keys(cache).length} existing, ${pending.length} pending.`);

let completed = 0;
let cursor = 0;
const workers = Array.from({ length: 5 }, async () => {
  while (cursor < pending.length) {
    const index = cursor++;
    const source = pending[index];
    cache[source] = await translate(source);
    completed += 1;
    if (completed % 25 === 0 || completed === pending.length) console.log(`Translated ${completed}/${pending.length}`);
  }
});
await Promise.all(workers);
await writeFile(cachePath, `${JSON.stringify(Object.fromEntries(Object.entries(cache).sort()), null, 2)}\n`);
console.log(`Saved ${Object.keys(cache).length} translations to ${path.relative(root, cachePath)}.`);

async function translate(source) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "zh-CN");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", protectTerms(source));
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const translated = payload[0].map((part) => part[0]).join("");
      return restoreTerms(translated);
    } catch (error) {
      if (attempt === 4) throw new Error(`Could not translate: ${source.slice(0, 80)} (${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
}
