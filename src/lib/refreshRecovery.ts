/** Survives an accidental page refresh/close by persisting two things to
 *  localStorage that would otherwise only live in React state: the reply
 *  Navo is mid-way through streaming, and whatever the user had typed but
 *  not sent yet. Both are best-effort -- if localStorage is unavailable or
 *  throws (private browsing, quota), callers just lose the same things they
 *  would have lost before this existed. */

const INFLIGHT_REPLY_KEY = "navo-inflight-reply";
const DRAFT_INPUT_KEY = "navo-draft-input";

export interface InflightReply {
  conversationId: number;
  text: string;
  updatedAt: number;
}

export function readInflightReply(): InflightReply | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(INFLIGHT_REPLY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.conversationId !== "number" ||
      typeof parsed?.text !== "string" ||
      typeof parsed?.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** A reply streams in many times a second, and every write serializes the
 *  whole reply so far into synchronous storage -- costly on a phone. So writes
 *  are spaced out, with the newest text always written once the gap has passed
 *  and immediately if the page is being hidden or closed, which is the only
 *  moment the recovered copy is ever needed. */
const INFLIGHT_WRITE_INTERVAL_MS = 750;
let lastInflightWriteAt = 0;
let pendingInflight: InflightReply | null = null;
let inflightTimer: ReturnType<typeof setTimeout> | null = null;
let flushListenersAdded = false;

function persistInflight(entry: InflightReply): void {
  lastInflightWriteAt = Date.now();
  try {
    localStorage.setItem(INFLIGHT_REPLY_KEY, JSON.stringify(entry));
  } catch {
    // best-effort: quota exceeded or storage disabled
  }
}

function flushPendingInflight(): void {
  if (inflightTimer) {
    clearTimeout(inflightTimer);
    inflightTimer = null;
  }
  if (!pendingInflight) return;
  const entry = pendingInflight;
  pendingInflight = null;
  persistInflight(entry);
}

function addFlushListeners(): void {
  if (flushListenersAdded || typeof window === "undefined") return;
  flushListenersAdded = true;
  window.addEventListener("pagehide", flushPendingInflight);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingInflight();
  });
}

export function writeInflightReply(entry: InflightReply): void {
  if (typeof localStorage === "undefined") return;
  const sinceLast = Date.now() - lastInflightWriteAt;
  if (sinceLast >= INFLIGHT_WRITE_INTERVAL_MS) {
    pendingInflight = null;
    persistInflight(entry);
    return;
  }
  pendingInflight = entry;
  addFlushListeners();
  if (!inflightTimer) {
    inflightTimer = setTimeout(flushPendingInflight, INFLIGHT_WRITE_INTERVAL_MS - sinceLast);
  }
}

export function clearInflightReply(): void {
  // Drop any write still waiting so it can't land after the clear and leave a
  // stale "in progress" reply behind.
  pendingInflight = null;
  if (inflightTimer) {
    clearTimeout(inflightTimer);
    inflightTimer = null;
  }
  lastInflightWriteAt = 0;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(INFLIGHT_REPLY_KEY);
  } catch {}
}

export function readDraftInput(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(DRAFT_INPUT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDraftInput(text: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (text) localStorage.setItem(DRAFT_INPUT_KEY, text);
    else localStorage.removeItem(DRAFT_INPUT_KEY);
  } catch {}
}
