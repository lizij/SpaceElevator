import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        blockout: new URL('./blockout.html', import.meta.url).pathname,
      },
    },
    chunkSizeWarningLimit: 1600,
  },
})
