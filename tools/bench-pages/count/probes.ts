import { counts, detail, updated } from './counter.ts'

/**
 * Render counters of Vue and React for the counting build (`vite.config.ts`,
 * mode `count`): the hooks their production builds report to — the devtools
 * hooks. They have to stand before the framework loads, so `bench.ts`
 * imports this module first; the hosts load later, by `?fw=`. Svelte, Solid
 * and Angular count in their runtime's wrappers (`svelte.js`, `solid.js`,
 * `angular.js`), Web Components have no framework to count.
 *
 * In the timing build the module installs nothing.
 */

/** The fields of a React fiber the commit walk reads. */
type TFiber = {
	tag: number
	type: { displayName?: string; name?: string } | string | null
	flags: number
	child: TFiber | null
	sibling: TFiber | null
	alternate: TFiber | null
}

/**
 * Fiber tags of a rendered component: function, class, `forwardRef` and the
 * simple `memo` (whose fiber is the function itself). `memo` with a compare
 * (14) is left out: its function has a fiber of its own under it.
 */
const COMPONENT_TAGS = new Set([0, 1, 11, 15])

/** The fiber flag React sets on a component it rendered in this pass (`PerformedWork`). */
const PERFORMED_WORK = 1

/** A component's name: its function's, or the one it gave itself. */
function nameOf(fiber: TFiber): string {
	const type = fiber.type

	if (!type || typeof type === 'string') return String(type)

	return type.displayName ?? type.name ?? '?'
}

/**
 * Count the components a commit rendered. A subtree React skipped keeps its
 * children — the new fiber's `child` is the old one's — and is not walked:
 * the flags there are from an earlier commit.
 */
function walk(fiber: TFiber): void {
	for (let child = fiber.child; child; child = child.sibling) {
		const previous = child.alternate

		if (COMPONENT_TAGS.has(child.tag)) {
			if (!previous) counts.mount += 1
			else if (child.flags & PERFORMED_WORK) updated(nameOf(child))
		}

		if (!previous || child.child !== previous.child) walk(child)
	}
}

/** A Vue component's name from its instance. */
function vueName(instance: object): string {
	const type: unknown = Reflect.get(instance, 'type')

	if (!type || typeof type !== 'object') return '?'

	const name: unknown = Reflect.get(type, 'name') ?? Reflect.get(type, '__name')

	return typeof name === 'string' ? name : '?'
}

/**
 * A mounted Vue component (`component:added`, `app, uid, parent, instance`):
 * its render function from now on counts the updates. Vue reads
 * `instance.render` on every render. Its `component:updated` does not tell
 * an update apart: Vue sends it for every slot function run too, under the
 * slot owner's name.
 */
function countVueRenders(instance: unknown): void {
	if (!instance || typeof instance !== 'object') return

	counts.mount += 1

	const render: unknown = Reflect.get(instance, 'render')

	if (typeof render !== 'function') return

	const name = vueName(instance)

	Reflect.set(instance, 'render', function (this: unknown, ...args: unknown[]): unknown {
		updated(name)

		return Reflect.apply(render, this, args)
	})
}

if (import.meta.env.MODE === 'count') {
	Object.assign(window, {
		// Vue (`__VUE_PROD_DEVTOOLS__` in the counting build) reports every
		// component mount here
		__VUE_DEVTOOLS_GLOBAL_HOOK__: {
			enabled: false,
			emit(event: string, ...args: unknown[]) {
				if (event === 'component:added') countVueRenders(args[3])
			},
			on() {},
			once() {},
			off() {},
		},
		// React reports every commit of its production build here
		__REACT_DEVTOOLS_GLOBAL_HOOK__: {
			supportsFiber: true,
			isDisabled: false,
			renderers: new Map(),
			inject: () => 1,
			checkDCE() {},
			onCommitFiberRoot(_id: number, root: { current: TFiber }) {
				walk(root.current)
			},
			onCommitFiberUnmount() {},
			onPostCommitFiberRoot() {},
		},
	})
}

export { counts, detail }
