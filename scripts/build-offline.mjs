import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const distAssetsDir = path.join(projectRoot, "dist", "client", "assets");
const outputPath = path.join(projectRoot, "卓能河畔轩-离线版.html");

const runtimeAssetRelativePaths = [
  "assets/ppt/project-aerial.jpg",
  "assets/ppt/project-film.mp4",
  "assets/ppt/chapter-world.jpg",
  "assets/ppt/community-aerial.jpg",
  "assets/ppt/facade.jpg",
  "assets/ppt/chapter-hangzhou.jpg",
  "assets/ppt/location-map.jpg",
  "assets/ppt/river-view.jpeg",
  "assets/ppt/river-walk.jpeg",
  "assets/ppt/city-view.png",
  "assets/ppt/interior.jpeg",
  "assets/ppt/interior-panorama.jpg",
  "assets/ppt/unit-a1.jpg",
  "assets/ppt/unit-a2.jpg",
  "assets/ppt/unit-d5.jpg",
  "assets/ppt/unit-f2.jpg",
  "assets/ppt/contact.jpg",
];

const mimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
]);

async function listFilesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function requireSingleBundle(files, suffix) {
  const matches = files.filter((file) => file.endsWith(suffix));
  if (matches.length !== 1) {
    throw new Error(`Expected one ${suffix} bundle, found ${matches.length}.`);
  }
  return matches[0];
}

function escapeInlineScript(source) {
  return source.replaceAll("</script", "<\\/script");
}

function escapeInlineStyle(source) {
  return source.replaceAll("</style", "<\\/style");
}

const bundleFiles = await listFilesRecursively(distAssetsDir);
const javascriptPath = requireSingleBundle(bundleFiles, ".js");
const cssPath = requireSingleBundle(bundleFiles, ".css");
const [javascript, css] = await Promise.all([
  readFile(javascriptPath, "utf8"),
  readFile(cssPath, "utf8"),
]);

const offlineAssets = {};
for (const relativePath of runtimeAssetRelativePaths) {
  const assetPath = path.join(projectRoot, "public", relativePath);
  const extension = path.extname(assetPath).toLowerCase();
  const mimeType = mimeTypes.get(extension);
  if (!mimeType) continue;

  const bytes = await readFile(assetPath);
  offlineAssets[`/${relativePath.split(path.sep).join("/")}`] = `data:${mimeType};base64,${bytes.toString("base64")}`;
}

const offlineHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#14201f" />
    <title>卓能河畔轩｜你杭州第一个家</title>
    <style>${escapeInlineStyle(css)}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>globalThis.__OFFLINE_ASSETS__ = Object.freeze(${JSON.stringify(offlineAssets)});</script>
    <script>${escapeInlineScript(javascript)}</script>
  </body>
</html>`;

await writeFile(outputPath, offlineHtml);
const outputStats = await stat(outputPath);

console.log(`Offline HTML created: ${outputPath}`);
console.log(`Embedded media: ${Object.keys(offlineAssets).length}`);
console.log(`File size: ${(outputStats.size / 1024 / 1024).toFixed(1)} MB`);
