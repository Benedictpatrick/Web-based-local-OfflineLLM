const MODEL_ID = "Xenova/whisper-tiny.en";

type TranscriptionOutput = { text: string };

type Transcriber = (
  audio: string,
  options?: { chunk_length_s?: number; stride_length_s?: number }
) => Promise<TranscriptionOutput | TranscriptionOutput[]>;

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return (await pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "fp32",
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
 * recorded Blob.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const transcriber = await getTranscriber();
  const result = await transcriber(audioUrl, { chunk_length_s: 30, stride_length_s: 5 });
  const output = Array.isArray(result) ? result[0] : result;
  return (output?.text ?? "").trim();
}
