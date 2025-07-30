import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Augmente limite à 1MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('lodash')) return 'vendor_lodash';
            // Ajouter d'autres librairies si besoin
            return 'vendor';
          }
        }
      }
    }
  }
});
