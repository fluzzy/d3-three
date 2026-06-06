# d3-three

[![npm version](https://img.shields.io/npm/v/d3-three.svg)](https://www.npmjs.com/package/d3-three)
[![bundle size](https://img.shields.io/badge/gzip-~12.7%20KB-blue.svg)](https://bundlephobia.com/package/d3-three)
[![license](https://img.shields.io/npm/l/d3-three.svg)](./LICENSE)

> Drop 3D charts into your **existing** [React Three Fiber](https://r3f.docs.pmnd.rs) scene. No new renderer, no `drei` dependency — just `<Chart3D>` inside the `<Canvas>` you already have.

Most data is better as a flat 2D chart, and you should reach for [Recharts](https://recharts.org) or [visx](https://airbnb.io/visx/) when it is. `d3-three` is for the cases where the data is **inherently spatial** — networks, embeddings, point clouds, 3D simulations, anything where the third axis carries real meaning — and where you're already rendering a WebGL scene and just want to add an analytical layer to it.

`d3-three` pairs D3's battle-tested scale math with R3F-native, InstancedMesh-backed rendering. You bring the `<Canvas>`, camera, lights, and controls; `d3-three` adds the chart.

## Features

- **Drop-in** — renders inside *your* R3F `<Canvas>`; it never owns the canvas, camera, lights, or controls.
- **Recharts-style data** — plain `[{ ... }]` rows with `xKey` / `yKey` / `zKey` accessors.
- **D3 scales** — automatic band (categorical) vs. linear (numeric) per axis.
- **InstancedMesh everywhere** — one draw call per series; renders 10k+ instances as a single `InstancedMesh`.
- **No `drei` dependency** — text and axes are built in.
- **Tiny** — ~12.7 KB (gzip), tree-shakeable, ESM + CJS.

## Install

```bash
npm install d3-three
```

Peer dependencies (you almost certainly already have these in an R3F app):

```bash
npm install react react-dom three @react-three/fiber
```

Requires **React ≥19 <19.3**, **@react-three/fiber v9**, and **three ≥ r0.156**.

## Quick start

```tsx
import { Canvas } from '@react-three/fiber'
import { Chart3D, BarSeries3D, Axis3D } from 'd3-three'

const sales = [
  { month: 'Jan', revenue: 100, region: 'NA' },
  { month: 'Jan', revenue: 80, region: 'EU' },
  { month: 'Feb', revenue: 120, region: 'NA' },
  { month: 'Feb', revenue: 95, region: 'EU' },
]

export function Chart() {
  return (
    <Canvas camera={{ position: [13, 11, 15], fov: 50 }}>
      {/* v0.1 does not own the scene — the host lights it. The series use the
          unlit meshStandardMaterial and render black without lights. */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 18, 12]} intensity={1.15} />

      <Chart3D data={sales} xKey="month" yKey="revenue" zKey="region">
        <BarSeries3D color="steelblue" />
        <Axis3D axis="x" />
        <Axis3D axis="y" />
        <Axis3D axis="z" />
      </Chart3D>
    </Canvas>
  )
}
```

`<Chart3D>` must live inside a `<Canvas>` — it reads R3F's store to fail fast otherwise. Camera, lights, and any `OrbitControls` are yours to configure.

> **Lighting is the host's job in v0.1.** The series default to `meshStandardMaterial`, which is *unlit* — without lights in the scene it renders **black**. Add your own `ambientLight` / `directionalLight` (shown above). A drop-in `<ChartLights>` helper is on the [v0.2 roadmap](#roadmap).

## One series type per chart

A `<Chart3D>` infers one x-scale type from the data and shares it with every series, so **mix only one series type per chart**: `BarSeries3D` needs a **band** (categorical / string) x axis, while `ScatterSeries3D` needs a **linear** (numeric) x axis. Putting both under the same `<Chart3D>` collides on the x scale type; `Chart3D` emits a one-shot dev warning if it detects the mix. Use separate `<Chart3D>` roots for bars and scatter.

## Components

### `<Chart3D>`

Context root. Validates the data, builds shared d3 scales, and provides them to children. Renders no Three.js object itself.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `Array<Record<string, unknown>>` | — | Recharts-style rows. |
| `xKey` / `yKey` | `string` | — | Fields for the x / y axes. |
| `zKey` | `string` | — | Optional z field → grouped 3D bars / 3D scatter depth. |
| `width` / `height` / `depth` | `number` | `10` / `5` / `10` | World-space span of each axis. |

Per axis, string values → a band scale, numeric values → a linear scale. The y scale always includes 0, so bars grow from the floor. Rows where a key is missing (checked with `Object.hasOwn`) or whose coordinates are `NaN`/`Infinity` are filtered out (with a dev-mode warning), never silently clamped.

### `<BarSeries3D>`

InstancedMesh 3D bars. With `zKey` set, bars are grouped across the z axis; without it they sit on the `z = 0` plane. Bar width = `xScale.bandwidth()`; grouped depth = `zScale.bandwidth()`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `string` | `'steelblue'` | Single CSS color for every bar. |
| `highlightColor` | `string` | `'#ffaa00'` | Hover color. |
| `onClick` / `onPointerOver` / `onPointerOut` | `(event, datum, index) => void` | — | Pointer callbacks. |

**Expects a categorical (band) x axis** — i.e. string `xKey` values. Fed a continuous numeric x, it emits a one-shot dev warning (never throws). Use `ScatterSeries3D` for numeric x.

> **When to use bars:** grouped 3D bars (with `zKey`) for category comparison across series. A single flat bar series is hard to read in 3D perspective — prefer `ScatterSeries3D` or 2D [Recharts](https://recharts.org) there.

### `<ScatterSeries3D>`

InstancedMesh 3D scatter. Plots one sphere per row across all three numeric axes.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `number` | `0.15` | Uniform sphere radius (world units). |
| `color` | `string` | `'steelblue'` | Single CSS color for every point. |
| `highlightColor` | `string` | `'#ffaa00'` | Hover color. |
| `onClick` / `onPointerOver` / `onPointerOut` | `(event, datum, index) => void` | — | Pointer callbacks. |

```tsx
<Chart3D data={points} xKey="x" yKey="y" zKey="z">
  <ScatterSeries3D size={0.18} color="#4e79a7" />
  <Axis3D axis="x" /><Axis3D axis="y" /><Axis3D axis="z" />
</Chart3D>
```

**Expects continuous (numeric) x/y/z axes.** A categorical (band) axis collapses points onto band centers; that case emits a one-shot dev warning suggesting `BarSeries3D`. Without `zKey`, scatter collapses to a 2D plane (also dev-warned) — it never throws.

### `<Axis3D>`

One chart axis: a base line spanning the scale's range, a tick mark per tick, and optional camera-facing label sprites. Labels are clamped to 256 characters and drawn with a dark halo so they stay legible over bright data or grids.

| Prop | Type | Default |
| --- | --- | --- |
| `axis` | `'x' \| 'y' \| 'z'` | — |
| `tickCount` | `number` | `5` (linear axes) |
| `tickFormat` | `(value) => string` | `String(value)` |
| `color` | `string` | `'#888888'` |
| `showLabels` | `boolean` | `true` |
| `fontSize` | `number` | `0.3` |

`<Axis3D axis="z" />` renders nothing when the chart has no `zKey`.

### `useChart3D()`

Reads the scales/data shared by the enclosing `<Chart3D>` — useful for building your own series. Throws `useChart3D() must be called inside a <Chart3D>. ...` outside a chart.

```tsx
const {
  data, xKey, yKey, zKey,
  xScale, yScale, zScale, yBaseline,
  width, height, depth,
  bounds, // per-axis world-space [min, max] — exactly scale.range()
  domain, // per-axis data extent — exactly scale.domain() (band → string[])
} = useChart3D()
```

- **`bounds`** — `{ x, y, z? }`, each `[min, max]` in Three.js **world** coordinates (the Axis3D line endpoints). These come straight from `scale.range()`.
- **`domain`** — `{ x, y, z? }` in **data** space (`scale.domain()`). Linear axes carry `[min, max]`; band (categorical) axes carry the `string[]` category list.

## Colors

v0.1 colors a series with the single **`color`** prop (a CSS color string, default `steelblue`), applied per-instance via `setColorAt`. Any string `three.Color` accepts works. Automatic per-datum palettes (`colorBy`) and a `d3-scale-chromatic` palette library are on the [v0.2 roadmap](#roadmap) — purely additive, no breaking change.

## Performance

- Every series is a single `InstancedMesh` — one draw call per series; renders 10k+ instances as a single `InstancedMesh`. Hover recolors only the two affected instances, imperatively (no React re-render), and calls `invalidate()` so it works with `frameloop="demand"`.
- Bundle: **~12.7 KB** (gzip), `sideEffects: false`, tree-shakeable.
- `three`, `@react-three/fiber`, `react`, `react-dom` are peers — never bundled.

## Accessibility

A WebGL `<canvas>` is opaque to screen readers — its contents are pixels, not DOM. `d3-three` cannot change that. For an accessible chart:

- Provide an **adjacent data table** (visually hidden if you like) carrying the same rows, so assistive tech and keyboard users have a real path to the data.
- Put a descriptive `aria-label` (or `role="img"` + label) on the element wrapping the `<Canvas>`.

A built-in **data-table fallback mode** is planned for v0.2 (see the roadmap).

## Security & trust boundary

`d3-three` runs entirely in your app's context — treat its inputs the way you'd treat any data you render:

- **Accessors run with host-app privileges.** `tickFormat` and pointer callbacks are your functions, executed on your data — they are not sandboxed.
- **Unknown color strings render white, not an error.** Any string `three.Color` can't parse resolves to white rather than throwing, so a bad/untrusted color value degrades silently to a white instance.
- **Data is validated for *finiteness*, not *trust*.** Rows are checked for present keys and finite numeric coordinates (bad rows are dropped), but string fields are **not** sanitized as untrusted content. If your data is user-supplied, you own sanitizing it before it reaches `<Chart3D>`.

In short: `d3-three` owns the math and the rendering; **the consumer owns input trust.**

## Roadmap

**v0.2** (all additive — no breaking changes)

- `<GridPlane3D>` — a reference grid built from the in-plane scales' ticks.
- `<ChartLights>` — a drop-in lighting helper so the series aren't black without host lights.
- `colorBy` + a `d3-scale-chromatic` palette library for automatic per-datum / per-group coloring.
- `<ForceGraph3D>` — a force-directed network series via `d3-force-3d` (the inherently-spatial flagship).
- Real text labels via `troika-three-text` (sharper than the current sprite labels).
- Standalone `useScale()` / `useColorScale()` hooks (public access to the scale machinery that's internal in v0.1).
- `<Tooltip3D>` — a built-in hover tooltip.
- Data-table fallback mode for accessibility.

**v0.3**

- Built-in dimensionality reduction helpers (t-SNE / UMAP) for embedding plots.
- Streaming / incremental data updates.

## Examples

See [`examples/`](./examples) for a grouped bar chart and a 400-point scatter cloud. Run them against the library source:

```bash
pnpm install
pnpm exec vite --config examples/vite.config.ts
```

## Documentation

- [Getting started](./docs/getting-started.md) — install, peers, framework notes (Next.js / Vite), custom series with `useChart3D()`, troubleshooting
- [Publishing](./docs/publishing.md) — build tooling and npm release

## Contributing

Bug reports, ideas, and PRs are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, scripts, and the pre-PR check chain.

## License

[MIT](./LICENSE)
