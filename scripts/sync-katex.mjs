import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "katex", "dist");
const dest = join(root, "public", "katex");

await rm(dest, { recursive: true, force: true });
await mkdir(join(dest, "fonts"), { recursive: true });

await copyFile(join(src, "katex.min.css"), join(dest, "katex.min.css"));

const fonts = (await readdir(join(src, "fonts"))).filter((f) =>
  f.endsWith(".woff2")
);
await Promise.all(
  fonts.map((f) => copyFile(join(src, "fonts", f), join(dest, "fonts", f)))
);

const urls = ["/katex/katex.min.css", ...fonts.map((f) => `/katex/fonts/${f}`)];
await writeFile(
  join(dest, "precache.json"),
  JSON.stringify(urls, null, 2) + "\n"
);

console.log(`katex: synced stylesheet + ${fonts.length} woff2 fonts`);
