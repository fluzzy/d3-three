import { Canvas } from '@react-three/fiber'
import { Axis3D, BarSeries3D, Chart3D, ScatterSeries3D } from 'd3-three'
import type { Datum } from 'd3-three'
import { useEffect, useRef, useState } from 'react'

/**
 * Inline host lights. v0.1 does not own the scene, so the host lights it — the
 * series default to the unlit `meshStandardMaterial` and would render black
 * otherwise. (A drop-in `<ChartLights>` helper is on the v0.2 roadmap.)
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 18, 12]} intensity={1.15} />
      <directionalLight position={[-8, 6, -10]} intensity={0.35} />
    </>
  )
}

const REGIONS = ['NA', 'EU', 'APAC'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr'] as const

// Grouped data: month (x, band) × region (z, band) → revenue (y).
const sales = MONTHS.flatMap((month, mi) =>
  REGIONS.map((region, ri) => ({
    month,
    region,
    revenue: 35 + mi * 14 + ri * 18 + ((mi * 7 + ri * 13) % 11) * 2,
  })),
)

// Deterministic pseudo-random so screenshots are stable.
let seed = 1
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

// 3D scatter cloud (400 points).
const points = Array.from({ length: 400 }, () => {
  const x = rand() * 100
  const y = rand() * 100
  const z = rand() * 100
  return { x, y, z, v: (x + y + z) / 300 }
})

// Single-series bars for the hover-readout panel (month → revenue).
const monthly = MONTHS.map((month, mi) => ({
  month,
  revenue: 60 + mi * 22 + (mi % 2) * 14,
}))

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', height: '50vh', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 14,
          zIndex: 1,
          color: '#cbd5e1',
          font: '13px ui-monospace, monospace',
          letterSpacing: '0.02em',
          pointerEvents: 'none',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

/**
 * Panel 3 — value-readout pattern. The imperative hover inside the series keeps
 * the highlight cheap (no re-render); here we additionally lift the hovered
 * datum into React state purely to drive a DOM overlay, which is the cheap part
 * (one small div) and only re-renders on enter/leave, not on every pointer move.
 */
function HoverPanel() {
  const [hovered, setHovered] = useState<{ month: string; revenue: number } | null>(null)

  return (
    <Panel title="hover readout — BarSeries3D">
      <Canvas camera={{ position: [9, 8, 11], fov: 50 }}>
        <color attach="background" args={['#0b0f1a']} />
        <Lights />
        <Chart3D
          data={monthly as Datum[]}
          xKey="month"
          yKey="revenue"
          width={9}
          height={6}
          depth={4}
        >
          <BarSeries3D
            color="#4e79a7"
            onPointerOver={(_e, d) =>
              setHovered({ month: String(d.month), revenue: Number(d.revenue) })
            }
            onPointerOut={() => setHovered(null)}
          />
          <Axis3D axis="x" />
          <Axis3D axis="y" />
        </Chart3D>
      </Canvas>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          zIndex: 1,
          padding: '6px 10px',
          borderRadius: 6,
          background: hovered ? 'rgba(78,121,167,0.92)' : 'rgba(30,41,59,0.85)',
          color: '#f8fafc',
          font: '12px ui-monospace, monospace',
          pointerEvents: 'none',
          transition: 'background 120ms ease',
        }}
      >
        {hovered
          ? `month: ${hovered.month} · revenue: ${hovered.revenue}`
          : 'hover a bar to read its value'}
      </div>
    </Panel>
  )
}

/**
 * Panel 4 — live updates. The point array lives in React state and a 1500ms
 * interval mutates it (new values, and occasionally a new length). Each tick
 * produces a fresh array reference, so the series recreates its instances and
 * the scales rescale — demonstrating smooth dynamic recreation.
 */
function LivePanel() {
  const [live, setLive] = useState(() =>
    Array.from({ length: 60 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      z: rand() * 100,
      v: rand(),
    })),
  )
  const tickRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1
      setLive((prev) => {
        // Occasionally change the length to exercise instance recreation.
        const grow = tickRef.current % 3 === 0
        const len = grow ? Math.min(prev.length + 20, 200) : Math.max(prev.length - 10, 40)
        return Array.from({ length: len }, () => ({
          x: rand() * 100,
          y: rand() * 100,
          z: rand() * 100,
          v: rand(),
        }))
      })
    }, 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <Panel title={`live update — ScatterSeries3D (${live.length} pts)`}>
      <Canvas camera={{ position: [13, 11, 15], fov: 50 }}>
        <color attach="background" args={['#0b0f1a']} />
        <Lights />
        <Chart3D data={live as Datum[]} xKey="x" yKey="y" zKey="z" width={10} height={8} depth={10}>
          <ScatterSeries3D size={0.22} color="#8b5cf6" />
          <Axis3D axis="x" />
          <Axis3D axis="y" />
          <Axis3D axis="z" />
        </Chart3D>
      </Canvas>
    </Panel>
  )
}

export function App() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      {/* Panel 1 — grouped 3D bars (month × region). v0.1 = single `color`. */}
      <Panel title="grouped BarSeries3D — month × region">
        <Canvas camera={{ position: [13, 11, 15], fov: 50 }}>
          <color attach="background" args={['#0b0f1a']} />
          <Lights />
          <Chart3D
            data={sales as Datum[]}
            xKey="month"
            yKey="revenue"
            zKey="region"
            width={10}
            height={6}
            depth={8}
          >
            <BarSeries3D color="#4e79a7" />
            <Axis3D axis="x" />
            <Axis3D axis="y" />
            <Axis3D axis="z" />
          </Chart3D>
        </Canvas>
      </Panel>

      {/* Panel 2 — 400-point scatter cloud. */}
      <Panel title="ScatterSeries3D — 400 points">
        <Canvas camera={{ position: [13, 11, 15], fov: 50 }}>
          <color attach="background" args={['#0b0f1a']} />
          <Lights />
          <Chart3D
            data={points as Datum[]}
            xKey="x"
            yKey="y"
            zKey="z"
            width={10}
            height={8}
            depth={10}
          >
            <ScatterSeries3D size={0.18} color="#f59e0b" />
            <Axis3D axis="x" />
            <Axis3D axis="y" />
            <Axis3D axis="z" />
          </Chart3D>
        </Canvas>
      </Panel>

      {/* Panel 3 — hover value readout. */}
      <HoverPanel />

      {/* Panel 4 — live-updating data. */}
      <LivePanel />
    </div>
  )
}
