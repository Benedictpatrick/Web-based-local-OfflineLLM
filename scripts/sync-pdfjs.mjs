import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public", "pdfjs");

await mkdir(destDir, { recursive: true });
await copyFile(src, join(destDir, "pdf.worker.min.mjs"));

console.log("pdfjs: synced worker");
