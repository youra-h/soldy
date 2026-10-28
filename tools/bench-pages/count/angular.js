/**
 * Angular's core for the counting build (`vite.config.ts`, mode `count`,
 * alias of `@angular/core`): every component's template counts its passes —
 * the creation pass and the first update after it are the mount, every next
 * update pass is an update — and `ApplicationRef` counts its change detection
 * ticks. The compiled components define themselves with `ɵɵdefineComponent`
 * imported from `@angular/core`, the linked packages too.
 */
import {
	ApplicationRef,
	ɵɵdefineComponent as defineComponent,
} from '../../../node_modules/@angular/core/fesm2022/core.mjs'
import { counts, updated } from './counter.ts'

export * from '../../../node_modules/@angular/core/fesm2022/core.mjs'

/** Component instances created and not yet updated: their first update is a part of the mount. */
const fresh = new WeakSet()

export function ɵɵdefineComponent(definition) {
	const template = definition.template

	return defineComponent({
		...definition,
		template(rf, ctx) {
			if (rf & 1) {
				counts.mount += 1
				fresh.add(ctx)
			} else if (rf & 2) {
				if (fresh.has(ctx)) fresh.delete(ctx)
				else updated(ctx?.constructor?.name ?? '?')
			}

			return template.call(this, rf, ctx)
		},
	})
}

const tick = ApplicationRef.prototype._tick

ApplicationRef.prototype._tick = function (...args) {
	counts.tick += 1

	return tick.apply(this, args)
}
