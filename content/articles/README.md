# 网站文章接入说明

这个目录保存网站的 SEO 文章源文件。网站构建时会自动生成或挂载文章页面、文章中心、`sitemap.xml`、RSS 和 `robots.txt`。

## 当前文章集

`production-static/` 是目前已经挂载的 10 篇完整文章：9 篇位于 `/insights/`，购房成本计算器位于 `/tools/`。构建程序会保持这些完整 HTML、样式、交互和图片不变，并复制到网站发布目录。

## 后续新增普通文章 HTML

1. 将正文 HTML 放到本目录，例如 `hangzhou-riverside-living.html`。HTML 可以是正文片段，也可以是完整 HTML 文档；发布时只会采用 `<body>` 内的内容，并移除脚本。
2. 在 `articles.json` 增加一条记录：

```json
{
  "slug": "hangzhou-riverside-living",
  "file": "hangzhou-riverside-living.html",
  "title": "文章标题",
  "description": "用于百度搜索结果的简短说明，建议不超过 120 个汉字。",
  "summary": "用于资讯列表的文章摘要。",
  "publishedAt": "2026-08-18",
  "updatedAt": "2026-08-18",
  "cover": "/assets/ppt/river-view.jpeg",
  "published": true
}
```

`slug` 只能使用小写英文字母、数字和短横线。发布后的网址为：

`https://www.cheuknangriverside.com/news/hangzhou-riverside-living/`

`cover` 可以不填。尚未准备好的文章可将 `published` 设为 `false`，不会出现在列表和站点地图中。

## 百度主动推送

站长平台提供推送令牌后，在本地环境中设置 `BAIDU_TOKEN`，再运行 `npm run seo:push-baidu`。令牌只保存在运行环境中，不得写入代码或提交到 GitHub。
