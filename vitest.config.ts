import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  // Force a SINGLE copy of three across three / @react-three/fiber /
  // @react-three/test-renderer. Otherwise Vitest can load three twice and
  // `instanceof THREE.Vector3/Euler/Matrix4` + R3F's constructor-equality
  // prop diffing fail (vitest#4207 / three#32142).
  resolve: {
    dedupe: ['three', '@react-three/fiber'],
  },
  // Transform JSX via esbuild's automatic runtime instead of @vitejs/plugin-react
  // (its v6 imports vite's internal API only present in vite 7+, which conflicts
  // with the vite version resolved here). Tests need a JSX transform, not fast refresh.
  esbuild: { jsx: 'automatic' },
  test: {
    // DOM only. @react-three/test-renderer ships its own mocked
    // WebGL2RenderingContext and patches HTMLCanvasElement.getContext, so no
    // real GPU/WebGL context and no `canvas` package are required.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Keep the slow real-build + size-limit gate out of the default `vitest run`;
    // run it explicitly via `pnpm test:build`.
    exclude: [...configDefaults.exclude, '**/build.test.ts'],
    server: {
      deps: {
        // Inline R3F + three so they resolve through one module graph.
        inline: ['@react-three/fiber', '@react-three/test-renderer', 'three'],
      },
    },
    deps: {
      optimizer: {
        web: {
          // Consistent pre-bundling; silences "Multiple instances of Three.js".
          include: ['three', '@react-three/fiber', '@react-three/test-renderer'],
        },
      },
    },
  },
})
