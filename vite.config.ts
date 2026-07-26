import { defineConfig } from 'vite';

export default defineConfig({
  base: '/viewer/',
  // The locally downloaded 3Dconnexion SDK contains standalone sample HTML
  // files. They are not part of this demo and reference package-only imports.
  optimizeDeps: {
    entries: ['index.html']
  }
});
