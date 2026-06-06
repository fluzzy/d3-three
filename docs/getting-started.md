# Getting started

How to install and use **d3-three** in your own React Three Fiber project after it's published to npm.

## 1. Install

```bash
npm install d3-three
# or: pnpm add d3-three   /   yarn add d3-three
```

### Peer dependencies

`d3-three` does **not** bundle React, three, or React Three Fiber — they're peers you provide (an R3F app already has them):

```bash
npm install react react-dom three @react-three/fiber
```

| Peer | Required version |
| --- | --- |
| `react` / `react-dom` | `>=19 <19.3` |
| `@react-three/fiber` | `^9` |
| `three` | `>=0.156` |

> React Three Fiber v9 targets **React 19**. If you're still on React 18 you'll need R3F v8, which `d3-three` does not target.

The `d3-*` scale packages (`d3-scale`, `d3-array`) are regular dependencies and are installed automatically.

## 2. Your first chart

`d3-three` renders **inside your existing `<Canvas>`** — it never creates the canvas, camera, lights, or controls. You stay in control of the scene.

```tsx
import { Canvas } from '@react-three/fiber'
import { Chart3D, BarSeries3D, Axis3D } from 'd3-three'

type Row = { month: string; revenue: number; region: 'NA' | 'EU' }

const data: Row[] = [
  { month: 'Jan', revenue: 100, region: 'NA' },
  { month: 'Jan', revenue: 80, region: 'EU' },
  { month: 'Feb', revenue: 120, region: 'NA' },
  { month: 'Feb', revenue: 95, region: 'EU' },
]

export function App() {
  return (
    <Canvas camera={{ position: [13, 11, 15], fov: 50 }}>
      {/* v0.1 does not own the scene — the host lights it. The series use the
          unlit meshStandardMaterial and render black without lights. */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 18, 12]} intensity={1.15} />

      <Chart3D data={data} xKey="month" yKey="revenue" zKey="region">
        <BarSeries3D color="steelblue" />
        <Axis3D axis="x" />
        <Axis3D axis="y" />
        <Axis3D axis="z" />
      </Chart3D>
    </Canvas>
  )
}
```

That's the whole integration: `npm install`, drop `<Chart3D>` into a `<Canvas>`, done.

> **Lighting is the host's job in v0.1.** The series default to `meshStandardMaterial`, which is unlit and renders **black** without lights. Add your own `ambientLight` / `directionalLight` (shown above). A drop-in `<ChartLights>` helper is on the v0.2 roadmap.

> **One series type per chart.** `BarSeries3D` needs a band (string) x axis and `ScatterSeries3D` needs a linear (numeric) one, so use separate `<Chart3D>` roots for each — `Chart3D` dev-warns if it detects both under one root.

> **Trust boundary.** `d3-three` validates rows for finite coordinates and drops bad ones, but it does **not** sanitize your data as untrusted content, and accessors like `tickFormat` run with your app's privileges. If the data is user-supplied, sanitize it before it reaches `<Chart3D>`.

## 3. Framework notes

### Next.js (App Router)

R3F is client-only, and so is `d3-three`. The published bundle already carries a `'use client'` directive at the top, so importing `d3-three` from a Server Component file won't pull three.js into the server bundle. Put your chart in a client component:

```tsx
// app/chart.tsx
'use client'
import { Canvas } from '@react-three/fiber'
import { Chart3D, BarSeries3D } from 'd3-three'

export function Chart() {
  return (
    <Canvas>
      <ambientLight />
      <Chart3D data={data} xKey="x" yKey="y">
        <BarSeries3D />
      </Chart3D>
    </Canvas>
  )
}
```

If you render the canvas from a server component and hit hydration issues, lazy-load it client-side:

```tsx
import dynamic from 'next/dynamic'
const Chart = dynamic(() => import('./chart').then((m) => m.Chart), { ssr: false })
```

### Vite / CRA

No special setup — `import { Chart3D } from 'd3-three'` works out of the box (ESM). A CommonJS build is shipped too, so tooling that `require()`s the package resolves `dist/index.js`.

### TypeScript

Types ship with the package (`dist/index.d.ts`), resolved automatically via the `exports` map — no `@types/d3-three` needed. All component props and `useChart3D()` are fully typed.

## 4. Build a custom series with `useChart3D()`

Every built-in series reads the shared scales from context. You can do the same to render your own geometry:

```tsx
import { useChart3D, axisPosition } from 'd3-three'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

function MyPoints() {
  const {
    data, xKey, yKey, zKey,
    xScale, yScale, zScale,
    bounds, domain,
  } = useChart3D()
  const ref = useRef<THREE.InstancedMesh>(null)

  // `bounds` / `domain` save you re-deriving extents from the scales:
  //   bounds.x → world-space [min, max] (exactly xScale.range())
  //   domain.x → data-space [min, max] or, for a band axis, the string[] list
  const [xMin, xMax] = bounds.x
  console.log('x spans world', xMin, '→', xMax, 'for data', domain.x)

  useLayoutEffect(() => {
    const mesh = ref.current!
    const m = new THREE.Matrix4()
    data.forEach((d, i) => {
      const x = axisPosition(xScale, d[xKey])
      const y = yScale(Number(d[yKey]))
      const z = zKey && zScale ? axisPosition(zScale, d[zKey]) : 0
      m.setPosition(x, y, z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [data, xKey, yKey, zKey, xScale, yScale, zScale])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <octahedronGeometry args={[0.1]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
```

`useChart3D()` throws `useChart3D() must be called inside a <Chart3D>. ...` if used outside a chart, so mistakes fail loudly.

## 5. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `R3F: Hooks can only be used within the Canvas component!` | `<Chart3D>` was rendered outside a `<Canvas>`. Move it inside one. |
| `useChart3D() must be called inside a <Chart3D>.` | A series/primitive was rendered outside `<Chart3D>`. |
| Series renders solid **black** | No lights in the scene — `meshStandardMaterial` is unlit. Add your own `ambientLight` / `directionalLight` (v0.1 leaves lighting to the host). |
| Bars start below the floor | y values are negative; the y scale anchors at 0, so negative bars grow downward by design. |
| A dev console warning about dropped rows | Rows with `NaN`/`Infinity`/missing coordinates are filtered out (dev mode only). |
| Scatter looks flat | No `zKey` on `<Chart3D>` → 2D plane. Add a `zKey` for true 3D. |

See [`../README.md`](../README.md) for the full component/prop reference and [`./publishing.md`](./publishing.md) for releasing the package.
