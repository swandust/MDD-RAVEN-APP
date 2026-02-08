import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // This forces Vite to use only ONE copy of React + React Router
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});