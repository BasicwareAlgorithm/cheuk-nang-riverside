import * as cheerio from "cheerio";

export const SITE_ORIGIN = "https://www.cheuknangriverside.com";
export const LOCALES = {
  "zh-CN": { prefix: "", hreflang: "zh-CN", og: "zh_CN", label: "简体中文" },
  "zh-HK": { prefix: "/zh-hk", hreflang: "zh-HK", og: "zh_HK", label: "繁體中文" },
  en: { prefix: "/en", hreflang: "en", og: "en_US", label: "English" },
};

export const hasHan = (value) => /\p{Script=Han}/u.test(String(value || ""));

export function pageUrl(locale, pagePath) {
  const prefix = LOCALES[locale].prefix;
  const normalized = pagePath === "/" ? "/" : `/${pagePath.replace(/^\/+|\/+$/g, "")}/`;
  return `${SITE_ORIGIN}${prefix}${normalized}`;
}

export function extractTranslatableStrings(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const values = new Set();
  $("*").contents().each((_, node) => {
    if (node.type !== "text" || ["script", "style", "noscript"].includes(node.parent?.name)) return;
    const value = node.data.trim();
    if (hasHan(value)) values.add(value);
  });
  for (const attribute of ["content", "alt", "title", "aria-label", "placeholder", "data-title", "data-body", "data-checks"]) {
    $(`[${attribute}]`).each((_, element) => {
      const value = $(element).attr(attribute)?.trim();
      if (hasHan(value)) values.add(value);
    });
  }
  $('script[type="application/ld+json"]').each((_, element) => collectJsonStrings($(element).html(), values));
  $("script:not([src]):not([type='application/ld+json'])").each((_, element) => collectScriptStrings($(element).html() || "", values));
  return values;
}

export function collectScriptStrings(source, values = new Set()) {
  for (const match of source.matchAll(/(['"`])((?:\\.|(?!\1).)*\p{Script=Han}(?:\\.|(?!\1).)*)\1/gu)) {
    if (!match[2].includes("${")) values.add(match[2]);
  }
  return values;
}

function collectJsonStrings(source, values) {
  try {
    walkJson(JSON.parse(source), (value) => { if (hasHan(value)) values.add(value); });
  } catch {
    // Invalid structured data is left untouched and will be caught by page-level tests.
  }
}

export function walkJson(value, visitor) {
  if (typeof value === "string") return visitor(value) ?? value;
  if (Array.isArray(value)) return value.map((entry) => walkJson(entry, visitor));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walkJson(entry, visitor)]));
  }
  return value;
}

const protectedTerms = [
  ["卓能·河畔轩", "__CNRBRANDDOT__", "Cheuk Nang Riverside"],
  ["卓能河畔轩", "__CNRBRAND__", "Cheuk Nang Riverside"],
  ["卓能集团", "__CNRGROUP__", "Cheuk Nang Group"],
  ["钱江世纪城", "__QJSCITY__", "Qianjiang Century City"],
  ["钱江新城", "__QJNEWCITY__", "Qianjiang New City"],
  ["运河新城", "__CANALNEWCITY__", "Canal New City"],
  ["杭州", "__HANGZHOU__", "Hangzhou"],
  ["崇贤", "__CHONGXIAN__", "Chongxian"],
  ["临平", "__LINPING__", "Linping"],
  ["拱墅", "__GONGSHU__", "Gongshu"],
  ["良渚", "__LIANGZHU__", "Liangzhu"],
];

export function protectTerms(source) {
  let value = source;
  for (const [term, token] of protectedTerms) value = value.replaceAll(term, token);
  return value;
}

export function restoreTerms(source) {
  let value = source;
  for (const [, token, translation] of protectedTerms) value = value.replaceAll(token, translation);
  return value
    .replaceAll("square meters", "sq m")
    .replaceAll("square meter", "sq m")
    .replaceAll("㎡", " sq m")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
