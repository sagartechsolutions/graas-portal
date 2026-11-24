import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://graas.org.in";
  return ["", "/about", "/membership", "/chapters", "/chapters/apply", "/chapters/letter", "/industries", "/contact", "/learn", "/events", "/graascon", "/join", "/policies", "/policies/membership-rules", "/policies/code-of-conduct", "/policies/refund-policy", "/policies/terms", "/policies/privacy", "/verify", "/updates", "/gallery", "/privacy"].map((p) => ({
    url: base + p,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
