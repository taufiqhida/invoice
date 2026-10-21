import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Saat `npm run dev`, teruskan /api ke Laravel (mis. `php artisan serve` atau container backend).
    proxy: { '/api': process.env.API_PROXY_TARGET || 'http://localhost:8000' },
  },
})
