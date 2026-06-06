/**
 * True outside production builds. Used to gate dev-only `console.warn`s (data
 * validation, scale-type mismatches) so they're stripped/quiet in prod bundles.
 * `process.env.NODE_ENV` is replaced at consumer build time by bundlers.
 */
export const isDev =
  typeof process !== 'undefined' &&
  typeof process.env !== 'undefined' &&
  process.env.NODE_ENV !== 'production'
