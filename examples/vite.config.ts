import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const dir = dirname(fileURLToPath(import.meta.url))

// Runs the examples against the library SOURCE (no build step) via an alias.
// Uses esbuild's automatic JSX runtime (no @vitejs/plugin-react needed — these
// demos don't require fast refresh), avoiding a vite/plugin peer mismatch.
export default defineConfig({
  root: dir,
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { 'd3-three': resolve(dir, '../src/index.ts') },
    dedupe: ['three', '@react-three/fiber', 'react', 'react-dom'],
  },
})
