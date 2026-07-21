import type { Metadata } from "next";
import Link from "next/link";

const TITLE = "About Navo AI";
const DESCRIPTION =
  "Who founded Navo AI, what it does, and how it keeps everything private and offline. Answers to the most common questions about Navo AI.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://navoai.space/about",
  },
};

const FAQS = [
  {
    question: "What is Navo AI?",
    answer:
      "Navo AI is a private, offline AI assistant that runs entirely on your device, inside your browser. It uses WebGPU (or a WASM fallback on unsupported devices) to run open language models locally, so nothing you type is ever sent to a server.",
  },
  {
    question: "Who founded Navo AI?",
    answer: "Navo AI was founded by Benedict Patrick and Saidharshan.",
  },
  {
    question: "Is Navo AI free?",
    answer:
      "Yes. Navo AI is free to use and does not require a signup. There is no server-side inference, so there is nothing to pay for on the back end either.",
  },
  {
    question: "Does Navo AI work offline?",
    answer:
      "Yes. After a model is downloaded once, Navo AI keeps working with no internet connection at all, since every chat response is generated on your own device.",
  },
  {
    question: "What AI models does Navo AI support?",
    answer:
      "Navo AI's Model Hub lets you download and switch between open models from Meta (Llama), Google (Gemma), Alibaba (Qwen), Microsoft (Phi), Mistral AI, Hugging Face (SmolLM2), and DeepSeek.",
  },
  {
    question: "Is my data private with Navo AI?",
    answer:
      "Yes. Navo AI runs entirely on-device: chat messages, notes, and downloaded models all stay in your browser and are never uploaded anywhere.",
  },
  {
    question: "How is Navo AI different from ChatGPT or other AI chatbots?",
    answer:
      "Most AI chatbots send every message to a company's server to generate a reply. Navo AI runs the entire model on your own device instead, so it keeps working with no internet connection, costs nothing per message, and never transmits what you type anywhere.",
  },
  {
    question: "Can I use Navo AI on my phone?",
    answer:
      "Yes. Navo AI works in any modern mobile browser and can be installed to your phone's home screen as a Progressive Web App for a full screen experience that feels like a native app.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">About Navo AI</h1>
        <p className="mt-3 text-base text-foreground-muted">{DESCRIPTION}</p>
      </div>
      <div className="flex flex-col gap-6">
        {FAQS.map((f) => (
          <div key={f.question}>
            <h2 className="text-lg font-medium">{f.question}</h2>
            <p className="mt-1 text-base text-foreground-muted">{f.answer}</p>
          </div>
        ))}
      </div>
      <Link href="/" className="text-base font-medium text-accent hover:underline">
        Open Navo AI
      </Link>
    </div>
  );
}
