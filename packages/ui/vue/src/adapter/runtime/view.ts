/**
 * The binding view — what `setup()` of a component hands its template.
 *
 * One `Proxy` per component with a handler shared by the module. It reads the
 * view's fields first — `ctrl`, `plugins`, `rootElement` and the component's
 * own values — and then the state records of its contexts in order: the
 * component's, then its facades'. Facade names are prefixed
 * (docs/agents/collections.md, «Имена props фасада префиксуются»), so no name
 * lives in two records.
 *
 * A state record is `shallowReactive` and written by the binding's
 * subscription. Vue creates a `Dep` for a key only when an effect reads it —
 * the render: a property the markup does not read costs a slot of the record
 * and nothing else, and a read on the server or in `setup()` creates nothing.
 * A `shallowRef` per property cost a `RefImpl` and a `Dep` on every property,
 * read by the markup or not — and it reads fewer than half of them
 * (benchmarks/pages/vue.md, 869fmjnaq).
 *
 * Not a getter per property: a closure over the context with a pair of
 * accessors weighs about as much as the `RefImpl` with its `Dep`. Not a
 * spread: it reads every value once, in `setup()`, and unties the markup from
 * the core — hence `joinBindings` and `extendBinding`, which build one flat
 * view again.
 *
 * Presence, keys and descriptors come from the records themselves, untracked:
 * Vue looks a template name up with `hasOwn` on the `setup()` result and, in
 * development, lists its keys. A key with the value `undefined` is present:
 * the subscription hands every property over at once, and a name Vue did not
 * find there on the first read it resolves elsewhere for good. The view is
 * read-only — the state goes core → Vue only; the template ref reaches
 * `rootElement` through the ref itself, the way `proxyRefs` writes a ref.
 */

import { toRaw } from 'vue'

/** What a view reads: its fields, then the state records in order. */
class TViewParts {
	constructor(
		/** `ctrl`, `plugins`, `rootElement` and the component's own values. */
		readonly fields: object,
		/** `shallowReactive` records: the component's state first, then its facades'. */
		readonly states: readonly object[],
	) {}
}

/** The parts behind a view: only joining and extending ask for them. */
const PARTS = Symbol('soldy.binding.parts')

/** Where the key lives — the fields or a state record. Reads no value and tracks nothing. */
function sourceOf({ fields, states }: TViewParts, key: PropertyKey): object | undefined {
	if (Object.hasOwn(fields, key)) return fields

	// `hasOwn` on a reactive record reaches its target: the handler has no `getOwnPropertyDescriptor`
	for (const state of states) if (Object.hasOwn(state, key)) return state

	return undefined
}

const VIEW: ProxyHandler<TViewParts> = {
	// A record is read through its reactive handler: that read is the one Vue tracks
	get: (parts, key) => {
		if (key === PARTS) return parts

		const source = sourceOf(parts, key)

		return source && Reflect.get(source, key)
	},
	has: (parts, key) => sourceOf(parts, key) !== undefined,
	ownKeys: ({ fields, states }) => [
		...new Set([
			...Reflect.ownKeys(fields),
			// The raw record: listing the reactive one would track its iteration
			...states.flatMap((state) => Reflect.ownKeys(toRaw(state))),
		]),
	],
	getOwnPropertyDescriptor: (parts, key) => {
		const source = sourceOf(parts, key)

		return source && Reflect.getOwnPropertyDescriptor(source, key)
	},
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
}

function viewOf(fields: object, states: readonly object[]): object {
	return new Proxy(new TViewParts(fields, states), VIEW)
}

function partsOf(binding: object): TViewParts {
	const parts: unknown = Reflect.get(binding, PARTS)

	if (!(parts instanceof TViewParts)) {
		throw new Error(
			'[soldy] Not a binding: expected the result of useAdapter or useCollectionAdapter',
		)
	}

	return parts
}

/**
 * The view of a context: its fields, then its state record. The boundary
 * between runtime and type, as `toInstanceState` in the other adapters: the
 * proxy reads every field and every property of the state, but TypeScript
 * does not see that.
 */
export function bindingOf<TFields extends object, TState extends object>(
	fields: TFields,
	state: TState,
): TFields & TState {
	const view = viewOf(fields, [state])

	return view as TFields & TState
}

/**
 * The binding of a component and its facades — one view for the markup: the
 * fields of all of them, the component's winning (a facade carries only the
 * same bundle in `plugins`), and their states in order. The hooks are still
 * called in their order: `attach` and `onUnmounted` go by it.
 */
export function joinBindings<TOwner extends object, TFacade extends object>(
	owner: TOwner,
	facade: TFacade,
): TOwner & TFacade
export function joinBindings<
	TOwner extends object,
	TFacade extends object,
	TOwnerFacade extends object,
>(owner: TOwner, facade: TFacade, ownerFacade: TOwnerFacade): TOwner & TFacade & TOwnerFacade
export function joinBindings(owner: object, ...facades: object[]): object {
	const parts = [owner, ...facades].map(partsOf)
	const fields = {}

	for (const part of [...parts].reverse()) Object.assign(fields, part.fields)

	return viewOf(
		fields,
		parts.flatMap(({ states }) => states),
	)
}

/**
 * The binding with the component's own values — icon tags, an inner instance,
 * attribute groups: they win over a state property of the same name, as a
 * spread after the binding did.
 */
export function extendBinding<TView extends object, TValues extends object>(
	binding: TView,
	values: TValues,
): Omit<TView, keyof TValues> & TValues {
	const { fields, states } = partsOf(binding)
	const view = viewOf({ ...fields, ...values }, states)

	return view as Omit<TView, keyof TValues> & TValues
}
