// Public API — d3-three
// Components, the Chart3D context hook, and the scale-position helpers for
// building custom marks. (validateData / createScales stay internal.)

export { Chart3D } from './components/Chart3D'
export type { Chart3DProps } from './components/Chart3D'

export { BarSeries3D } from './components/marks/BarSeries3D'
export type { BarSeries3DProps } from './components/marks/BarSeries3D'

export { ScatterSeries3D } from './components/marks/ScatterSeries3D'
export type { ScatterSeries3DProps } from './components/marks/ScatterSeries3D'

export { Axis3D } from './components/marks/Axis3D'
export type { Axis3DProps } from './components/marks/Axis3D'

export { useChart3D } from './hooks/useChart3D'

export { axisBandwidth, axisPosition, isBandScale } from './core/scales'
export type { ChartScales } from './core/scales'

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
