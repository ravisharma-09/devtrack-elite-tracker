import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Serverless functions are handled by Vercel directly now.
  // Use `npx vercel dev` for local development to serve the `/api` directory.
});
