import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/bymycar-project-platform/' : '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4174',
        changeOrigin: true,
      },
    },
  },
})
