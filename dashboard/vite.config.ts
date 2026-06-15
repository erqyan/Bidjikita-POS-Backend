import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router-dom|react-hook-form)/,
              priority: 20,
            },
            {
              name: 'vendor-recharts',
              test: /node_modules[\\/]recharts/,
              priority: 17,
            },
            {
              name: 'vendor-xlsx',
              test: /node_modules[\\/]xlsx/,
              priority: 16,
            },
            {
              name: 'vendor-ui',
              test: /node_modules[\\/]lucide-react/,
              priority: 15,
            },
            {
              name: 'vendor-other',
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
