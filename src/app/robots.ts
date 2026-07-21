import type { MetadataRoute } from "next";

/** AI crawlers explicitly allowed on top of the general "*" rule, so there's
 *  no ambiguity about generative engines being welcome to read and cite the
 *  site (ChatGPT, Perplexity, Gemini/AI Overviews, Claude, and the common
 *  training crawlers several of them share data with). */
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Applebot-Extended",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/webgpu-test",
      },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: "/webgpu-test",
      })),
    ],
    sitemap: "https://navoai.space/sitemap.xml",
  };
}
