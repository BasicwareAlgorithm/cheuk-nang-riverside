#!/usr/bin/env node
import { loadPublishedUrls, SITE_ORIGIN } from "./build-articles.mjs";

const token = process.env.BAIDU_TOKEN;
const site = process.env.BAIDU_SITE || new URL(SITE_ORIGIN).hostname;

if (!token) {
  throw new Error("缺少 BAIDU_TOKEN。请使用百度搜索资源平台提供的推送令牌，且不要把令牌写入代码。");
}

const urls = await loadPublishedUrls();
const endpoint = new URL("https://data.zz.baidu.com/urls");
endpoint.searchParams.set("site", site);
endpoint.searchParams.set("token", token);

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: urls.join("\n"),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || result.error) {
  throw new Error(`百度推送失败：${result.message || result.error || response.status}`);
}
console.log(`百度推送完成：成功接收 ${result.success ?? 0} 条，今日剩余 ${result.remain ?? "未知"} 条。`);
