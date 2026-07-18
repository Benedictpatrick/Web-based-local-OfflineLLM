import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pyodide");
const destDir = join(root, "public", "pyodide");

await mkdir(destDir, { recursive: true });

const files = [
  "pyodide.js",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "pyodide-lock.json",
  "python_stdlib.zip",
];
await Promise.all(files.map((f) => copyFile(join(src, f), join(destDir, f))));

console.log(`pyodide: synced ${files.length} runtime files`);
