#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import OpenCC from "opencc-js";
import { collectScriptStrings, hasHan, LOCALES, pageUrl, SITE_ORIGIN, walkJson } from "./localization-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "client");
const sourceRoot = path.join(root, "content", "articles", "production-static");
const cache = JSON.parse(await readFile(path.join(root, "content", "articles", "locales", "en.json"), "utf8"));
const toHongKong = OpenCC.Converter({ from: "cn", to: "hk" });
const pages = [
  "/",
  "/insights/",
  "/insights/chongxian-home-buying-decision-guide/",
  "/insights/hangzhou-home-buying-eligibility-policy-2026/",
  "/tools/hangzhou-new-home-cost-calculator/",
  "/insights/hangzhou-2-million-home-screening-guide/",
  "/insights/hangzhou-district-home-buying-comparison/",
  "/insights/hangzhou-north-home-buying-comparison/",
  "/insights/hangzhou-metro-line-15-home-buying-guide/",
  "/insights/hangzhou-small-apartment-selection/",
  "/insights/hangzhou-property-site-visit-guide/",
  "/insights/hangzhou-sales-office-viewing-checklist/",
];

const homeMeta = {
  "zh-CN": {
    title: "卓能·河畔轩｜杭州临平崇贤实景现房",
    description: "卓能河畔轩位于杭州临平崇贤，邻近地铁与公园，建面约65-138㎡实景现房。了解项目、区位、生活配套、户型与预约参观信息。",
    name: "卓能·河畔轩",
  },
  "zh-HK": {
    title: "卓能·河畔軒｜杭州臨平崇賢實景現房",
    description: "卓能河畔軒位於杭州臨平崇賢，鄰近地鐵與公園，建面約65至138平方米。了解項目、區位、生活配套、戶型及預約參觀資訊。",
    name: "卓能·河畔軒",
  },
  en: {
    title: "Cheuk Nang Riverside | Completed Homes in Chongxian, Hangzhou",
    description: "Explore Cheuk Nang Riverside in Chongxian, Linping, Hangzhou: completed homes of approximately 65–138 sq m, transport links, amenities, floor plans and viewing appointments.",
    name: "Cheuk Nang Riverside",
  },
};

const englishOverrides = {
  "杭州买房置业指南｜政策、预算、区域、户型与看房核验": "Hangzhou Home-Buying Guide | Policy, Budget, Location and Viewings",
  "杭州买房置业指南，覆盖政策资格、首付税费、区域通勤、户型选择、房屋状态和售楼处核验。": "A practical Hangzhou home-buying guide covering eligibility, purchase costs, commuting, floor plans, property condition and sales-office checks.",
  "杭州买房：从资格到现场看房": "Buying a Home in Hangzhou: From Eligibility to the Site Visit",
  "2026杭州买房需要资格吗？限购、摇号、贷款与落户一次讲清": "Buying a Home in Hangzhou in 2026: Eligibility, Loans and Household Registration",
  "2026年在杭州买普通商品住房还需要户籍、社保或购房资格吗？按官方文件说明限购、摇号、首付、公积金和购房落户的区别。": "Do buyers still need local household registration, social-security records or purchase eligibility for ordinary homes in Hangzhou in 2026? This guide explains the current rules for purchase restrictions, lotteries, down payments, provident-fund loans and household registration.",
  "2026年在杭州买房，还需要购房资格吗？": "Do You Need Home-Purchase Eligibility in Hangzhou in 2026?",
  "杭州买新房要准备多少钱？首付、契税、维修资金与月供计算": "Buying a New Home in Hangzhou: Down Payment, Taxes, Maintenance Fund and Mortgage",
  "杭州买新房除了房款还要准备哪些钱？按2026年官方口径拆解契税、物业专项维修资金、登记费、月供和入住费用，并提供可修改参数的计算器。": "Estimate the costs beyond the purchase price of a new Hangzhou home, including deed tax, the property maintenance fund, registration, mortgage payments and move-in expenses, with an adjustable calculator.",
  "在杭州买一套新房，房款之外还要准备多少钱？": "What Costs Come with a New Home in Hangzhou Beyond the Purchase Price?",
  "杭州总价200万怎么买房？先算真实上限，再按通勤和户型筛房": "Buying in Hangzhou with a RMB 2 Million Budget: Set Your Limit, Then Compare",
  "总预算200万元在杭州怎样筛新房？从税费预留、贷款能力、通勤、户型和交付风险五步倒推可看房源，避免被低总价宣传带偏。": "How to shortlist new homes in Hangzhou with a total budget of RMB 2 million by allowing for taxes, borrowing capacity, commuting, floor-plan needs and delivery risk.",
  "总预算200万元，在杭州应该怎样筛房？": "How Should You Shortlist Homes in Hangzhou with a RMB 2 Million Budget?",
  "杭州买房哪个区域适合自己？通勤、家庭与预算选择方法": "Choosing a Hangzhou District: Commute, Family Support and Budget",
  "杭州买房不知道选哪个区？不做楼盘排名，按工作地点、家庭支持、总预算和居住年限建立区域清单，并说明城北崇贤适合哪些购房者。": "Choose a Hangzhou district by work location, family support, total budget and intended length of stay, with guidance on who may find Chongxian in north Hangzhou suitable.",
  "杭州买房哪个区域适合自己？从工作地、家庭和预算开始": "Which Hangzhou District Suits You? Start with Work, Family and Budget",
  "杭州城北买房怎么选？运河新城、良渚、崇贤比较方法": "Buying in North Hangzhou: Comparing Canal New City, Liangzhu and Chongxian",
  "杭州城北不是单一板块。按通勤、行政区、现有配套、户型和规划兑现度，比较拱墅北、良渚与崇贤，附实地看房方法。": "North Hangzhou is not one uniform market. Compare north Gongshu, Liangzhu and Chongxian by commute, district, existing amenities, floor plans and delivery of planned infrastructure.",
  "杭州城北买房怎么选？用一张表比较三种生活圈": "Buying in North Hangzhou: Compare Three Living Areas Side by Side",
  "在崇贤买房，适合什么样的人？预算、通勤与看房重点": "Who Is Chongxian Right For? Budget, Commute and Viewing Priorities",
  "崇贤买房子好吗？先看工作日通勤、总预算和真实户型，再了解卓能河畔轩的项目实景、约65—138㎡户型与地铁15号线相关区位。": "Is Chongxian a good fit for your household? Start with weekday commuting, total budget and usable floor plans, then explore Cheuk Nang Riverside, its completed setting, approximately 65–138 sq m homes and location near the planned Metro Line 15.",
  "在崇贤买房，适合什么样的人？": "Who Is Buying a Home in Chongxian Right For?",
  "杭州地铁15号线沿线买房指南：站点、通勤与看房核验": "Buying Near Hangzhou Metro Line 15: Stations, Commutes and Site Checks",
  "杭州地铁15号线一期仍在建设。沿线买房别只看站点图：核对现状通勤、未来步行距离、换乘成本和住房本身，并以崇贤为例。": "Phase 1 of Hangzhou Metro Line 15 is under construction. Assess today's commute, future walking distance, transfer time and the home itself, using Chongxian as an example.",
  "杭州地铁15号线沿线买房，先算“门到门”时间": "Buying Near Hangzhou Metro Line 15? Calculate Door-to-Door Time First",
  "杭州小户型怎么选？65㎡、67㎡与88㎡的真实取舍": "Choosing a Compact Hangzhou Home: Comparing 65, 67 and 88 sq m",
  "杭州小户型选一房还是两房？从常住人数、居家办公、收纳、净尺寸和五年家庭变化出发，并用卓能河畔轩官网户型作尺度案例。": "Choose between one- and two-bedroom compact homes by considering household size, remote work, storage, usable dimensions and likely family changes over five years, with Cheuk Nang Riverside floor plans as examples.",
  "杭州小户型怎么选？用五笔空间账找到合适户型": "How to Choose a Compact Hangzhou Home: Five Practical Space Checks",
  "杭州买房为什么要看实景？楼栋、园区、户型一次看明白": "Why Site Visits Matter When Buying in Hangzhou",
  "杭州新房实景怎么看？按周边、园区、楼栋、归家动线和户型五站体验，并以卓能河畔轩约65—138㎡户型为例给出看房顺序。": "A five-stage site-visit guide covering the neighbourhood, grounds, building, arrival route and floor plan, with approximately 65–138 sq m homes at Cheuk Nang Riverside as examples.",
  "杭州售楼处看房要问什么？一份可直接照着走的清单": "What to Ask at a Hangzhou Sales Office: A Practical Viewing Checklist",
  "杭州新房售楼处看房清单，覆盖证照、具体房源、户型净尺寸、采光噪声、园区车库、费用、合同和离场复盘，可逐项勾选。": "A step-by-step Hangzhou new-home viewing checklist covering permits, specific units, usable dimensions, daylight, noise, grounds, parking, fees, contracts and follow-up notes.",
  "第一次去杭州售楼处：按这份清单高效看房": "Your First Visit to a Hangzhou Sales Office: A Step-by-Step Checklist",
  "首页": "Home",
  "项目": "Project",
  "区位": "Location",
  "户型": "Floor Plans",
  "置业指南": "Buyer Guides",
  "项目官网": "Project Website",
  "电话咨询": "Call Us",
  "手机号码": "Mobile Number",
};

for (const locale of Object.keys(LOCALES)) {
  await buildHome(locale);
  for (const pagePath of pages.slice(1)) await buildArticlePage(locale, pagePath);
  await writeLocalizedScript(locale);
  await writeLanguageSitemap(locale);
}
await writeSitemapIndex();
console.log(`Generated ${pages.length * Object.keys(LOCALES).length} localized pages and 3 language sitemaps.`);

async function buildHome(locale) {
  const source = await readFile(path.join(outputRoot, "index.html"), "utf8");
  const $ = cheerio.load(source, { decodeEntities: false });
  const canonical = pageUrl(locale, "/");
  $("html").attr("lang", locale);
  $("title").text(homeMeta[locale].title);
  $('meta[name="description"]').attr("content", homeMeta[locale].description);
  $('link[rel="canonical"]').attr("href", canonical);
  setAlternates($, "/");
  localizeStructuredData($, locale, "/", homeMeta[locale].name);
  const destination = localizedFile(locale, "/");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, $.html());
}

async function buildArticlePage(locale, pagePath) {
  const sourceFile = path.join(sourceRoot, pagePath.replace(/^\//, ""), "index.html");
  const source = await readFile(sourceFile, "utf8");
  const $ = cheerio.load(source, { decodeEntities: false });
  normalizeAssets($, pagePath);
  if (locale !== "zh-CN") translateDocument($, locale);
  $("html").attr("lang", locale);
  $('meta[property="og:locale"]').attr("content", LOCALES[locale].og);
  const canonical = pageUrl(locale, pagePath);
  $('link[rel="canonical"]').attr("href", canonical);
  $('meta[property="og:url"]').attr("content", canonical);
  setAlternates($, pagePath);
  rewriteInternalLinks($, locale);
  localizeStructuredData($, locale, pagePath);
  injectLanguageNav($, locale, pagePath);
  $("[data-local-href]").removeAttr("data-local-href");
  $("script[src$='/seo-assets/cluster.js'],script[src='/seo-assets/cluster.js']").attr("src", `${LOCALES[locale].prefix}/seo-assets/cluster.js` || "/seo-assets/cluster.js");
  const destination = localizedFile(locale, pagePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, $.html());
}

function translateDocument($, locale) {
  $("*").contents().each((_, node) => {
    if (node.type !== "text" || ["script", "style", "noscript"].includes(node.parent?.name)) return;
    node.data = translatePreservingWhitespace(node.data, locale);
  });
  for (const attribute of ["content", "alt", "title", "aria-label", "placeholder", "data-title", "data-body", "data-checks"]) {
    $(`[${attribute}]`).each((_, element) => {
      const value = $(element).attr(attribute);
      if (hasHan(value)) $(element).attr(attribute, translate(value, locale));
    });
  }
  $('input[type="hidden"][value]').each((_, element) => {
    const value = $(element).attr("value");
    if (hasHan(value)) $(element).attr("value", translate(value, locale));
  });
  $("script:not([src]):not([type='application/ld+json'])").each((_, element) => {
    $(element).html(translateScript($(element).html() || "", locale));
  });
}

function translatePreservingWhitespace(value, locale) {
  if (!hasHan(value)) return value;
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  return `${leading}${translate(value.trim(), locale)}${trailing}`;
}

function translate(value, locale) {
  if (!hasHan(value)) return value;
  if (locale === "zh-HK") return toHongKong(value)
    .replaceAll("卓能·河畔軒", "卓能·河畔軒")
    .replaceAll("手機號碼", "手提電話號碼");
  const translated = englishOverrides[value] || cache[value];
  if (!translated) throw new Error(`Missing English translation: ${value.slice(0, 100)}`);
  return translated;
}

function translateScript(source, locale) {
  const known = collectScriptStrings(source);
  let output = source;
  for (const value of [...known].sort((a, b) => b.length - a.length)) output = output.replaceAll(value, translate(value, locale));
  return output;
}

function normalizeAssets($, pagePath) {
  for (const attribute of ["src", "href"]) {
    $(`[${attribute}]`).each((_, element) => {
      const value = $(element).attr(attribute);
      if (!value || /^(?:https?:|tel:|mailto:|#|data:)/.test(value)) return;
      const normalized = new URL(value, `${SITE_ORIGIN}${pagePath}`).pathname;
      $(element).attr(attribute, normalized);
    });
  }
}

function rewriteInternalLinks($, locale) {
  $("a[href]").each((_, element) => {
    const value = $(element).attr("href");
    if (!value || /^(?:#|tel:|mailto:|javascript:)/.test(value)) return;
    let url;
    try { url = new URL(value, SITE_ORIGIN); } catch { return; }
    if (url.origin !== SITE_ORIGIN) return;
    const pathName = url.pathname.replace(/^\/(?:en|zh-hk)(?=\/|$)/, "") || "/";
    $(element).attr("href", `${LOCALES[locale].prefix}${pathName}${url.search}${url.hash}` || "/");
  });
}

function localizeStructuredData($, locale, pagePath, forcedName) {
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      let schema = JSON.parse($(element).html());
      schema = walkJson(schema, (value) => {
        if (/^https:\/\/www\.cheuknangriverside\.com(?:\/|$)/.test(value)) {
          const url = new URL(value);
          const plainPath = url.pathname.replace(/^\/(?:en|zh-hk)(?=\/|$)/, "") || "/";
          const isSharedAsset = /^\/(?:assets|seo-assets)(?:\/|$)/.test(plainPath);
          return `${SITE_ORIGIN}${isSharedAsset ? "" : LOCALES[locale].prefix}${plainPath}${url.search}${url.hash}`;
        }
        if (value === "zh-CN") return locale;
        if (forcedName && ["卓能·河畔轩", "卓能河畔轩"].includes(value)) return forcedName;
        return locale === "zh-CN" ? value : translate(value, locale);
      });
      $(element).text(JSON.stringify(schema));
    } catch (error) {
      throw new Error(`Invalid JSON-LD in ${pagePath}: ${error.message}`);
    }
  });
}

function setAlternates($, pagePath) {
  $('link[rel="alternate"][hreflang]').remove();
  for (const locale of Object.keys(LOCALES)) $("head").append(`<link rel="alternate" hreflang="${LOCALES[locale].hreflang}" href="${pageUrl(locale, pagePath)}">`);
  $("head").append(`<link rel="alternate" hreflang="x-default" href="${pageUrl("zh-CN", pagePath)}">`);
}

function injectLanguageNav($, locale, pagePath) {
  $(".locale-nav").remove();
  const links = Object.keys(LOCALES).map((target) => `<a${target === locale ? ' aria-current="page"' : ""} href="${pageUrl(target, pagePath)}" hreflang="${LOCALES[target].hreflang}" lang="${target}">${LOCALES[target].label}</a>`).join("");
  const nav = `<nav class="locale-nav" aria-label="Language">${links}</nav>`;
  if ($(".header-inner").length) $(".header-inner").append(nav);
  else $("body").prepend(nav);
  $("head").append(`<style>
.locale-nav{align-items:center;display:flex;gap:0;justify-content:center}.locale-nav a{color:inherit;font-size:11px;letter-spacing:.04em;opacity:.58;padding:7px 9px;white-space:nowrap}.locale-nav a+a{border-left:1px solid rgba(116,103,86,.25)}.locale-nav a[aria-current=page]{opacity:1;text-decoration:underline;text-underline-offset:5px}.cluster-hub~.locale-nav,body>.locale-nav{background:#f5f0e8;color:#13273a;padding:14px;position:relative;z-index:3}@media(max-width:900px){.site-header .locale-nav{display:none}body>.locale-nav{display:flex}.main-nav{display:none!important}}@media(min-width:901px){.header-inner .locale-nav{margin-left:auto}.header-inner:has(.locale-nav) .header-conversion{margin-left:10px}}
</style>`);
}

async function writeLocalizedScript(locale) {
  const source = await readFile(path.join(sourceRoot, "seo-assets", "cluster.js"), "utf8");
  const content = locale === "zh-CN" ? source : translateScript(source, locale);
  const destination = path.join(outputRoot, LOCALES[locale].prefix.replace(/^\//, ""), "seo-assets", "cluster.js");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

function localizedFile(locale, pagePath) {
  return path.join(outputRoot, LOCALES[locale].prefix.replace(/^\//, ""), pagePath.replace(/^\//, ""), "index.html");
}

async function writeLanguageSitemap(locale) {
  const body = pages.map((pagePath) => `  <url>\n    <loc>${pageUrl(locale, pagePath)}</loc>\n    <lastmod>2026-08-18</lastmod>\n${Object.keys(LOCALES).map((target) => `    <xhtml:link rel="alternate" hreflang="${LOCALES[target].hreflang}" href="${pageUrl(target, pagePath)}"/>`).join("\n")}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl("zh-CN", pagePath)}"/>\n  </url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  await writeFile(path.join(outputRoot, `sitemap-${locale.toLowerCase()}.xml`), xml);
}

async function writeSitemapIndex() {
  const maps = ["zh-cn", "zh-hk", "en"].map((locale) => `  <sitemap><loc>${SITE_ORIGIN}/sitemap-${locale}.xml</loc><lastmod>2026-08-18</lastmod></sitemap>`).join("\n");
  await writeFile(path.join(outputRoot, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps}\n</sitemapindex>\n`);
}
