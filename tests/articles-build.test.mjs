import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildArticleSite } from "../scripts/build-articles.mjs";

async function createFixture(manifest, files = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "cheuk-nang-articles-"));
  await mkdir(path.join(root, "content", "articles"), { recursive: true });
  await mkdir(path.join(root, "dist", "client"), { recursive: true });
  await writeFile(path.join(root, "content", "articles", "articles.json"), JSON.stringify(manifest));
  await writeFile(path.join(root, "dist", "client", "index.html"), "<!doctype html><title>home</title>");
  await Promise.all(Object.entries(files).map(([name, body]) => writeFile(path.join(root, "content", "articles", name), body)));
  return root;
}

test("builds crawlable article pages, an index, robots and a sitemap", async (t) => {
  const root = await createFixture([
    {
      slug: "riverside-living",
      file: "riverside-living.html",
      title: "杭州水岸生活指南",
      description: "了解杭州水岸生活方式。",
      summary: "从公园、交通与日常配套理解水岸生活。",
      publishedAt: "2026-08-18",
      cover: "/assets/ppt/river-view.jpeg",
    },
  ], {
    "riverside-living.html": "<!doctype html><html><head><title>ignored</title></head><body><h2>正文标题</h2><p>可直接抓取的正文。</p><script>alert('no')</script></body></html>",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await buildArticleSite({ root });
  assert.equal(result.articleCount, 1);

  const article = await readFile(path.join(root, "dist", "client", "news", "riverside-living", "index.html"), "utf8");
  assert.match(article, /<h1>杭州水岸生活指南<\/h1>/);
  assert.match(article, /可直接抓取的正文/);
  assert.doesNotMatch(article, /alert\('no'\)/);
  assert.match(article, /rel="canonical" href="https:\/\/www\.cheuknangriverside\.com\/news\/riverside-living\/"/);
  assert.match(article, /"@type":"Article"/);

  const index = await readFile(path.join(root, "dist", "client", "news", "index.html"), "utf8");
  assert.match(index, /href="\/news\/riverside-living\/"/);
  assert.match(index, /杭州水岸生活指南/);

  const sitemap = await readFile(path.join(root, "dist", "client", "sitemap.xml"), "utf8");
  assert.match(sitemap, /https:\/\/www\.cheuknangriverside\.com\/news\/riverside-living\//);

  const robots = await readFile(path.join(root, "dist", "client", "robots.txt"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/www\.cheuknangriverside\.com\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
});

test("rejects unsafe article slugs before writing a public page", async (t) => {
  const root = await createFixture([
    {
      slug: "../outside",
      file: "article.html",
      title: "标题",
      description: "说明",
      summary: "摘要",
      publishedAt: "2026-08-18"
    },
  ], { "article.html": "<p>正文</p>" });
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(() => buildArticleSite({ root }), /slug 只能包含/);
});

test("mounts a complete prebuilt SEO content bundle without changing its HTML", async (t) => {
  const root = await createFixture([]);
  t.after(() => rm(root, { recursive: true, force: true }));
  const bundle = path.join(root, "content", "articles", "production-static");
  await Promise.all([
    mkdir(path.join(bundle, "insights", "guide-one"), { recursive: true }),
    mkdir(path.join(bundle, "tools", "calculator"), { recursive: true }),
    mkdir(path.join(bundle, "seo-assets"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(bundle, "insights", "index.html"), "<h1>文章中心</h1>"),
    writeFile(path.join(bundle, "insights", "guide-one", "index.html"), "<h1>指南正文</h1>"),
    writeFile(path.join(bundle, "tools", "calculator", "index.html"), "<h1>计算器正文</h1>"),
    writeFile(path.join(bundle, "seo-assets", "base.css"), "body{color:#123}"),
    writeFile(path.join(bundle, "feed.xml"), "<rss></rss>"),
    writeFile(path.join(bundle, "sitemap.xml"), "<urlset><url><loc>https://www.cheuknangriverside.com/insights/guide-one/</loc></url></urlset>"),
  ]);

  const result = await buildArticleSite({ root });
  assert.equal(result.articleCount, 2);
  assert.equal(await readFile(path.join(root, "dist", "client", "insights", "guide-one", "index.html"), "utf8"), "<h1>指南正文</h1>");
  assert.equal(await readFile(path.join(root, "dist", "client", "tools", "calculator", "index.html"), "utf8"), "<h1>计算器正文</h1>");
  assert.equal(await readFile(path.join(root, "dist", "client", "seo-assets", "base.css"), "utf8"), "body{color:#123}");
  assert.match(await readFile(path.join(root, "dist", "client", "sitemap.xml"), "utf8"), /insights\/guide-one/);
});

test("published article lead forms submit to the existing reservation API", async () => {
  const clusterScript = await readFile(new URL("../content/articles/production-static/seo-assets/cluster.js", import.meta.url), "utf8");
  const chongxianArticle = await readFile(new URL("../content/articles/production-static/insights/chongxian-home-buying-decision-guide/index.html", import.meta.url), "utf8");
  for (const source of [clusterScript, chongxianArticle]) {
    assert.match(source, /fetch\('\/api\/reservations'/);
    assert.doesNotMatch(source, /正式部署接通接口后/);
  }
});
