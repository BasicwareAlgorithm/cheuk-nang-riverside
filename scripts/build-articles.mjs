#!/usr/bin/env node
import { access, copyFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://www.cheuknangriverside.com";
const SITE_NAME = "卓能·河畔轩";
const BAIDU_VERIFICATION = "codeva-h41dBccEh9";
const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(modulePath), "..");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("&#039;", "&apos;");
}

function jsonForHtml(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function canonicalPath(slug) {
  return `/news/${slug}/`;
}

function absoluteUrl(value) {
  return new URL(value, `${SITE_ORIGIN}/`).href;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function normalizeBody(source) {
  const bodyMatch = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : source;
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .trim();
}

function validateArticle(article, index) {
  const label = `articles.json 第 ${index + 1} 条记录`;
  if (!article || typeof article !== "object" || Array.isArray(article)) {
    throw new Error(`${label}必须是对象。`);
  }
  for (const field of ["slug", "file", "title", "description", "summary", "publishedAt"]) {
    if (typeof article[field] !== "string" || !article[field].trim()) {
      throw new Error(`${label}缺少 ${field}。`);
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    throw new Error(`${label}的 slug 只能包含小写英文字母、数字和短横线。`);
  }
  for (const field of ["publishedAt", "updatedAt"]) {
    if (article[field] && !/^\d{4}-\d{2}-\d{2}$/.test(article[field])) {
      throw new Error(`${label}的 ${field} 必须使用 YYYY-MM-DD 格式。`);
    }
  }
  if (article.cover != null && typeof article.cover !== "string") {
    throw new Error(`${label}的 cover 必须是网址或站内资源路径。`);
  }
  return {
    ...article,
    published: article.published !== false,
    updatedAt: article.updatedAt || article.publishedAt,
  };
}

export async function loadArticles(root = defaultRoot) {
  const contentDir = path.join(root, "content", "articles");
  const manifestPath = path.join(contentDir, "articles.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) throw new Error("content/articles/articles.json 必须是 JSON 数组。");

  const articles = manifest.map(validateArticle).filter((article) => article.published);
  const slugs = new Set();
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error(`文章 slug 重复：${article.slug}`);
    slugs.add(article.slug);

    const sourcePath = path.resolve(contentDir, article.file);
    const relativePath = path.relative(contentDir, sourcePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`文章文件必须位于 content/articles 内：${article.file}`);
    }
    article.body = normalizeBody(await readFile(sourcePath, "utf8"));
    if (!article.body) throw new Error(`文章正文为空：${article.file}`);
  }
  return articles.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

async function copyPublishedSeoBundle(root, outputRoot) {
  const sourceRoot = path.join(root, "content", "articles", "production-static");
  try {
    await access(path.join(sourceRoot, "insights", "index.html"));
  } catch {
    return 0;
  }

  await Promise.all([
    cp(path.join(sourceRoot, "insights"), path.join(outputRoot, "insights"), { recursive: true, force: true }),
    cp(path.join(sourceRoot, "tools"), path.join(outputRoot, "tools"), { recursive: true, force: true }),
    cp(path.join(sourceRoot, "seo-assets"), path.join(outputRoot, "seo-assets"), { recursive: true, force: true }),
    copyFile(path.join(sourceRoot, "feed.xml"), path.join(outputRoot, "feed.xml")),
    copyFile(path.join(sourceRoot, "sitemap.xml"), path.join(outputRoot, "sitemap.xml")),
  ]);

  const [insightEntries, toolEntries] = await Promise.all([
    readdir(path.join(sourceRoot, "insights"), { withFileTypes: true }),
    readdir(path.join(sourceRoot, "tools"), { withFileTypes: true }),
  ]);
  return [...insightEntries, ...toolEntries].filter((entry) => entry.isDirectory()).length;
}

export async function loadPublishedUrls(root = defaultRoot) {
  const urls = new Set([`${SITE_ORIGIN}/`]);
  for (const article of await loadArticles(root)) urls.add(absoluteUrl(canonicalPath(article.slug)));

  try {
    const sitemap = await readFile(path.join(root, "content", "articles", "production-static", "sitemap.xml"), "utf8");
    for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) urls.add(match[1]);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return [...urls];
}

function sharedHead({ title, description, canonical, robots = "index,follow,max-image-preview:large", schema }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${escapeHtml(robots)}">
<meta name="baidu-site-verification" content="${BAIDU_VERIFICATION}">
<meta name="theme-color" content="#071d34">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="stylesheet" href="/news/article.css">
<title>${escapeHtml(title)}</title>${schema ? `
<script type="application/ld+json">${jsonForHtml(schema)}</script>` : ""}`;
}

function siteHeader() {
  return `<header class="site-header">
  <a class="brand" href="/" aria-label="返回卓能河畔轩首页">
    <img src="/assets/brand/cheuk-nang-riverside-mark.png" alt="">
    <span><strong>卓能·河畔轩</strong><small>CHEUK NANG RIVERSIDE</small></span>
  </a>
  <nav aria-label="主导航"><a href="/#project">项目</a><a href="/#location">区位</a><a href="/#homes">户型</a><a href="/news/" aria-current="page">资讯</a><a href="/#contact">联系</a></nav>
  <a class="phone" href="tel:057186309988"><small>品鉴热线</small><strong>0571 8630 9988</strong></a>
</header>`;
}

function siteFooter() {
  return `<footer><div><span>${SITE_NAME}</span><a href="/#contact">预约参观</a><small>CHEUK NANG RIVERSIDE © 2026</small></div></footer>`;
}

function renderArticle(article) {
  const canonical = absoluteUrl(canonicalPath(article.slug));
  const title = `${article.title}｜卓能河畔轩项目资讯`;
  const image = article.cover ? absoluteUrl(article.cover) : undefined;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: canonical,
        inLanguage: "zh-CN",
        author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
        publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
        ...(image ? { image: [image] } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "首页", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "项目资讯", item: `${SITE_ORIGIN}/news/` },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical },
        ],
      },
    ],
  };
  return `<!doctype html>
<html lang="zh-CN"><head>
${sharedHead({ title, description: article.description, canonical, schema })}
</head><body>
${siteHeader()}
<main class="article-page">
  <div class="breadcrumb"><a href="/">首页</a><span>/</span><a href="/news/">项目资讯</a><span>/</span><span>${escapeHtml(article.title)}</span></div>
  <header class="article-hero"><p>PROJECT JOURNAL</p><h1>${escapeHtml(article.title)}</h1><div><time datetime="${escapeHtml(article.publishedAt)}">${formatDate(article.publishedAt)}</time><span>${SITE_NAME}</span></div></header>
  ${article.cover ? `<figure class="article-cover"><img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}"></figure>` : ""}
  <article class="article-body">${article.body}</article>
  <aside class="article-cta"><div><small>PRIVATE VIEWING</small><h2>实景品鉴，亲临更见从容</h2><p>了解项目详情或预约参观，请联系我们的置业顾问。</p></div><a href="/#contact">预约参观 <span>→</span></a></aside>
  <nav class="article-back" aria-label="文章导航"><a href="/news/">← 返回全部资讯</a></nav>
</main>
${siteFooter()}
</body></html>`;
}

function renderNewsIndex(articles) {
  const canonical = `${SITE_ORIGIN}/news/`;
  const description = "卓能河畔轩项目资讯，分享杭州临平崇贤的区域发展、水岸生活、置业知识与项目动态。";
  const cards = articles.map((article) => `<article class="news-card">
    ${article.cover ? `<a class="news-cover" href="${canonicalPath(article.slug)}"><img src="${escapeHtml(article.cover)}" alt="${escapeHtml(article.title)}"></a>` : ""}
    <div><time datetime="${escapeHtml(article.publishedAt)}">${formatDate(article.publishedAt)}</time><h2><a href="${canonicalPath(article.slug)}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.summary)}</p><a class="read-more" href="${canonicalPath(article.slug)}">阅读全文 <span>→</span></a></div>
  </article>`).join("\n");
  const schema = articles.length ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "卓能河畔轩项目资讯",
    description,
    url: canonical,
    inLanguage: "zh-CN",
  } : undefined;
  return `<!doctype html>
<html lang="zh-CN"><head>
${sharedHead({
    title: "项目资讯｜卓能·河畔轩",
    description,
    canonical,
    robots: articles.length ? "index,follow,max-image-preview:large" : "noindex,follow",
    schema,
  })}
</head><body>
${siteHeader()}
<main class="news-page">
  <header class="news-hero"><p>PROJECT JOURNAL</p><h1>项目资讯</h1><span>读懂杭州大城北的水岸生活与置业价值</span></header>
  <section class="news-list" aria-label="文章列表">${cards || '<div class="news-empty"><p>项目资讯正在整理中</p><span>首批文章发布后，将在这里集中展示。</span><a href="/">返回项目首页</a></div>'}</section>
</main>
${siteFooter()}
</body></html>`;
}

function render404() {
  const canonical = `${SITE_ORIGIN}/404.html`;
  return `<!doctype html><html lang="zh-CN"><head>${sharedHead({
    title: "页面未找到｜卓能·河畔轩",
    description: "您访问的页面不存在。",
    canonical,
    robots: "noindex,nofollow",
  })}</head><body>${siteHeader()}<main class="not-found"><p>404</p><h1>页面未找到</h1><span>您访问的内容可能已移动或不存在。</span><a href="/">返回项目首页</a></main>${siteFooter()}</body></html>`;
}

function renderSitemap(articles) {
  const entries = [
    { loc: `${SITE_ORIGIN}/`, lastmod: articles[0]?.updatedAt },
    ...(articles.length ? [{ loc: `${SITE_ORIGIN}/news/`, lastmod: articles[0].updatedAt }] : []),
    ...articles.map((article) => ({ loc: absoluteUrl(canonicalPath(article.slug)), lastmod: article.updatedAt })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url><loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

const ARTICLE_CSS = `:root{--ink:#102536;--navy:#071d34;--gold:#aa8449;--paper:#f4f0e9;--line:#d8d1c6;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{background:var(--paper);margin:0}a{color:inherit;text-decoration:none}img{display:block;max-width:100%}.site-header{align-items:center;background:rgba(244,240,233,.97);border-bottom:1px solid var(--line);display:grid;grid-template-columns:280px 1fr 180px;height:76px;padding:0 clamp(24px,4vw,68px);position:sticky;top:0;z-index:20}.brand{align-items:center;display:flex;gap:12px}.brand img{height:38px;width:38px}.brand span{display:grid}.brand strong{font-family:"Songti SC",serif;font-size:16px;font-weight:400;letter-spacing:.14em}.brand small{font-family:Georgia,serif;font-size:6px;letter-spacing:.15em}.site-header nav{display:flex;gap:clamp(18px,2.2vw,38px);justify-content:center}.site-header nav a{font-size:12px;letter-spacing:.13em}.site-header nav a[aria-current=page]{color:var(--gold)}.phone{display:grid;justify-self:end}.phone small{font-size:8px;letter-spacing:.2em}.phone strong{font-family:Georgia,serif;font-size:13px;font-weight:400}.article-page,.news-page{margin:auto;max-width:1180px;padding:0 28px}.breadcrumb{color:#6d767c;display:flex;font-size:12px;gap:10px;overflow:hidden;padding:34px 0 0;white-space:nowrap}.breadcrumb>span:last-child{overflow:hidden;text-overflow:ellipsis}.article-hero{border-bottom:1px solid var(--line);padding:70px 0 54px}.article-hero>p,.news-hero>p{color:var(--gold);font-family:Georgia,serif;font-size:10px;letter-spacing:.3em}.article-hero h1{font-family:"Songti SC",serif;font-size:clamp(38px,5.8vw,72px);font-weight:400;letter-spacing:.04em;line-height:1.3;margin:24px 0 30px;max-width:980px;text-wrap:balance}.article-hero>div{color:#70787d;display:flex;font-size:12px;gap:28px}.article-cover{margin:58px 0 0}.article-cover img{max-height:680px;object-fit:cover;width:100%}.article-body{font-family:"Songti SC","STSong",serif;font-size:18px;line-height:2;margin:70px auto;max-width:780px}.article-body h2,.article-body h3{color:var(--ink);font-weight:500;line-height:1.45;margin:2.2em 0 .8em}.article-body h2{font-size:32px}.article-body h3{font-size:24px}.article-body p{margin:0 0 1.4em}.article-body a{border-bottom:1px solid var(--gold);color:#765526}.article-body blockquote{border-left:3px solid var(--gold);color:#586673;margin:2em 0;padding:.4em 0 .4em 1.5em}.article-body figure,.article-body img{margin:2.4em auto}.article-body figcaption{color:#7a8185;font-family:sans-serif;font-size:12px;text-align:center}.article-body table{border-collapse:collapse;display:block;margin:2em 0;max-width:100%;overflow:auto}.article-body th,.article-body td{border:1px solid var(--line);padding:10px 14px}.article-cta{align-items:center;background:var(--navy);color:white;display:grid;gap:40px;grid-template-columns:1fr auto;margin:90px 0 40px;padding:48px 56px}.article-cta small{color:#d5b97e;font-family:Georgia,serif;font-size:9px;letter-spacing:.28em}.article-cta h2{font-family:"Songti SC",serif;font-size:30px;font-weight:400;margin:14px 0}.article-cta p{color:#aeb9c3;margin:0}.article-cta>a{border:1px solid #d5b97e;padding:16px 20px}.article-cta>a span,.read-more span{margin-left:22px}.article-back{border-top:1px solid var(--line);padding:28px 0 90px}.news-hero{padding:110px 0 85px}.news-hero h1{font-family:"Songti SC",serif;font-size:clamp(48px,7vw,84px);font-weight:400;letter-spacing:.12em;margin:22px 0}.news-hero>span{color:#65717a;letter-spacing:.08em}.news-list{border-top:1px solid var(--line);padding:10px 0 100px}.news-card{border-bottom:1px solid var(--line);display:grid;gap:48px;grid-template-columns:minmax(260px,38%) 1fr;padding:48px 0}.news-cover{aspect-ratio:16/10;overflow:hidden}.news-cover img{height:100%;object-fit:cover;transition:transform .5s ease;width:100%}.news-cover:hover img{transform:scale(1.025)}.news-card time{color:var(--gold);font-family:Georgia,serif;font-size:11px}.news-card h2{font-family:"Songti SC",serif;font-size:30px;font-weight:400;line-height:1.45;margin:14px 0}.news-card p{color:#65717a;line-height:1.8;margin:0 0 24px}.read-more{font-size:13px;letter-spacing:.08em}.news-empty{padding:100px 0;text-align:center}.news-empty p{font-family:"Songti SC",serif;font-size:32px;margin:0}.news-empty span{color:#727b80;display:block;margin:20px 0 34px}.news-empty a,.not-found a{border-bottom:1px solid var(--ink);padding-bottom:5px}.not-found{min-height:70vh;padding:16vh 24px;text-align:center}.not-found>p{color:var(--gold);font-family:Georgia,serif;font-size:18px;letter-spacing:.3em}.not-found h1{font-family:"Songti SC",serif;font-size:52px;font-weight:400}.not-found span{color:#727b80;display:block;margin:20px 0 40px}footer{background:#041526;color:#fff;padding:42px clamp(24px,5vw,72px)}footer>div{align-items:center;display:grid;grid-template-columns:1fr auto auto;gap:40px;margin:auto;max-width:1180px}footer span{font-family:"Songti SC",serif;letter-spacing:.12em}footer a{border-bottom:1px solid #bea16e;padding-bottom:4px}footer small{font-family:Georgia,serif;font-size:8px;letter-spacing:.18em;opacity:.5}@media(max-width:800px){.site-header{grid-template-columns:1fr auto;height:70px;padding:0 20px}.site-header nav{display:none}.phone small{display:none}.phone strong{font-size:11px}.article-page,.news-page{padding:0 20px}.article-hero{padding:50px 0 38px}.article-hero h1{font-size:clamp(34px,10vw,48px);letter-spacing:.02em}.article-cover{margin-top:34px}.article-body{font-size:17px;line-height:1.95;margin:48px auto}.article-body h2{font-size:27px}.article-body h3{font-size:22px}.article-body img{height:auto!important;width:100%!important}.article-cta{align-items:start;grid-template-columns:1fr;margin-top:60px;padding:34px 26px}.article-cta h2{font-size:25px}.news-hero{padding:72px 0 52px}.news-card{gap:24px;grid-template-columns:1fr;padding:34px 0}.news-card h2{font-size:26px}.news-cover{aspect-ratio:16/9}footer>div{align-items:start;grid-template-columns:1fr;gap:22px}}@media(max-width:380px){.brand strong{font-size:14px}.phone{display:none}.site-header{grid-template-columns:1fr}.article-page,.news-page{padding:0 16px}}`;

export async function buildArticleSite({ root = defaultRoot } = {}) {
  const outputRoot = path.join(root, "dist", "client");
  await readFile(path.join(outputRoot, "index.html"));
  const articles = await loadArticles(root);
  const newsRoot = path.join(outputRoot, "news");
  await mkdir(newsRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(newsRoot, "article.css"), ARTICLE_CSS),
    writeFile(path.join(newsRoot, "index.html"), renderNewsIndex(articles)),
    writeFile(path.join(outputRoot, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /qa/\nDisallow: /qa-v2/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`),
    writeFile(path.join(outputRoot, "sitemap.xml"), renderSitemap(articles)),
    writeFile(path.join(outputRoot, "404.html"), render404()),
  ]);
  await Promise.all(articles.map(async (article) => {
    const articleDir = path.join(newsRoot, article.slug);
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, "index.html"), renderArticle(article));
  }));
  const bundledArticleCount = await copyPublishedSeoBundle(root, outputRoot);
  return { articleCount: articles.length + bundledArticleCount, outputRoot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const result = await buildArticleSite();
  console.log(`Prepared SEO article pages: ${result.articleCount} published article(s)`);
}
