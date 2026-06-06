// Public API — d3-three v0.1
// Components and the Chart3D context hook. Core utilities (scales/validation)
// stay internal in v0.1; standalone hooks land in v0.2.

export { Chart3D } from './components/Chart3D'
export type { Chart3DProps } from './components/Chart3D'

export { BarSeries3D } from './components/BarSeries3D'
export type { BarSeries3DProps } from './components/BarSeries3D'

export { ScatterSeries3D } from './components/ScatterSeries3D'
export type { ScatterSeries3DProps } from './components/ScatterSeries3D'

export { Axis3D } from './components/Axis3D'
export type { Axis3DProps } from './components/Axis3D'

export { useChart3D } from './hooks/useChart3D'

export type {
  Datum,
  AxisScale,
  LinearScale,
  AxisName,
  ChartDimensions,
  Chart3DContextValue,
  SeriesBaseProps,
  SeriesEventHandler,
} from './types'
