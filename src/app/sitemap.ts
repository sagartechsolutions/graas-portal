import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://graas.org.in";
  return ["", "/learn", "/chapters", "/events", "/industry", "/graascon", "/membership", "/about", "/contact", "/privacy"].map((p) => ({
    url: base + p,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
