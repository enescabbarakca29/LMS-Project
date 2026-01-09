import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDesktop = process.env.DESKTOP === "true";

const nextConfig: NextConfig = {
  async headers() {
    // Desktop (Electron) için kamera/mikrofon açık, web için kapalı
    const permissionsPolicy = isDesktop
      ? "camera=(self), microphone=(self), geolocation=()"
      : "camera=(), microphone=(), geolocation=()";

    // CSP: Desktop'ta kamera stream'i için blob: + media-src ekledik
    const csp =
      "default-src 'self'; " +
      "base-uri 'self'; " +
      "object-src 'none'; " +
      "img-src 'self' https: data: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "connect-src 'self' https: http: ws: wss:; " +
      "frame-src 'self' https:; " +
      "media-src 'self' blob:; ";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: permissionsPolicy },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  // ✅ ÖNEMLİ: Desktop'ta PWA/Workbox tamamen kapalı (404 bad-precaching biter)
  disable: isDesktop || process.env.NODE_ENV === "development",
  // ekstra garanti: desktop'ta register bile etmesin
  register: !isDesktop,
})(nextConfig);
