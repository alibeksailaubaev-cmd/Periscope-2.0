import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Vite configuration: React fast refresh + "@" alias pointing at /src.
export default defineConfig({
  // Relative base so the build runs from any path, not just the domain root.
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Charts and animation are the heavy dependencies; splitting them out
        // keeps the entry chunk small and lets them cache independently.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts'
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion'
          if (id.includes('react-dom') || id.includes('scheduler') || /node_modules\/react\//.test(id)) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
