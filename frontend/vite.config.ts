// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 3000,
//     strictPort: true,   // ← fail loudly instead of silent fallback
//     host: true,
//   },
// });

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