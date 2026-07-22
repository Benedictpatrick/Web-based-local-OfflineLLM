/** Renders a shareable PNG "benchmark card" for the last chat reply: model,
 *  engine, tokens/sec, and rough device specs, styled like real terminal
 *  output rather than a generic marketing card. Pure client-side canvas
 *  drawing, no network. */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const PADDING = 56;

export type BenchmarkCardData = {
  modelName: string;
  engine: "webgpu" | "wasm" | null;
  tokensPerSec: number;
  cores: number | null;
  memoryGb: number | null;
};

const MONO_FALLBACK =
  'ui-monospace, "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", monospace';

/** next/font generates a real (hashed) font-family name and exposes it only
 *  through this CSS variable -- there's no static string to reference, and
 *  canvas text ignores the font unless this exact family list is used. */
function monoFontFamily(): string {
  if (typeof document === "undefined") return MONO_FALLBACK;
  const generated = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-mono")
    .trim();
  return generated ? `${generated}, ${MONO_FALLBACK}` : MONO_FALLBACK;
}

/** Canvas silently falls back to a default font if the requested one hasn't
 *  actually finished loading yet -- unlike DOM text, it doesn't wait. Geist
 *  Mono may never have been used on screen (e.g. no code block shown yet),
 *  so it isn't necessarily loaded just because the page is. */
async function ensureMonoFontReady(family: string): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${family}`),
      document.fonts.load(`600 16px ${family}`),
      document.fonts.load(`700 16px ${family}`),
    ]);
    await document.fonts.ready;
  } catch {
    // Falls back to whatever the browser picks -- still legible.
  }
}

/** Right-pads with spaces to a fixed character count so key/value columns
 *  line up like real terminal output. Assumes a monospace font is active. */
function padKey(key: string, width: number): string {
  return key + " ".repeat(Math.max(1, width - key.length));
}

export async function renderBenchmarkCard(data: BenchmarkCardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const mono = monoFontFamily();
  await ensureMonoFontReady(mono);

  const bg = "#0a0a0a";
  const chrome = "#1c1c1c";
  const accent = "#10a37f";
  const foreground = "#e8e8e8";
  const muted = "#6b6b6b";
  const prompt = "#5ec9a0";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Terminal window chrome: title bar with traffic-light dots, the most
  // recognizable, lowest-effort signal of "this is a terminal."
  const barHeight = 44;
  ctx.fillStyle = chrome;
  ctx.fillRect(0, 0, CARD_WIDTH, barHeight);
  const dotColors = ["#ff5f57", "#febc2e", "#28c840"];
  dotColors.forEach((color, i) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(28 + i * 24, barHeight / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = muted;
  ctx.font = `400 14px ${mono}`;
  ctx.textAlign = "center";
  ctx.fillText("guest@navo:~", CARD_WIDTH / 2, barHeight / 2 + 5);
  ctx.textAlign = "left";

  let y = barHeight + 64;
  const x = PADDING;

  ctx.font = `400 22px ${mono}`;
  ctx.fillStyle = prompt;
  ctx.fillText("guest@navo", x, y);
  const promptWidth = ctx.measureText("guest@navo").width;
  ctx.fillStyle = muted;
  ctx.fillText(":~$ ", x + promptWidth, y);
  const prefixWidth = promptWidth + ctx.measureText(":~$ ").width;
  ctx.fillStyle = foreground;
  ctx.fillText("./benchmark.sh", x + prefixWidth, y);

  y += 56;
  const charWidth = ctx.measureText("0").width;
  const keyColWidth = 11; // chars

  const rows: [string, string, string?][] = [
    ["model", data.modelName],
    ["engine", data.engine === "webgpu" ? "WebGPU (GPU)" : data.engine === "wasm" ? "WASM (CPU)" : "—"],
  ];
  if (data.cores || data.memoryGb) {
    const specParts: string[] = [];
    if (data.cores) specParts.push(`${data.cores} cores`);
    if (data.memoryGb) specParts.push(`~${data.memoryGb}GB RAM`);
    rows.push(["device", specParts.join(", ")]);
  }

  ctx.font = `400 24px ${mono}`;
  for (const [key, value] of rows) {
    ctx.fillStyle = muted;
    ctx.fillText(padKey(key, keyColWidth), x, y);
    ctx.fillStyle = foreground;
    ctx.fillText(value, x + charWidth * keyColWidth, y);
    y += 40;
  }

  // tok/s gets its own oversized line -- the one number this card exists to
  // show off -- instead of blending in with the other rows.
  y += 28;
  ctx.font = `700 22px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText(padKey("tok/s", keyColWidth), x, y);
  ctx.font = `700 96px ${mono}`;
  ctx.fillStyle = accent;
  ctx.fillText(data.tokensPerSec.toFixed(1), x + charWidth * keyColWidth, y + 8);

  // Blinking-cursor block after the number, like output still "printing."
  const numberWidth = ctx.measureText(data.tokensPerSec.toFixed(1)).width;
  ctx.fillStyle = accent;
  ctx.fillRect(x + charWidth * keyColWidth + numberWidth + 12, y - 66, 30, 74);

  ctx.font = `400 20px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText("# private, offline AI — runs entirely in your browser", x, CARD_HEIGHT - 68);
  ctx.fillStyle = accent;
  ctx.fillText("navoai.space", x, CARD_HEIGHT - 40);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** Shares the card via the native share sheet when available (files share is
 *  spotty across browsers, so this is best-effort), otherwise downloads it. */
export async function shareOrDownloadBenchmarkCard(data: BenchmarkCardData): Promise<boolean> {
  const blob = await renderBenchmarkCard(data);
  if (!blob) return false;

  const file = new File([blob], "navo-benchmark.png", { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] }) &&
    navigator.share
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "My Navo AI benchmark",
        text: `${data.tokensPerSec.toFixed(1)} tok/s running ${data.modelName} fully offline in my browser.`,
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return false;
      // Fall through to download if the share sheet itself failed.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "navo-benchmark.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
