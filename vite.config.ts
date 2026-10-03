import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "development-csp",
      transformIndexHtml(html, context) {
        if (!context.server) return html;
        const devUrl = context.server.resolvedUrls?.local[0];
        const origin = devUrl ? new URL(devUrl).origin : undefined;
        const developmentHtml = html.replace(
          "script-src 'self'",
          "script-src 'self' 'unsafe-inline'",
        );
        return origin
          ? developmentHtml
              .replaceAll("http://127.0.0.1:5173", origin)
              .replaceAll("ws://127.0.0.1:5173", origin.replace(/^http/, "ws"))
          : developmentHtml;
      },
    },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: { outDir: "dist/renderer" },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
