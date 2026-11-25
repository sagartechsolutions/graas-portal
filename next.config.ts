import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://txiohgergoxxtfjsyqva.supabase.co").replace(/\/+$/, "");
const SUPABASE_WS = SUPABASE.replace(/^https:/, "wss:");
const RAZORPAY = "https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com";

/* What the browser may load on GRAAS pages. Anything not listed here is blocked, so injected scripts,
   frames or data sent to unknown sites fail even if a page ever had a bug. Pages are pre-built, so inline
   scripts from Next.js are allowed by 'unsafe-inline' (nonces would make every page dynamic). */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://cdn.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://*.razorpay.com`,
  "font-src 'self' data: https://*.razorpay.com",
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WS} ${RAZORPAY}`,
  `frame-src 'self' blob: ${SUPABASE} ${RAZORPAY}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const security = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/* Signed-in areas are never shown in search results. */
const PRIVATE = ["/admin", "/account", "/chapter", "/studio", "/signin", "/forgot"];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: security },
      ...PRIVATE.flatMap((p) => [
        { source: p, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
        { source: `${p}/:path*`, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      ]),
    ];
  },
};

export default nextConfig;
