import type { NextConfig } from "next";

// The only non-JSON-LD inline script we author is the theme-init snippet in
// src/app/layout.tsx (sets data-theme before first paint to avoid a flash).
// application/ld+json blocks are exempt from script-src by spec, so they
// don't need a hash entry here.
//
// IMPORTANT: this alone is NOT enough to enforce script-src. The App Router
// itself injects its own inline `self.__next_f.push(...)` scripts for RSC
// streaming, with content/hashes that change per page and per request --
// there's no fixed hash to allowlist for those. Enforcing this CSP as-is
// blocks them and breaks hydration entirely (confirmed live). Actually
// enforcing script-src requires wiring up Next's CSP nonce support
// (a per-request nonce via middleware, passed through so Next tags its own
// inline scripts with it -- see https://nextjs.org/docs/app/guides/content-security-policy)
// instead of a static hash list. Until that's done, this stays Report-Only.
const THEME_INIT_SCRIPT_HASH = "sha256-Az90PsUCPeHIwS42stfIJ/iIvqRU2+utTzKqsDDk4mM=";

// Navo runs its models entirely in the browser (WebGPU via @mlc-ai/web-llm,
// WASM via @wllama/wllama and @huggingface/transformers), so the CSP has to
// allow the hosts those libraries fetch weights/wasm from at runtime:
// huggingface.co (+ its LFS/CDN subdomains) for model weights,
// raw.githubusercontent.com for web-llm's compiled model libs, and
// cdn.jsdelivr.net for onnxruntime-web's wasm runtime. Both wllama and
// onnxruntime-web spawn their worker threads from blob: URLs.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${THEME_INIT_SCRIPT_HASH}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
