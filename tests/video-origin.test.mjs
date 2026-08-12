import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project film is loaded from the dedicated media subdomain", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(
    appSource,
    /const PROJECT_FILM_URL = `https:\/\/media\.cheuknangriverside\.com\$\{MATERIAL\}\/project-film\.mp4`;/,
  );
  assert.match(appSource, /<source src=\{PROJECT_FILM_URL\} type="video\/mp4" \/>/);
});
