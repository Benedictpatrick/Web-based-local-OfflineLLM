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

export function writeInflightReply(entry: InflightReply): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(INFLIGHT_REPLY_KEY, JSON.stringify(entry));
  } catch {
    // best-effort: quota exceeded or storage disabled
  }
}

export function clearInflightReply(): void {
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
