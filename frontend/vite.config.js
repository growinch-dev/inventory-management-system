import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the dev port so it's predictable.
    port: 5175,
    strictPort: true,
    // Proxy API calls to the backend so the browser only ever talks to one
    // origin (no CORS in dev). Target port must match the backend PORT.
    proxy: {
      '/api': {
        // 127.0.0.1 (not "localhost") avoids IPv6 (::1) vs IPv4 mismatch on Windows.
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
