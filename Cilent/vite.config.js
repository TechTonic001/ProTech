import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-router-dom')) return 'react-router-vendor';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
          if (id.includes('recharts')) return 'chart-vendor';
          if (id.includes('lucide-react') || id.includes('react-hot-toast')) return 'ui-vendor';
          if (id.includes('axios')) return 'http-vendor';

          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'oxc',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', 'recharts', 'lucide-react'],
    rolldownOptions: {},
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
