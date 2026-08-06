import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // The whole point is a phone app that opens instantly. Keep an eye on it.
    chunkSizeWarningLimit: 400,
  },
  server: {
    port: 5173,
    proxy: {
      // `wrangler pages dev --proxy 5173` serves the API; Vite serves the app.
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
