const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type Extractor = (
  text: string,
  options: { pooling: "mean"; normalize: true }
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return (await pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
      })) as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

/** Sending one message looks the same query up against notes, memories and an
 *  attached file, each of which asks for its embedding. Remembering the most
 *  recent few (and sharing an in flight one) means that costs one model pass
 *  instead of up to three. */
const EMBED_CACHE_SIZE = 32;
const embedCache = new Map<string, Promise<number[]>>();

export function embed(text: string): Promise<number[]> {
  const cached = embedCache.get(text);
  if (cached) return cached;

  const pending = (async () => {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  })();
  embedCache.set(text, pending);
  if (embedCache.size > EMBED_CACHE_SIZE) {
    embedCache.delete(embedCache.keys().next().value as string);
  }
  // A failed embedding (e.g. offline while the model was still downloading)
  // must not stay cached, or every retry would replay the same rejection.
  pending.catch(() => {
    if (embedCache.get(text) === pending) embedCache.delete(text);
  });
  return pending;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
