import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { ChartLights } from '../../src/components/ChartLights'
import { BarSeries3D } from '../../src/components/marks/BarSeries3D'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

const lights = (scene: TestInstance) =>
  scene.findAll((n) => Boolean((n.instance as THREE.Light | undefined)?.isLight))
const ambients = (scene: TestInstance) =>
  scene.findAll((n) => Boolean((n.instance as THREE.AmbientLight | undefined)?.isAmbientLight))
const directionals = (scene: TestInstance) =>
  scene.findAll((n) =>
    Boolean((n.instance as THREE.DirectionalLight | undefined)?.isDirectionalLight),
  )
const meshes = (scene: TestInstance) =>
  scene.findAll((n) => Boolean((n.instance as THREE.Mesh | undefined)?.isMesh))

describe('ChartLights renders only lights', () => {
  it('adds at least one light and no mesh of its own', async () => {
    const renderer = await ReactThreeTestRenderer.create(<ChartLights />)
    expect(lights(renderer.scene).length).toBeGreaterThanOrEqual(1)
    expect(meshes(renderer.scene)).toHaveLength(0)
    await renderer.unmount()
  })

  it('does not require a <Chart3D> context (never throws on its own)', async () => {
    await expect(ReactThreeTestRenderer.create(<ChartLights />)).resolves.toBeDefined()
  })
})

describe('ChartLights presets', () => {
  it("'studio' (default): one ambient + two directional lights", async () => {
    const renderer = await ReactThreeTestRenderer.create(<ChartLights />)
    expect(ambients(renderer.scene)).toHaveLength(1)
    expect(directionals(renderer.scene)).toHaveLength(2)
    await renderer.unmount()
  })

  it("'flat': a single ambient, zero directional (shadeless)", async () => {
    const renderer = await ReactThreeTestRenderer.create(<ChartLights preset="flat" />)
    expect(ambients(renderer.scene)).toHaveLength(1)
    expect(directionals(renderer.scene)).toHaveLength(0)
    await renderer.unmount()
  })
})

describe('ChartLights knobs', () => {
  it('intensity multiplies every preset light (studio key === 1.15 * intensity)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<ChartLights intensity={2} />)
    const dirIntensities = directionals(renderer.scene).map(
      (n) => (n.instance as THREE.DirectionalLight).intensity,
    )
    // key light is the brightest directional in the studio rig (1.15 base).
    expect(Math.max(...dirIntensities)).toBeCloseTo(1.15 * 2, 5)
    // ambient also scales (0.6 base).
    const amb = ambients(renderer.scene)[0].instance as THREE.AmbientLight
    expect(amb.intensity).toBeCloseTo(0.6 * 2, 5)
    await renderer.unmount()
  })

  it('ambientColor / keyColor reach the lights', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <ChartLights ambientColor="#ff0000" keyColor="#00ff00" />,
    )
    const amb = ambients(renderer.scene)[0].instance as THREE.AmbientLight
    // Compare via the SAME color pipeline (THREE color management) to avoid
    // raw-hex flakiness in the headless renderer.
    expect(amb.color.getHex()).toBe(new THREE.Color('#ff0000').getHex())
    const key = directionals(renderer.scene)
      .map((n) => n.instance as THREE.DirectionalLight)
      .find((d) => d.position.x > 0)
    expect(key).toBeDefined()
    expect(key!.color.getHex()).toBe(new THREE.Color('#00ff00').getHex())
    await renderer.unmount()
  })
})

describe('ChartLights is opt-in (ownership unchanged)', () => {
  it('Chart3D without <ChartLights> emits zero light nodes', async () => {
    const data = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: 20 },
    ]
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={data} xKey="m" yKey="v">
        <BarSeries3D />
      </Chart3D>,
    )
    expect(lights(renderer.scene)).toHaveLength(0)
    await renderer.unmount()
  })
})
