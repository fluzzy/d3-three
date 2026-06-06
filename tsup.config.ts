import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const USE_CLIENT = "'use client';\n"

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // react / react-dom / three / @react-three/fiber are peers; d3-* runtime deps
  // are external by default (tsup externalizes deps + peerDeps), so the bundle
  // ships only d3-three's own code.
  external: ['react', 'react-dom', 'three', '@react-three/fiber'],
  // esbuild strips module-level `'use client'` directives when bundling — and
  // its `banner` option is stripped the same way. So we re-add the directive to
  // the top of each JS bundle after build, which lets Next.js App Router (RSC)
  // treat d3-three as a client module. One ';' is prepended
  // to the sourcemap mappings to keep line numbers aligned after the inserted
  // directive line.
  async onSuccess() {
    for (const file of ['dist/index.mjs', 'dist/index.js']) {
      if (!existsSync(file)) continue
      const code = readFileSync(file, 'utf8')
      if (code.startsWith("'use client'") || code.startsWith('"use client"')) continue
      writeFileSync(file, USE_CLIENT + code)
      const map = `${file}.map`
      if (existsSync(map)) {
        try {
          const json = JSON.parse(readFileSync(map, 'utf8'))
          if (typeof json.mappings === 'string') {
            json.mappings = `;${json.mappings}`
            writeFileSync(map, JSON.stringify(json))
          }
        } catch {
          // leave the sourcemap untouched if it can't be parsed
        }
      }
    }
  },
})
