// KaTeX's stylesheet references its fonts by relative URL, so the two have to
// ship together at a stable, unhashed path: the service worker precaches them
// by name, and a bundler-hashed filename can't be named ahead of time. Copying
// them here (rather than committing them) means they can never drift from the
// installed katex version — this runs before every dev and build.
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "katex", "dist");
const dest = join(root, "public", "katex");

await rm(dest, { recursive: true, force: true });
await mkdir(join(dest, "fonts"), { recursive: true });

await copyFile(join(src, "katex.min.css"), join(dest, "katex.min.css"));

// woff2 only: each @font-face in katex.min.css lists woff2 first, so every
// browser modern enough to run this app's WASM engine takes that branch and
// never requests the .woff/.ttf fallbacks. Copying those would roughly triple
// the precache for bytes nothing ever fetches.
const fonts = (await readdir(join(src, "fonts"))).filter((f) =>
  f.endsWith(".woff2")
);
await Promise.all(
  fonts.map((f) => copyFile(join(src, "fonts", f), join(dest, "fonts", f)))
);

// The service worker reads this instead of hardcoding filenames, so a katex
// upgrade that renames a font can't leave it silently un-precached.
const urls = ["/katex/katex.min.css", ...fonts.map((f) => `/katex/fonts/${f}`)];
await writeFile(
  join(dest, "precache.json"),
  JSON.stringify(urls, null, 2) + "\n"
);

console.log(`katex: synced stylesheet + ${fonts.length} woff2 fonts`);
