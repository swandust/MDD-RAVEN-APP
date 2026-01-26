import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/raven-proxy': {
        target: 'https://raven-band-demo.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/raven-proxy/, ''),
      },
    },
  },
})