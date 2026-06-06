// Public API — d3-three
// Components, the Chart3D context hook, and the scale-position helpers for
// building custom marks. (validateData / createScales stay internal.)

export type { Chart3DProps } from './components/Chart3D'
export { Chart3D } from './components/Chart3D'
export type { ChartLightsPreset, ChartLightsProps } from './components/ChartLights'
export { ChartLights } from './components/ChartLights'
export type { Axis3DProps } from './components/marks/Axis3D'
export { Axis3D } from './components/marks/Axis3D'
export type { BarSeries3DProps } from './components/marks/BarSeries3D'
export { BarSeries3D } from './components/marks/BarSeries3D'
export type { ScatterSeries3DProps } from './components/marks/ScatterSeries3D'
export { ScatterSeries3D } from './components/marks/ScatterSeries3D'
export { DEFAULT_PALETTE } from './core/colorBy'
export type { ChartScales } from './core/scales'
export { axisBandwidth, axisPosition, isBandScale } from './core/scales'
export { useChart3D } from './hooks/useChart3D'
export type { SeriesLayout3D, SeriesLayoutRow3D } from './hooks/useSeriesLayout3D'
export { useSeriesLayout3D } from './hooks/useSeriesLayout3D'

export type {
  AxisName,
  AxisScale,
  Chart3DContextValue,
  ChartDimensions,
  ColorAccessor,
  ColorByConfig,
  Datum,
  LinearScale,
  SeriesBaseProps,
  SeriesEventHandler,
} from './types'
