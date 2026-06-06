import type { ReactElement } from 'react'

export type ChartLightsPreset = 'studio' | 'flat'

export interface ChartLightsProps {
  /** lighting rig to render (default 'studio'). */
  preset?: ChartLightsPreset
  /** multiplies every light's intensity in the preset (default 1). */
  intensity?: number
  /** CSS color for the ambient/fill light (default '#ffffff'). */
  ambientColor?: string
  /** CSS color for the key directional light. 'studio' only — ignored by 'flat'. (default '#ffffff') */
  keyColor?: string
}

/**
 * Opt-in lighting preset the host drops inside its `<Canvas>` so the series'
 * `meshStandardMaterial` (unlit without lights) isn't black. Renders only R3F
 * light intrinsics — no chart context, no scene ownership. Hosts that already
 * light the scene simply don't use it.
 */
export function ChartLights({
  preset = 'studio',
  intensity = 1,
  ambientColor = '#ffffff',
  keyColor = '#ffffff',
}: ChartLightsProps = {}): ReactElement {
  if (preset === 'flat') {
    return <ambientLight color={ambientColor} intensity={1.0 * intensity} />
  }
  return (
    <>
      <ambientLight color={ambientColor} intensity={0.6 * intensity} />
      <directionalLight color={keyColor} position={[10, 18, 12]} intensity={1.15 * intensity} />
      <directionalLight color={keyColor} position={[-12, 8, -6]} intensity={0.35 * intensity} />
    </>
  )
}
