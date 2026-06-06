// Vitest setup (jsdom).
//
// jsdom has no 2D canvas context, so any `canvas.getContext('2d')` call (e.g.
// Axis3D's text-label sprites) makes jsdom emit a noisy "Not implemented:
// HTMLCanvasElement.prototype.getContext" error. We intercept '2d' here and
// return null so the library's graceful null-skip path runs quietly.
//
// @react-three/test-renderer installs its own getContext patch that stubs
// 'webgl*' and delegates everything else to whatever was on the prototype
// before it — i.e. this wrapper — so '2d' still resolves to null after RTTR
// loads. Real 2D text rendering is exercised in the browser example, not here.
// Guarded so the shared setup is a no-op under the node environment (the SSR
// import test), where there is no HTMLCanvasElement.
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ): unknown {
    if (contextId === '2d') return null
    return (originalGetContext as (...a: unknown[]) => unknown).call(this, contextId, ...args)
  } as typeof HTMLCanvasElement.prototype.getContext
}
