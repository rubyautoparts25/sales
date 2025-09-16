import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'login.html',
        inventory: 'inventory.html',
        'active-inventory': 'active-inventory.html',
        'onhold-inventory': 'onhold-inventory.html',
        billing: 'billing.html',
        edit: 'edit.html',
        metrics: './metrics.html',
        catrain: './catrain.html',
        activate: 'activate.html'
      }
    }
  }
})