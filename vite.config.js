import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/fpl': {
        target: 'https://fantasy.premierleague.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fpl/, '/api'),
      },
    },
  },
})
