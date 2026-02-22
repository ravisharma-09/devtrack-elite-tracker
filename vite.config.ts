import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple Vite plugin to emulate Vercel serverless functions locally
function vercelProxyPlugin() {
  return {
    name: 'vercel-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          // Parse URL and path segments
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const parts = urlObj.pathname.split('/').filter(Boolean); // e.g. ['api', 'lc', 'username']

          let handlerPath = null;
          let queryParams = {};

          if (parts[1] === 'lc' && parts[2]) {
            handlerPath = path.resolve(__dirname, 'api/lc/[username].js');
            queryParams = { username: parts[2] };
          } else if (parts[1] === 'cf' && parts[2]) {
            handlerPath = path.resolve(__dirname, 'api/cf/[handle].js');
            queryParams = { handle: parts[2] };
          } else if (parts[1] === 'gh' && parts[2]) {
            handlerPath = path.resolve(__dirname, 'api/gh/[username].js');
            queryParams = { username: parts[2] };
          } else if (parts[1] === 'health') {
            handlerPath = path.resolve(__dirname, 'api/health.js');
          }

          if (handlerPath && fs.existsSync(handlerPath)) {
            // Dynamically import the handler
            const module = await import(`file://${handlerPath}?update=${Date.now()}`);
            const handler = module.default;

            // Mock Vercel's req.query
            req.query = Object.assign({}, Object.fromEntries(urlObj.searchParams), queryParams);

            // Mock res.status() and res.json()
            const originalEnd = res.end.bind(res);
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              originalEnd(JSON.stringify(data));
            };

            await handler(req, res);
            return;
          }
        } catch (e) {
          console.error("Vite API Proxy Error:", e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Dev Proxy Error', details: e.message }));
          return;
        }

        // If it doesn't match API endpoints, pass to Vite
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelProxyPlugin()],
});
