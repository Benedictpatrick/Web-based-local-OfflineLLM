const MODEL_ID = "Xenova/whisper-tiny.en";

type TranscriptionOutput = { text: string };

type Transcriber = (
  audio: string,
  options?: { chunk_length_s?: number; stride_length_s?: number }
) => Promise<TranscriptionOutput | TranscriptionOutput[]>;

export type SpeechModelProgress = { loaded: number; total: number };

type TransformersProgressEvent = {
  status: string;
  loaded?: number;
  total?: number;
};

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber(onProgress?: (p: SpeechModelProgress) => void): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return (await pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "fp32",
        progress_callback: onProgress
          ? (event: TransformersProgressEvent) => {
              if (
                event.status === "progress" &&
                typeof event.loaded === "number" &&
                typeof event.total === "number"
              ) {
                onProgress({ loaded: event.loaded, total: event.total });
              }
            }
          : undefined,
      })) as unknown as Transcriber;
    })().catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

/**
 * Transcribes audio entirely on your device via a local Whisper model. The audio
 * never leaves the browser. `audioUrl` may be an object URL created from a
 * recorded Blob. `onProgress` only fires while the model is still downloading,
 * the first time it's used.
 */
export async function transcribeAudio(
  audioUrl: string,
  onProgress?: (p: SpeechModelProgress) => void
): Promise<string> {
  const transcriber = await getTranscriber(onProgress);
  const result = await transcriber(audioUrl, { chunk_length_s: 30, stride_length_s: 5 });
  const output = Array.isArray(result) ? result[0] : result;
  return (output?.text ?? "").trim();
}
