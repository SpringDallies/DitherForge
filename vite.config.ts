import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/DitherForge/' : '/',
  plugins: [
    react(),
    {
      name: 'serve-app-html',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html' || req.url === '/DitherForge/' || req.url === '/DitherForge/index.html') {
            req.url = req.url.startsWith('/DitherForge') ? '/DitherForge/app.html' : '/app.html';
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html' || req.url === '/DitherForge/' || req.url === '/DitherForge/index.html') {
            req.url = req.url.startsWith('/DitherForge') ? '/DitherForge/app.html' : '/app.html';
          }
          next();
        });
      },
      closeBundle() {
        const distAppHtml = path.resolve(__dirname, 'dist', 'app.html');
        const distIndexHtml = path.resolve(__dirname, 'dist', 'index.html');
        if (fs.existsSync(distAppHtml) && !fs.existsSync(distIndexHtml)) {
          fs.copyFileSync(distAppHtml, distIndexHtml);
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'app.html')
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
});
