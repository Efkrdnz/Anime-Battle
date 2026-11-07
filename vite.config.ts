/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /Anime-Battle/
export default defineConfig({
  base: '/Anime-Battle/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
