import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import monacoEditorPluginDefault from 'vite-plugin-monaco-editor';
const monacoEditorPlugin = monacoEditorPluginDefault.default || monacoEditorPluginDefault;

export default defineConfig({
  plugins: [react(), monacoEditorPlugin({ languageWorkers: ['editorWorkerService', 'typescript', 'json'] })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      },
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          xterm: ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['monaco-editor']
  }
});
