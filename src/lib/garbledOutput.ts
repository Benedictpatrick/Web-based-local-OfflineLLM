/**
 * Detects the "word salad" failure mode occasionally seen from quantized
 * models on WebGPU: a reply that mixes many unrelated scripts almost every
 * other word (e.g. Malayalam, Arabic, Korean, Cyrillic fragments interleaved
 * with English), as opposed to genuine multilingual text, which reads in
 * long runs of one script at a time. Pure and deterministic, same philosophy
 * as the other classifiers in this codebase: only flag what's certain.
 */

type Script =
  | "latin"
  | "cyrillic"
  | "arabic"
  | "devanagari"
  | "hangul"
  | "hiragana"
  | "katakana"
  | "han"
  | "malayalam"
  | "tamil"
  | "thai"
  | "bengali"
  | "hebrew";

const SCRIPT_TESTS: { script: Script; re: RegExp }[] = [
  { script: "latin", re: /\p{Script=Latin}/u },
  { script: "cyrillic", re: /\p{Script=Cyrillic}/u },
  { script: "arabic", re: /\p{Script=Arabic}/u },
  { script: "devanagari", re: /\p{Script=Devanagari}/u },
  { script: "hangul", re: /\p{Script=Hangul}/u },
  { script: "hiragana", re: /\p{Script=Hiragana}/u },
  { script: "katakana", re: /\p{Script=Katakana}/u },
  { script: "han", re: /\p{Script=Han}/u },
  { script: "malayalam", re: /\p{Script=Malayalam}/u },
  { script: "tamil", re: /\p{Script=Tamil}/u },
  { script: "thai", re: /\p{Script=Thai}/u },
  { script: "bengali", re: /\p{Script=Bengali}/u },
  { script: "hebrew", re: /\p{Script=Hebrew}/u },
];

/** The first script with a letter in this word, or null for punctuation/digits/emoji-only
 *  words -- those don't count as a script boundary either way. */
function dominantScript(word: string): Script | null {
  for (const { script, re } of SCRIPT_TESTS) {
    if (re.test(word)) return script;
  }
  return null;
}

/** Below this many lettered words, there isn't enough signal to judge --
 *  a short reply legitimately mixing in one foreign word/name isn't garbled. */
const MIN_LETTERED_WORDS = 12;
/** Fraction of adjacent-word script changes above which it reads as word
 *  salad rather than normal prose (which might reasonably flip once or
 *  twice, e.g. quoting a foreign term, but not on nearly every word). */
const TRANSITION_RATIO_THRESHOLD = 0.3;
/** Genuine multilingual replies rarely juggle more than two scripts; three
 *  or more distinct scripts alongside a high transition ratio is the
 *  specific signature of this failure mode. */
const MIN_DISTINCT_SCRIPTS = 3;

export function looksGarbled(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  const scripts: Script[] = [];
  for (const word of words) {
    const script = dominantScript(word);
    if (script) scripts.push(script);
  }
  if (scripts.length < MIN_LETTERED_WORDS) return false;

  const distinct = new Set<Script>();
  let transitions = 0;
  for (let i = 0; i < scripts.length; i++) {
    distinct.add(scripts[i]);
    if (i > 0 && scripts[i] !== scripts[i - 1]) transitions++;
  }

  const transitionRatio = transitions / (scripts.length - 1);
  return distinct.size >= MIN_DISTINCT_SCRIPTS && transitionRatio >= TRANSITION_RATIO_THRESHOLD;
}
