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
        metrics: './metrics.html',
        activate: 'activate.html',
        batch: 'batch.html',
        'add-product': 'add-product.html',
        'inventory-list': 'inventory-list.html'
      }
    }
  }
})