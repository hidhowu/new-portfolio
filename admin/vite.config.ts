import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimizeDeps: {
    include: [
      '@editorjs/editorjs',
      '@editorjs/header',
      '@editorjs/list',
      '@editorjs/quote',
      '@editorjs/code',
      '@editorjs/delimiter',
      '@editorjs/table',
      '@editorjs/embed',
      '@editorjs/image',
      '@editorjs/inline-code',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../public/admin',
    emptyOutDir: true,
  },
});
