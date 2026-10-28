
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      port: 3000,
    },
  },

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry
    // to src/server.ts (our SSR error wrapper).
    // entry: "server"
  },
});