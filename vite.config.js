import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        billing: 'billing.html',
        edit: 'edit.html',
        metrics: './metrics.html'
      }
    }
  }
})