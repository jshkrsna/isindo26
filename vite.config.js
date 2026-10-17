import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        error: resolve(process.cwd(), 'error.html'),
      },
    },
  },
  server: {
    open: true,
    port: 5173
  }
})
