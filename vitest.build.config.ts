import { defineConfig } from 'vitest/config'

// Runs ONLY the slow build + size-limit gate (test/package/build.test.ts),
// which the default `vitest run` excludes. It spawns a real tsup build and
// reads dist, so it needs neither jsdom nor the shared setup.
export default defineConfig({
  test: {
    include: ['test/package/build.test.ts'],
  },
})
