/** Renders a shareable PNG "benchmark card" for the last chat reply: model,
 *  engine, tokens/sec, and rough device specs, branded so it's recognizable
 *  if shared outside the app. Pure client-side canvas drawing, no network. */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export type BenchmarkCardData = {
  modelName: string;
  engine: "webgpu" | "wasm" | null;
  tokensPerSec: number;
  cores: number | null;
  memoryGb: number | null;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderBenchmarkCard(data: BenchmarkCardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const accent = "#10a37f";
  const background = "#171717";
  const foreground = "#f7f7f7";
  const muted = "#8e8ea0";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.32,
    0,
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.32,
    CARD_WIDTH * 0.55,
  );
  glow.addColorStop(0, "rgba(16, 163, 127, 0.16)");
  glow.addColorStop(1, "rgba(16, 163, 127, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  try {
    const wordmark = await loadImage("/navo-wordmark.png");
    const wmHeight = 44;
    const wmWidth = (wordmark.width / wordmark.height) * wmHeight;
    ctx.drawImage(wordmark, 64, 56, wmWidth, wmHeight);
  } catch {
    ctx.fillStyle = accent;
    ctx.font = "bold 36px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("Navo", 64, 92);
  }

  ctx.textAlign = "center";

  ctx.fillStyle = muted;
  ctx.font = "600 26px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("tokens per second", CARD_WIDTH / 2, 260);

  ctx.fillStyle = accent;
  ctx.font = "bold 150px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(data.tokensPerSec.toFixed(1), CARD_WIDTH / 2, 400);

  ctx.fillStyle = foreground;
  ctx.font = "600 32px system-ui, -apple-system, Segoe UI, sans-serif";
  const engineLabel =
    data.engine === "webgpu" ? "WebGPU (GPU)" : data.engine === "wasm" ? "WASM (CPU)" : "";
  ctx.fillText(
    engineLabel ? `${data.modelName} · ${engineLabel}` : data.modelName,
    CARD_WIDTH / 2,
    460,
  );

  const specParts: string[] = [];
  if (data.cores) specParts.push(`${data.cores} cores`);
  if (data.memoryGb) specParts.push(`~${data.memoryGb}GB RAM`);
  if (specParts.length) {
    ctx.fillStyle = muted;
    ctx.font = "24px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(specParts.join(" · "), CARD_WIDTH / 2, 500);
  }

  ctx.fillStyle = muted;
  ctx.font = "500 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Private, offline AI in your browser — navoai.space", CARD_WIDTH / 2, 570);

  ctx.textAlign = "left";

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
