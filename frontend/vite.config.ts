import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Company data is read from ../instances/*/parsed at build time.
  server: { fs: { allow: ['..'] } },
});
