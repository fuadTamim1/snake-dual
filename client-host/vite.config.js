import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 3002,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
