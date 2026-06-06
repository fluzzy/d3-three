# Changelog

All notable changes to `d3-three` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While on `0.x`, the public API may change between minor versions — pin a version.

## [Unreleased]

### Added

- **`<ChartLights>`** — opt-in lighting preset (`studio` 3-point rig / `flat`
  shadeless) the host drops inside its `<Canvas>` so the unlit-by-default series
  aren't black. `intensity` / `ambientColor` / `keyColor` knobs; renders only
  Three.js lights and never owns the scene.
- **`colorBy`** on `<BarSeries3D>` / `<ScatterSeries3D>` — per-instance coloring
  from each datum: a bare string accessor is categorical through the new
  **`DEFAULT_PALETTE`** (Tableau 10), `palette: string[]` a custom categorical
  set, `palette: (n) => string` a continuous ramp, and `palette: 'raw'` a CSS
  color. Hover still restores each mark to its own colorBy color with zero React
  re-renders; unresolvable input falls back to `color` and dev-warns once.
- **`useSeriesLayout3D()`** — headless per-row world layout (`x` / `y` / `z`,
  `yBaseline`, band footprint) the built-in marks consume, for building custom
  instanced marks (`SeriesLayout3D` / `SeriesLayoutRow3D`).

### Planned (v0.2)

- `<GridPlane3D>` — reference grid built from the in-plane scales' ticks.
- A `d3-scale-chromatic` palette library for richer built-in `colorBy` palettes.

## [0.1.0]

Initial public release. Drop `<Chart3D>` into your existing React Three Fiber
`<Canvas>` and render D3-scaled, InstancedMesh-backed 3D charts — no second
renderer and no `drei` dependency.

### Added

- **`<Chart3D>`** — context root that validates your data, infers and builds the
  shared D3 scales (band for categorical axes, linear for numeric), anchors the
  y scale at 0, and provides everything to its children. Renders no Three.js
  object itself.
- **`<BarSeries3D>`** — render grouped 3D bars as a single InstancedMesh (one
  draw call). With `zKey` set, bars are grouped across the z axis; without it
  they sit on the `z = 0` plane. Supports a single `color`, `highlightColor`,
  and `onClick` / `onPointerOver` / `onPointerOut` callbacks that receive
  `(event, datum, index)`.
- **`<ScatterSeries3D>`** — plot one sphere per row across all three axes as a
  single InstancedMesh. Supports a uniform `size`, a single `color`,
  `highlightColor`, and the same pointer callbacks. Without `zKey` it collapses
  to a 2D plane (with a dev warning) rather than throwing.
- **`<Axis3D>`** — draw one chart axis: a base line, a tick mark per tick, and
  optional camera-facing label sprites, with `tickCount`, `tickFormat`, `color`,
  `showLabels`, and `fontSize` controls.
- **One-series-per-chart guard** — `<Chart3D>` emits a one-shot dev warning when
  it detects both a `BarSeries3D` and a `ScatterSeries3D` under the same root
  (their x scale types — band vs. linear — collide).
- **`useChart3D()`** — read the data and scales shared by the enclosing
  `<Chart3D>` to build your own custom series. Throws a clear error when called
  outside a `<Chart3D>`.
- **Data validation** — rows with `NaN` / `Infinity` / missing coordinates are
  filtered out (with a dev-mode warning) instead of being silently clamped.
- **Scale inference** — string values on an axis produce a band scale, numeric
  values a linear scale, per axis, automatically.
- **Imperative per-instance hover** — hover recolors only the affected instances
  via `setColorAt` with no React state and no full-series re-render, and calls
  `invalidate()` so it works under `frameloop="demand"` canvases.
- **Frustum-culling fix** — series set `frustumCulled={false}` so charts offset
  from the world origin are never wrongly culled.
- **`'use client'` directive** — emitted at the top of each bundle so the
  library works in the Next.js App Router (RSC) out of the box.
- **Dual ESM + CJS build** with types-first `exports`, `sideEffects: false`,
  tree-shaking, and a `~12.7 KB` (gzip) bundle. `react`, `react-dom`, `three`,
  and `@react-three/fiber` are peer dependencies and are never bundled.

[Unreleased]: https://github.com/fluzzy/d3-three/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fluzzy/d3-three/releases/tag/v0.1.0
