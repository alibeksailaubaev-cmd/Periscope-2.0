import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Build variant for the standalone file the teacher receives.
 * One JS chunk, one CSS file, everything else inlined — `scripts/build-standalone.mjs`
 * then folds all of it into a single .html that opens straight from a USB stick.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  build: {
    outDir: 'dist-standalone',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app[extname]',
      },
    },
  },
})
