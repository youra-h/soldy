/**
 * useAdapter — the one Vue hook of the project.
 *
 * 1. Binds the component to Vue through the exchange `adapter.connect()` in
 *    `setup()`: the state record and the inputs; the events and
 *    `update:<prop>` for `v-model` — from `onBeforeMount`, once the whole
 *    assembly is done
 * 2. Accepts the component — `adapter.attach()` in `setup()`
 * 3. Binds the root DOM element to `TElementPlugin` through the context
 * 4. Calls `adapter.destroy()` when the component unmounts
 *
 * The template gets a view of the binding (`./view.ts`): a component with
 * facades joins them with `joinBindings`, and adds its own values with
 * `extendBinding`.
 */

import {
	ref,
	shallowReactive,
	watch,
	onBeforeMount,
	onBeforeUnmount,
	onUnmounted,
	onBeforeUpdate,
	getCurrentInstance,
	type Ref,
} from 'vue'
import { TElementPlugin } from '@soldy-ui/plugins'
import { type IAdapterContext, type IComponentContract, type TInstanceState } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { VueProfile } from '../common'
import { bindingOf } from './view'

/**
 * Вспомогательный тип: извлекает публичные свойства и геттеры из контроллера (TInstance),
 * исключая методы (функции).
 */
export type TExtractControllerState<TInstance> = {
	[
		K in keyof TInstance as TInstance[K] extends (...args: never[]) => unknown ? never : K
	]: TInstance[K]
}

/** Props as the template sees them: refs among them are unwrapped, as a `setup()` result's are. */
export type TUnwrapRefs<T> = {
	[K in keyof T]: T[K] extends Ref<infer U> ? U : T[K]
}

/**
 * What `useAdapter` returns and the template sees:
 * - `ctrl` — the controller instance
 * - `plugins` — the plugin bundle
 * - `rootElement` — the ref of the root, when the bundle has `TElementPlugin`
 * - the state (`TBindingState`)
 */
export type TBinding<C extends IComponentContract, TProps> = TBindingFields<C> &
	TBindingState<C, TProps>

/** The fields of a component's view: read before its state. */
export type TBindingFields<C extends IComponentContract> = {
	ctrl: C['instance']
	plugins: IPluginBundle | null
	rootElement?: Ref<Element | null>
}

/**
 * The state in types: the props `TProps`, the instance properties and the
 * plugin outputs of the contract — the latter of the same kind as in the other
 * adapters (`TInstanceState`): a snapshot, read-only, an optional key.
 */
export type TBindingState<C extends IComponentContract, TProps> = TUnwrapRefs<TProps> &
	TExtractControllerState<C['instance']> &
	TInstanceState<C['plugins']['outputs']>

/**
 * The typed state record (`TBindingState`).
 *
 * The boundary between runtime and type, one for `useAdapter` and
 * `useCollectionAdapter` — as `toInstanceState` in the other adapters. The
 * record is filled by the descriptor from the same instance and the same
 * plugins the contract `C` describes, but by property names — the descriptor
 * holds that link, TypeScript does not see it.
 */
export function toBindingState<C extends IComponentContract, TProps>(
	record: Readonly<Record<string, unknown>>,
): TBindingState<C, TProps> {
	return record as TBindingState<C, TProps>
}

/** A new key of a plain record, as an assignment would make it, but keeping the record a fast object. */
function define(record: Record<string, unknown>, name: string, value: unknown): void {
	Object.defineProperty(record, name, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	})
}

/**
 * What `useAdapter` and `useCollectionAdapter` share: the subscriptions, the
 * acceptance and the cleanup. Returns the state record of the context.
 */
export function useAdapterParts(
	adapter: IAdapterContext,
	props: object,
	emit?: (event: string, ...args: unknown[]) => void,
): Readonly<Record<string, unknown>> {
	const link = adapter.connect(VueProfile)
	const offs: Array<() => void> = []

	// 1. Core → Vue: one shallow reactive record per context. The subscription
	// hands every property with triggers over at once — through the same call
	// a trigger uses: that is how the record gets its keys, all of them before
	// the first render.
	//
	// Vue creates a `Dep` for a key when an effect reads it — the render, — so
	// a property the markup does not read costs a slot of the record: a
	// `shallowRef` per property cost a `RefImpl` and a `Dep` on every one of
	// them (benchmarks/pages/vue.md, 869fmjnaq). The record is shallow: the
	// core hands values, not handles on live state, and reports a change with a
	// new value (AGENTS.md, «Контракт границы core → ui»). A deep record would
	// wrap everything composite — the cell array of a table row, every cell,
	// its `aria` and `dataset`, the collection items — in proxies with a
	// dependency per read key, and nobody changes them in place: in the table
	// that was almost a fifth of a row's memory (benchmarks/table/history.md,
	// 869fekb4g).
	//
	// A new key — the values handed over inside `subscribe()` — is defined on
	// the plain record, past the proxy: nobody has read it yet, and the proxy's
	// `set` with a trigger on every key cost a page about 5% of its mount
	// (benchmarks/pages/vue.md, 869fmjnaq). Defined, not assigned: assigning
	// new keys by name turns a record of more than a dozen keys into a
	// dictionary, while defining keeps it a fast object whose shape every mount
	// of the type shares. A key the record has is a change and goes through
	// the proxy, which notifies whoever read it
	const record: Record<string, unknown> = {}
	const state = shallowReactive(record)

	offs.push(
		link.state.subscribe((name, value) => {
			if (Object.hasOwn(record, name)) state[name] = value
			else define(record, name, value)
		}),
	)

	// 2. Vue → core: the inputs go to the core as a full set before a render
	// that brought a new vnode from the parent. A parent pass that changed the
	// props updates the component, and Vue calls `onBeforeUpdate` with the new
	// props already in place and before the render; a render of the
	// component's own state keeps the vnode and leaves the inputs alone.
	// Unchanged inputs write nothing: the input memory swallows a repeat. The
	// starting values were applied by the context assembly, so only changes
	// go here.
	//
	// Not a `watch` over the props: to have Vue track the inputs its getter
	// read every one of them, and each read of the props proxy creates a `Dep`
	// and a `Link` for its key, present or not, on top of the effect with its
	// scheduler and closures — on every component. That was a tenth of a
	// button and a seventh of a Select page (benchmarks/pages/vue.md, 869fmhuag)
	const instance = getCurrentInstance()
	let vnode = instance?.vnode

	onBeforeUpdate(() => {
		if (!instance || instance.vnode === vnode) return

		vnode = instance.vnode
		link.inputs.full(props)
	})

	// 3. Events: the core's events and `update:<prop>` for `v-model` — the
	// exchange sends it by the profile, right after the core event.
	//
	// The consumer hears the component from its full assembly, as in the other
	// adapters (benchmarks/parity/README.md): `onBeforeMount` comes after the
	// whole `setup()` — every context of the component accepted — and before
	// the render that creates the children. What the assembly writes is the
	// starting state: the collection facade, accepted after the component,
	// writes into it — the months of Calendar's grids, Table's `dataset`, —
	// and a subscription from `setup()` sent that as events. The markup items
	// join the collection on the render, after the hook, and are heard. There
	// is no mount on the server, so no events there either, as in React.
	//
	// The consumer hears nothing once the unmount began: Vue unmounts the
	// parent's hooks first and its children after, and the markup items
	// leaving the collection sent `update:items` with an ever shorter list —
	// `v-model:items` of a `v-if`-ed owner emptied the parent's list. The blur
	// of the removed node went out the same way
	if (emit) {
		let stop: (() => void) | undefined

		onBeforeMount(() => {
			stop = link.events.listen((name, args) => emit(name, ...args))
		})
		onBeforeUnmount(() => stop?.())
	}

	// 4. The component is accepted: in Vue that is `setup()` itself, with no
	// repeats and no discarded assemblies. Here, not in `onMounted`: `setup()`
	// runs on the server too, and a collection item has to join the collection
	// before the server markup
	adapter.attach()

	// 5. Cleanup. Unsubscribing is a must: with an external `ctrl` that
	// outlives the component, `adapter.destroy()` leaves `instance.events`
	// alone — the handlers would pile up with every mount
	onUnmounted(() => {
		offs.forEach((off) => off())
		adapter.destroy()
	})

	return state
}

/**
 * The node behind a template ref: Vue puts a component's instance there when
 * the root is drawn by a component — Icon's `tag` is its glyph — and the node
 * is that instance's `$el`.
 */
function elementOf(root: unknown): Element | null {
	if (root instanceof Element) return root

	const el: unknown = typeof root === 'object' && root !== null ? Reflect.get(root, '$el') : null

	return el instanceof Element ? el : null
}

/**
 * The ref of the root bound to `TElementPlugin` — only where the bundle has
 * the plugin: headless layers do not. A facade shares the component's bundle
 * and has no node of its own, so `useCollectionAdapter` does not call this.
 *
 * The plugin gets the node, whatever the template wrote into the ref
 * (`elementOf`): a component's instance in `TElementPlugin` gave no
 * `element:ready`, and the plugins of Icon with a glyph never got a node.
 */
function useRootElement(adapter: IAdapterContext): Ref<Element | null> | undefined {
	if (!adapter.bundle?.get(TElementPlugin)) return undefined

	const rootElement = ref<Element | null>(null)

	watch(rootElement, (root) => adapter.bindElement(elementOf(root)), { flush: 'post' })

	return rootElement
}

/**
 * The binding of a component: its fields and its state.
 *
 * The component writes no generics: the instance and the plugin outputs come
 * from the contract in the context type (`createVueAdapterContext` infers it),
 * the props from `props` themselves.
 */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	emit?: (event: string, ...args: unknown[]) => void,
): TBinding<C, TProps> {
	const state = toBindingState<C, TProps>(useAdapterParts(adapter, props, emit))
	const rootElement = useRootElement(adapter)
	const fields: TBindingFields<C> = rootElement
		? { ctrl: adapter.instance, plugins: adapter.bundle, rootElement }
		: { ctrl: adapter.instance, plugins: adapter.bundle }

	return bindingOf(fields, state)
}
