/**
 * useAdapter — binds an adapter context to Svelte, the counterpart of Vue's
 * `useAdapter`.
 *
 * 1. Core → Svelte: a subscription to the binding state; a property read in a
 *    tracking context keeps its value in a raw rune
 * 2. Svelte → Core: input props in an effect
 * 3. Events — to the `onXxx` callback props, from the full assembly
 * 4. The component is accepted — `adapter.attach()` at initialisation
 * 5. The root — by an attachment: to `TElementPlugin`, to the component's
 *    `ref` and to the `rootElement` rune
 * 6. Cleanup on destroy
 *
 * A component with collection facades binds its own context with
 * `useOwnerAdapter` and each facade with `useCollectionAdapter`; `joinBindings`
 * joins them and starts the events of all of them, once every context is
 * accepted. AGENTS.md (Svelte), «Связка».
 */

import { onDestroy, untrack } from 'svelte'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState, TExchange } from '@soldy-ui/setup'
import { SvelteProfile } from '../common'
import { joinState, type TJoinedState } from './state'

/** Пропсы, которые компонент не съел; `ref` он берёт из `$props()` сам. */
type TForwardProps<TProps extends object> = Omit<Partial<TProps>, 'children' | 'ctrl' | 'ref'>

/** Приёмник корня — связываемый проп `ref` компонента: `(node) => (ref = node)`. */
export type TRootReceiver = (node: Element | null) => void

/** Сборка без своего корня (`setupControl`): узел отдавать некому. */
const NO_RECEIVER: TRootReceiver = () => {}

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
	TState extends object = TAdapterState<C>,
> = {
	readonly ctrl: C['instance']
	readonly state: TState
	/** Атрибуты корня от потребителя, вместе с его attachment-ами (ключи-символы). */
	readonly forwardProps: TForwardProps<TProps>
	/** Корень, привязанный к `TElementPlugin`; не отрисован — `null`. */
	readonly rootElement: Element | null
	/** Attachment корня: привязка к `TElementPlugin`, затем `ref` компонента. */
	attachElement: (node: Element) => () => void
	/** Только привязка — корню внутри обёртки (`toWrappedRootProps`). */
	bindRef: (node: Element) => () => void
	/** Только `ref` — обёртке корня. */
	consumerRef: (node: Element) => () => void
}

/** Core events from here on: `joinBindings` calls it once every context is accepted. */
type TListen = {
	listen: () => void
}

/** The component's own binding before `joinBindings`: its events have not started yet. */
export type TOwnerBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
	TState extends object = TAdapterState<C>,
> = TBinding<C, TProps, TState> & TListen

/** Связка фасада коллекции: своего `ctrl` и корня у него нет. */
export type TCollectionBinding<TState extends object, TProps extends object = object> = TListen & {
	readonly state: TState
	/** Атрибуты, которые не съели ни компонент, ни фасад. */
	readonly forwardProps: TForwardProps<TProps>
}

/**
 * Own rune of a binding property that a tracking context has read — a raw
 * rune (`$state.raw`). The core hands out values, not handles on live state,
 * and reports a change with a new value (AGENTS.md, «Контракт границы core →
 * ui»). The deep `$state` rune wrapped everything composite in a proxy — the
 * array of a table row's cells, each cell, its `aria` and `dataset` — with a
 * source per key read, and there is no point in watching them: nobody changes
 * them in place. In the table that was a third of a row's memory
 * (benchmarks/table/svelte.md, 869fmcau7).
 *
 * `born` — the binding's version when the rune was made (see `TValues`).
 */
class TRawValue {
	value = $state.raw<unknown>()

	constructor(
		value: unknown,
		readonly born: number,
	) {
		this.value = value
	}
}

/**
 * Binding properties by name, behind the proxy of its state. A property no
 * tracking context has read holds its bare value: a rune per property cost the
 * button 18 runes, and its markup reads about 10 of them (benchmarks/pages/
 * svelte.md, 869fmjpgj). The first tracked read gives the property its rune.
 *
 * A running reaction does not track a rune it made itself in the same run, so
 * that read also reads `version`, made with the binding. The first change of a
 * rune made since the last bump bumps the version: the reactions that made
 * runes since then run again and from then on track the runes themselves. A
 * change of a property nobody has read wakes nobody.
 *
 * A type, not the class: the proxy over it is the state record, and a class
 * type has no index signature.
 */
type TValues = {
	readonly values: Map<string, unknown>
	version: number
}

/** `TValues` with the version in a raw rune. */
class TValueStore implements TValues {
	readonly values = new Map<string, unknown>()
	version = $state.raw(0)
}

/** Whether the property has arrived — as an object property, a symbol never has. */
function has({ values }: TValues, name: string | symbol): name is string {
	return typeof name === 'string' && values.has(name)
}

/** Value of the property; read in a tracking context, a property without a rune gets one. */
function valueOf(target: TValues, name: string | symbol): unknown {
	if (!has(target, name)) return undefined

	const entry = target.values.get(name)

	if (entry instanceof TRawValue) return entry.value

	if ($effect.tracking()) target.values.set(name, new TRawValue(entry, target.version))

	return entry
}

/** New value from the subscription; the caller writes it untracked (see `useExchange`). */
function write(target: TValues, name: string, value: unknown): void {
	const entry = target.values.get(name)

	if (!(entry instanceof TRawValue)) {
		target.values.set(name, value)
	} else if (entry.value !== value) {
		if (entry.born === target.version) target.version++

		entry.value = value
	}
}

/**
 * Binding state — a proxy over its properties, one handler for all bindings.
 * A getter per property — a closure, its scopes and a pair of accessors — cost
 * a table row kilobytes (benchmarks/table/svelte.md).
 */
const STATE: ProxyHandler<TValues> = {
	get: valueOf,
	has,
	ownKeys: ({ values }) => [...values.keys()],
	getOwnPropertyDescriptor: (target, name) =>
		has(target, name)
			? {
					value: valueOf(target, name),
					enumerable: true,
					configurable: true,
					writable: false,
				}
			: undefined,
}

/** What `useOwnerAdapter` and `useCollectionAdapter` share. */
function useExchange(
	adapter: IAdapterContext,
	getProps: () => object,
): { exchange: TExchange; state: Readonly<Record<string, unknown>>; listen: () => void } {
	const exchange = adapter.connect(SvelteProfile)
	const values = new TValueStore()

	// 1. Subscribe right away, not in an effect: there are no effects on the
	// server. The write is untracked: the core changes in the middle of
	// rendering too
	onDestroy(
		exchange.state.subscribe((name, value) => {
			untrack(() => write(values, name, value))
		}),
	)

	// 2. Эффект читает все пропсы, связка пишет только сменившиеся
	$effect(() => {
		exchange.inputs.full(getProps())
	})

	// 3. Events — by `listen`, once the whole assembly is done: by `useAdapter`
	// right away, by `joinBindings` after every context of the component. What
	// the assembly writes is the starting state, as in the other adapters
	// (benchmarks/parity/README.md): the collection facade, accepted after the
	// component, writes into it the months of Calendar's grids and Table's
	// `dataset`. One subscription for the whole life, at initialisation, as
	// the state: in an effect it began after the children, and the markup
	// items that joined the collection while mounting never reached the
	// consumer. The callback is read lazily and called untracked: an event
	// comes in the middle of rendering too — an item joins inside the owner's
	// block, — and a consumer writing its state there would be an unsafe
	// mutation for Svelte. `onDestroy` unsubscribes on the server, where
	// effects do not run
	let stop: (() => void) | undefined

	const listen = (): void => {
		stop = exchange.events.listen((exportName, args) => {
			untrack(() => {
				const callback: unknown = Reflect.get(getProps(), exportName)

				if (typeof callback === 'function') callback(...args)
			})
		})

		onDestroy(stop)
	}

	// 6. One effect that tracks nothing: its teardown unsubscribes, then
	// destroys the adapter
	$effect(() => () => {
		stop?.()
		adapter.destroy()
	})

	// 4. Инициализация компонента — и на сервере тоже — это его монтирование:
	// элемент коллекции входит в неё к серверной разметке, в порядке DOM
	adapter.attach()

	return { exchange, state: new Proxy<TValues>(values, STATE), listen }
}

/**
 * Не съеденное связкой и attachment-ы потребителя: их Svelte передаёт пропами
 * с ключом-символом, и связка их не видит.
 */
function forwardOf<TProps extends object>(exchange: TExchange, props: TProps): Partial<TProps> {
	const forward = exchange.forward(props)

	for (const key of Object.getOwnPropertySymbols(props)) {
		Reflect.set(forward, key, Reflect.get(props, key))
	}

	return forward
}

/**
 * The binding of a component with one context, heard right away. `receive` is
 * the root receiver; an assembly without a root of its own (`setupControl`)
 * has none.
 */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
	receive: TRootReceiver = NO_RECEIVER,
): TBinding<C, TProps> {
	const binding = useOwnerAdapter(adapter, getProps, receive)

	binding.listen()

	return binding
}

/**
 * The own context of a component with collection facades: everything
 * `useAdapter` does but the events — `joinBindings` starts them once the
 * facades are accepted too.
 */
export function useOwnerAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
	receive: TRootReceiver,
): TOwnerBinding<C, TProps> {
	const { exchange, state, listen } = useExchange(adapter, getProps)
	const forwardProps = $derived(forwardOf(exchange, getProps()))

	let rootElement = $state.raw<Element | null>(null)

	// 5. Смена тега пересоздаёт узел: очистка отвязывает прежний
	const bindRef = (node: Element): (() => void) => {
		adapter.bindElement(node)
		rootElement = node

		return () => {
			adapter.bindElement(null)
			rootElement = null
		}
	}

	// Мимо слежения: сеттер `bind:ref={get, set}` — код потребителя, и
	// прочитанное в нём перезапускало бы attachment
	const consumerRef = (node: Element): (() => void) => {
		untrack(() => receive(node))

		return () => untrack(() => receive(null))
	}

	return {
		ctrl: adapter.instance,
		state: toInstanceState<C>(state),
		bindRef,
		consumerRef,
		listen,

		get forwardProps() {
			return forwardProps
		},

		get rootElement() {
			return rootElement
		},

		attachElement(node: Element) {
			const unbind = bindRef(node)
			const release = consumerRef(node)

			return () => {
				unbind()
				release()
			}
		},
	}
}

/**
 * Адаптер фасада коллекции: его состояние и то, что из атрибутов `getForward`
 * он не съел. `ctrl` и корня нет: они компонента, со связкой которого фасад
 * сводит `joinBindings`.
 */
export function useCollectionAdapter<F extends IComponentContract, TProps extends object>(
	facade: IAdapterContext<F>,
	getProps: () => TProps,
	getForward: () => TForwardProps<TProps>,
): TCollectionBinding<TAdapterState<F>, TProps> {
	const { exchange, state, listen } = useExchange(facade, getProps)
	const forwardProps = $derived(forwardOf(exchange, getForward()))

	return {
		state: toInstanceState<F>(state),
		listen,

		get forwardProps() {
			return forwardProps
		},
	}
}

/**
 * The binding of a component with its facades — one, for the markup: the
 * state of all of them as one view, the attributes of the last facade (each
 * takes its own from the rest of the previous one), `ctrl` and the root of the
 * component. Every context is accepted by now, so the events of all of them
 * start here: the consumer hears the component from its full assembly.
 */
export function joinBindings<
	C extends IComponentContract,
	TProps extends object,
	TState extends object,
	TFacade extends object,
>(
	owner: TOwnerBinding<C, TProps, TState>,
	facade: TCollectionBinding<TFacade, TProps>,
): TBinding<C, TProps, TJoinedState<TFacade, TState>>
export function joinBindings<
	C extends IComponentContract,
	TProps extends object,
	TState extends object,
	TFacade extends object,
	TOwnerFacade extends object,
>(
	owner: TOwnerBinding<C, TProps, TState>,
	facade: TCollectionBinding<TFacade, TProps>,
	ownerFacade: TCollectionBinding<TOwnerFacade, TProps>,
): TBinding<C, TProps, TJoinedState<TOwnerFacade, TJoinedState<TFacade, TState>>>
export function joinBindings(
	owner: TOwnerBinding<IComponentContract, object, object>,
	...facades: TCollectionBinding<object, object>[]
): TBinding<IComponentContract, object, object> {
	const last = facades[facades.length - 1] ?? owner

	owner.listen()

	for (const facade of facades) facade.listen()

	return {
		ctrl: owner.ctrl,
		state: facades.reduce((state, facade) => joinState(facade.state, state), owner.state),
		attachElement: owner.attachElement,
		bindRef: owner.bindRef,
		consumerRef: owner.consumerRef,

		get forwardProps() {
			return last.forwardProps
		},

		get rootElement() {
			return owner.rootElement
		},
	}
}
