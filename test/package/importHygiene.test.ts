import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Source-level tree-shaking guard. The 25 KB gzip budget depends entirely on
 * importing d3 as NAMED imports only (a namespace/default import pulls in the
 * whole module) and on never adding the deferred heavyweight deps. The built
 * `build.test.ts` only inspects the bundle and would pass a namespace refactor
 * because d3 is externalized — the cost lands in the CONSUMER bundle instead. So
 * this pins the contract at the source.
 */

const SRC = resolve(__dirname, '..', '..', 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx?$/.test(name) ? [full] : []
  })
}

const sources = sourceFiles(SRC).map((file) => ({
  file: file.slice(SRC.length + 1),
  code: readFileSync(file, 'utf8'),
}))

describe('import hygiene (tree-shaking + bundle budget)', () => {
  it('has source files to check', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it('imports d3-scale / d3-array only as named imports (no namespace or default)', () => {
    for (const { file, code } of sources) {
      expect(code, `${file}: namespace import of d3 defeats tree-shaking`).not.toMatch(
        /import\s+\*\s+as\s+\w+\s+from\s+['"]d3-(scale|array)['"]/,
      )
      expect(code, `${file}: default import of d3 defeats tree-shaking`).not.toMatch(
        /import\s+\w+\s+from\s+['"]d3-(scale|array)['"]/,
      )
    }
  })

  it('does not import deferred / heavyweight deps', () => {
    // d3-color / d3-scale-chromatic (colorBy palettes), d3-force-3d (ForceGraph),
    // troika-three-text (SDF labels), three/examples — all deferred past v0.2's
    // lean core. Adding one here would silently blow the budget.
    const forbidden =
      /from\s+['"](d3-color|d3-scale-chromatic|d3-force-3d|troika-three-text|three\/examples)/
    for (const { file, code } of sources) {
      expect(code, `${file}: imports a deferred/heavyweight dep`).not.toMatch(forbidden)
    }
  })
})
