import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/webgpu-test",
    },
    sitemap: "https://navoai.space/sitemap.xml",
  };
}
