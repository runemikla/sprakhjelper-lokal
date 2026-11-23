import type { MetadataRoute } from "next";

// Web app manifest: lets students add sprakhjelp.no to the home screen and
// open it as an app. Served at /manifest.webmanifest (exempt from the access
// code gate in proxy.ts so phones can read it before login).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Språkhjelp",
    short_name: "Språkhjelp",
    description: "KI-verktøy for elever som lærer norsk",
    lang: "no",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The motif sits inside the central safe zone, so the same image works when Android crops it.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
