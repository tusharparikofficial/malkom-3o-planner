import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // "/" locally; "/malkom-3o-planner/" for the GitHub Pages build
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@diagram-engine-canvas",
        // diagram-engine publishes TS source and only exports its schema from
        // the package root; the canvas component needs a direct file alias.
        replacement: fileURLToPath(
          new URL("./node_modules/diagram-engine/src/engine/DiagramCanvas.tsx", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
        // diagram-engine's own source also uses "@/" — route its unpublished
        // app-shell imports to our shim instead of this app's src tree.
        // `source` arrives with the replacement already applied.
        async customResolver(source, importer) {
          if (importer?.includes("diagram-engine")) {
            return fileURLToPath(
              new URL("./src/shims/diagram-engine-ui.tsx", import.meta.url),
            );
          }
          return this.resolve(source, importer, { skipSelf: true });
        },
      },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: false,
      },
    },
  },
});
