/**
 * The counters of the counting build (`vite.config.ts`, mode `count`): the
 * framework's render work, which the interaction run (`interaction.mjs`) reads
 * before and after every action. `mount` — a render unit (a component, a
 * render effect) run for the first time, `update` — run again, `tick` — a
 * change detection pass (Angular only).
 */
export const counts = { mount: 0, update: 0, tick: 0 }

/**
 * Updates by component name, while the runner asks for them
 * (`bench.detail`): which components an action rendered again. Svelte and
 * Solid count effects, which have no names.
 */
export const detail: { names: Map<string, number> | null } = { names: null }

/** Count an update of the named component. */
export function updated(name: string): void {
	counts.update += 1

	if (detail.names) detail.names.set(name, (detail.names.get(name) ?? 0) + 1)
}

/**
 * A render function that counts its runs: the first one is a mount, the next
 * are updates. One wrapper per render unit, so a unit created later — a panel
 * opened by the action — counts its own first run as a mount.
 */
export function counted<TArgs extends unknown[], TResult>(
	fn: (this: unknown, ...args: TArgs) => TResult,
): (this: unknown, ...args: TArgs) => TResult {
	let first = true

	return function (this: unknown, ...args: TArgs) {
		if (first) counts.mount += 1
		else updated('(effect)')

		first = false

		return fn.apply(this, args)
	}
}
