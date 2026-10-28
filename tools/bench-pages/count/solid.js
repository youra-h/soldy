/**
 * Solid for the counting build (`vite.config.ts`, mode `count`, alias of
 * `solid-js`): render effects count their runs. `solid-js/web` builds its
 * template effects (`effect`), insertions (`insert`) and spreads (`spread`) on
 * `createRenderEffect` imported from `solid-js`, so they all pass here.
 */
import { createRenderEffect as renderEffect } from '../../../node_modules/solid-js/dist/solid.js'
import { counted } from './counter.ts'

export * from '../../../node_modules/solid-js/dist/solid.js'

export function createRenderEffect(fn, value, options) {
	return renderEffect(counted(fn), value, options)
}
