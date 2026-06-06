import { useThree } from '@react-three/fiber'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactThreeTest } from '@react-three/test-renderer'
import { Profiler, type ReactNode, useState } from 'react'
import type * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart3D } from '../../src/components/Chart3D'
import { BarSeries3D } from '../../src/components/marks/BarSeries3D'
import type { Datum } from '../../src/types'

type TestInstance = ReactThreeTest.ReactThreeTestInstance

afterEach(() => {
  vi.restoreAllMocks()
})

/** 100 band-x rows, all valid. The dense-bar hover-perf scenario. */
const HUNDRED: Datum[] = Array.from({ length: 100 }, (_, i) => ({
  m: `c${i}`,
  v: (i % 17) + 1,
}))

/**
 * Finds the InstancedMesh node by its `isInstancedMesh` flag. A THREE
 * InstancedMesh reports `.type === 'Mesh'`, so RTTR's `findByType('InstancedMesh')`
 * never matches — the flag is the reliable key. Returns the RTTR TestInstance
 * (needed by `fireEvent`, which reads handler props off the node).
 */
function findMeshNode(scene: TestInstance): TestInstance {
  return scene.find((n) =>
    Boolean(n.instance && (n.instance as THREE.InstancedMesh).isInstancedMesh),
  )
}

describe('hover triggers ZERO series re-renders (render-count spy)', () => {
  it('100 bars: hovering EVERY instance (over+out) commits the series subtree 0 ADDITIONAL times', async () => {
    // <Profiler> fires onRender on every COMMIT of its subtree (mount + each
    // update), regardless of renderer — R3F drives the same React reconciler, so
    // a commit of <BarSeries3D> is observed here. Hover is imperative
    // (setColorAt + needsUpdate, zero React state) so it must produce zero
    // update-phase commits. We count only 'update' commits so the mount commit
    // does not mask a regression.
    //
    // ADVERSARIAL COVERAGE across every instance: a narrower test that only
    // hovers instanceId 42 cannot prove the guarantee holds for EVERY instance —
    // a regression that re-renders on, say, even ids, or only on id 0, would slip
    // through. So this loops over ALL 100 instances and asserts the running
    // update-commit count stays 0 after each over/out pair.
    const onRender = vi.fn()
    let updateCommits = 0
    const profiled = (
      <Profiler
        id="bar-series"
        onRender={(_id, phase) => {
          onRender(phase)
          if (phase === 'update') updateCommits++
        }}
      >
        <BarSeries3D highlightColor="#ffffff" />
      </Profiler>
    )

    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={HUNDRED} xKey="m" yKey="v">
        {profiled}
      </Chart3D>,
    )

    // Sanity: the subtree mounted (a 'mount' phase commit happened). This proves
    // the Profiler is actually wired to BarSeries3D — the later 0-assertion is
    // therefore non-vacuous.
    expect(onRender).toHaveBeenCalled()
    const mountCommits = updateCommits
    expect(mountCommits).toBe(0) // no UPDATE commits during initial mount

    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    expect(mesh.count).toBe(HUNDRED.length)

    // Hover EVERY one of the 100 bars in turn (over then out), asserting the
    // commit count never budges off 0 for ANY instanceId. This is the genuine
    // proof of the zero-rerender guarantee across all instances, not just one.
    for (let id = 0; id < HUNDRED.length; id++) {
      await renderer.fireEvent(node, 'pointerOver', { instanceId: id })
      await renderer.fireEvent(node, 'pointerOut', { instanceId: id })
      // Per-instance assertion: a regression that only fires on certain ids
      // (e.g. id 7) would trip here at that exact id, not be averaged away.
      expect(updateCommits).toBe(0)
    }

    // THE CRITICAL ASSERTION: across all 100 instances the imperative hover
    // produced 0 additional series commits. If hover used React state (setState),
    // React would commit the series subtree and updateCommits would be > 0.
    expect(updateCommits).toBe(0)

    await renderer.unmount()
  })

  it('100 bars: RAPID successive pointerOver across instances (no intervening pointerOut) still commits 0 times', async () => {
    // Adversarial sequence: real pointer motion across a dense bar field fires a
    // burst of pointerOver events on different instanceIds without a matching
    // pointerOut between them (R3F dispatches over for the newly-entered instance
    // before/without out for the old one in fast moves). A naive implementation
    // that re-rendered to "track the previously hovered id" via state would
    // commit on every one of these. The imperative setColorAt path must not.
    let updateCommits = 0
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={HUNDRED} xKey="m" yKey="v">
        <Profiler
          id="bar-series-rapid"
          onRender={(_id, phase) => {
            if (phase === 'update') updateCommits++
          }}
        >
          <BarSeries3D highlightColor="#ffffff" />
        </Profiler>
      </Chart3D>,
    )

    expect(updateCommits).toBe(0) // mount produced no update commits

    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    expect(mesh.count).toBe(HUNDRED.length)

    // Fire a rapid burst of pointerOver on DISTINCT ids back-to-back, with no
    // pointerOut in between — the worst case for any state-based hover tracker.
    for (let id = 0; id < HUNDRED.length; id++) {
      await renderer.fireEvent(node, 'pointerOver', { instanceId: id })
    }
    // Then a rapid burst that re-enters the same id repeatedly (the `id === prev`
    // early-return path) — must also produce no commits.
    for (let k = 0; k < 20; k++) {
      await renderer.fireEvent(node, 'pointerOver', { instanceId: 50 })
    }
    await renderer.fireEvent(node, 'pointerOut', { instanceId: 50 })

    expect(updateCommits).toBe(0)

    await renderer.unmount()
  })

  it('control: a state-driven hover DOES commit the subtree (proves the spy is not vacuous)', async () => {
    // This negative control swaps the imperative pattern for a React-state one
    // and asserts the Profiler observes the resulting update commit. If this
    // control ever stopped detecting the commit, the 0-assertion above would be
    // meaningless. (We don't ship this component — it lives only in the test.)
    let updateCommits = 0
    function StatefulHoverMark() {
      const [, setHovered] = useState(-1)
      return (
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(e.instanceId ?? 0)
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(
      <Profiler
        id="stateful"
        onRender={(_id, phase) => {
          if (phase === 'update') updateCommits++
        }}
      >
        <StatefulHoverMark />
      </Profiler>,
    )

    const meshNode = renderer.scene.find((n) =>
      Boolean(n.instance && (n.instance as THREE.Mesh).isMesh),
    )
    await renderer.fireEvent(meshNode, 'pointerOver', { instanceId: 3 })

    // setState forced exactly the kind of re-render the real component avoids.
    expect(updateCommits).toBeGreaterThan(0)

    await renderer.unmount()
  })
})

describe('e.instanceId maps to the filtered data index', () => {
  it('maps instanceId to the validated (NaN-filtered) row, not the raw input row', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Raw input: index 1 is invalid (NaN y) and gets DROPPED by validation. So
    // post-filter the rows are [Jan(10), Mar(30), Apr(40)]. instanceId 1 must
    // therefore resolve to "Mar" (raw index 2), proving instanceId indexes the
    // FILTERED array (the validation source of truth), not the original input.
    const raw: Datum[] = [
      { m: 'Jan', v: 10 },
      { m: 'Feb', v: Number.NaN }, // dropped
      { m: 'Mar', v: 30 },
      { m: 'Apr', v: 40 },
    ]
    const onClick = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={raw} xKey="m" yKey="v">
        <BarSeries3D onClick={onClick} />
      </Chart3D>,
    )

    const node = findMeshNode(renderer.scene)
    const mesh = node.instance as THREE.InstancedMesh
    // Count reflects the filtered length (3), not the raw length (4).
    expect(mesh.count).toBe(3)

    await renderer.fireEvent(node, 'click', { instanceId: 1 })

    expect(onClick).toHaveBeenCalledTimes(1)
    const [event, datum, index] = onClick.mock.calls[0]
    expect(event.instanceId).toBe(1)
    expect(index).toBe(1)
    // The datum bound to instanceId 1 is the SECOND valid row (Mar), not the
    // second raw row (Feb, which was filtered out).
    expect(datum).toEqual({ m: 'Mar', v: 30 })

    await renderer.unmount()
  })
})

describe('invalidate() is called on hover under frameloop="demand"', () => {
  it('pointerOver invalidates the on-demand render loop (imperative redraw request)', async () => {
    const invalidateSpy = vi.fn()

    // Probe rendered BEFORE BarSeries3D: during its render it swaps the store's
    // `invalidate` for a spy. BarSeries3D then reads `useThree((s)=>s.invalidate)`
    // at ITS render and captures the spy — so the spy is the very function the
    // component calls on hover. (zustand state is mutated via setState so the
    // selector sees the new value.)
    function InstallInvalidateSpy({ children }: { children: ReactNode }) {
      const store = useThree((s) => s)
      // Replace once; keep idempotent across StrictMode double-invoke.
      if (store.invalidate !== invalidateSpy) {
        store.invalidate = invalidateSpy
      }
      return <>{children}</>
    }

    const renderer = await ReactThreeTestRenderer.create(
      <Chart3D data={HUNDRED} xKey="m" yKey="v">
        <InstallInvalidateSpy>
          <BarSeries3D highlightColor="#ffffff" />
        </InstallInvalidateSpy>
      </Chart3D>,
      { frameloop: 'demand' },
    )

    const node = findMeshNode(renderer.scene)
    // Ignore any invalidate() the mount-time layout effects fired; we assert on
    // the DELTA caused by the hover interaction.
    const before = invalidateSpy.mock.calls.length
    await renderer.fireEvent(node, 'pointerOver', { instanceId: 7 })
    expect(invalidateSpy.mock.calls.length).toBeGreaterThan(before)

    await renderer.unmount()
  })
})
