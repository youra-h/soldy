/**
 * useAdapter — binds an adapter context to Solid, the counterpart of Vue's
 * `useAdapter`.
 *
 * - the state is shallow, a signal per property read
 *   (`createShallowState`), filled by the subscription to the binding;
 * - the inputs — an effect over all props, the binding writes the changed ones;
 * - the component body runs once, on the server too: that is the acceptance
 *   (`attach()`), and the cleanup is `onCleanup`;
 * - the events — the `onXxx` callback props, after the acceptance.
 *
 * The adapter's `ref` binds the root to `TElementPlugin` and hands the same
 * node to the consumer's `ref`. A collection has two contexts: the facade is
 * bound by `useCollectionAdapter` — before the component, — and `joinBindings`
 * joins it with the component's binding. AGENTS.md (Solid), «Связка».
 */

import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from 'solid-js'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState, TExchange } from '@soldy-ui/setup'
import { SolidProfile } from '../common'
import { createShallowState, joinState, type TJoinedState } from './state'

/**
 * `ref` потребителя — корень компонента: функция или переменная, которую
 * компилятор Solid превращает в функцию. Узел — `Element`: корнем бывает `<svg>`.
 */
export type TConsumerRef = Element | ((element: Element) => void)

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly state: TAdapterState<C>
	/** Мемо: атрибуты, не съеденные связкой. */
	forwardProps: () => Partial<TProps>
	/** Привязанный корень; не отрисован или снят — `null`. Якорь панели (`anchor_anchor`). */
	rootElement: Accessor<Element | null>
	/** callback-ref корня: привязка к `TElementPlugin`, затем `ref` потребителя. */
	ref: (el: Element) => void
	/** Только привязка — корню внутри обёртки (окно таблицы). */
	bindRef: (el: Element) => void
	/** Только `ref` потребителя — обёртке корня. */
	consumerRef: (el: Element) => void
}

/** Связка фасада коллекции: своего `ctrl` и `ref` у него нет. */
export type TCollectionBinding<TState extends object, TProps extends object = object> = {
	readonly state: TState
	/** What the facade leaves of the given attributes: `joinBindings` hands it the component's rest. */
	forward: (props: Partial<TProps>) => Partial<TProps>
}

/** What `joinBindings` takes of a binding it joins the facades with. */
type TJoinable<TProps extends object> = {
	readonly state: object
	forwardProps: () => Partial<TProps>
}

/** Связка компонента с фасадом: состояние одним видом, атрибуты — фасада. */
export type TJoinedBinding<
	TOwner extends TJoinable<TProps>,
	TFacadeState extends object,
	TProps extends object,
> = Omit<TOwner, 'state' | 'forwardProps'> & {
	readonly state: TJoinedState<TOwner['state'], TFacadeState>
	forwardProps: () => Partial<TProps>
}

/** What the component and a facade share: the exchange, the state, the inputs, the acceptance, the events and the cleanup. */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: Readonly<Record<string, unknown>> } {
	const binding = adapter.connect(SolidProfile)
	const [state, write, updates] = createShallowState()

	onCleanup(binding.updates.listen(updates))
	onCleanup(binding.state.subscribe(write))

	createEffect(() => binding.inputs.full(props))

	// Children run in document order, so items join the collection in DOM order
	adapter.attach()

	// Events after the acceptance: what it writes is the starting state, as in
	// the other adapters (benchmarks/parity/README.md). A component with
	// collection facades binds them first: the facade, accepted, writes into
	// the component — the months of Calendar's grids, Table's `dataset`
	onCleanup(
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(props, exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// Очистки Solid зовёт в обратном порядке: фасад уходит раньше компонента
	onCleanup(() => adapter.destroy())

	return { binding, state }
}

export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)
	const forwardProps = createMemo(() => binding.forward(props))
	const [rootElement, setRootElement] = createSignal<Element | null>(null)

	// Отвязка — очисткой владельца узла: смена тега (`Root`) отвязывает прежний
	const bindRef = (el: Element): void => {
		adapter.bindElement(el)
		setRootElement(el)

		onCleanup(() => {
			adapter.bindElement(null)
			setRootElement(null)
		})
	}

	const consumerRef = (el: Element): void => {
		const consumer: unknown = Reflect.get(props, 'ref')

		if (typeof consumer === 'function') consumer(el)
	}

	return {
		ctrl: adapter.instance,
		state: toInstanceState<C>(state),
		forwardProps,
		rootElement,
		bindRef,
		consumerRef,

		ref(el: Element) {
			bindRef(el)
			consumerRef(el)
		},
	}
}

/**
 * The adapter of a collection facade: the facade takes its inputs and events
 * from `props` and leaves the attributes that are not its own (`forward`).
 * No `ctrl` and no `ref`: `joinBindings` joins the facade with the
 * component's binding. Bound before the component: the facade, accepted,
 * writes into it, and that is its starting state.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TCollectionBinding<TAdapterState<C>, TProps> {
	const { binding, state } = useExchange(adapter, props)

	return {
		state: toInstanceState<C>(state),
		forward: (rest) => binding.forward(rest),
	}
}

/**
 * The binding of a component with its facades — one, for the markup: the
 * state of all of them as one view (`joinState`), the attributes of the last
 * facade (each takes its own from the rest of the previous one, the first —
 * from the component's), the rest — the component's.
 */
export function joinBindings<
	TProps extends object,
	TOwner extends TJoinable<TProps>,
	TFacade extends object,
>(
	owner: TOwner,
	facade: TCollectionBinding<TFacade, TProps>,
): TJoinedBinding<TOwner, TFacade, TProps>
export function joinBindings<
	TProps extends object,
	TOwner extends TJoinable<TProps>,
	TFacade extends object,
	TOwnerFacade extends object,
>(
	owner: TOwner,
	facade: TCollectionBinding<TFacade, TProps>,
	ownerFacade: TCollectionBinding<TOwnerFacade, TProps>,
): TJoinedBinding<TJoinedBinding<TOwner, TFacade, TProps>, TOwnerFacade, TProps>
export function joinBindings(
	owner: TJoinable<object>,
	...facades: TCollectionBinding<object>[]
): TJoinable<object> {
	return {
		...owner,
		state: facades.reduce((state, facade) => joinState(state, facade.state), owner.state),
		forwardProps: createMemo(() =>
			facades.reduce((rest, facade) => facade.forward(rest), owner.forwardProps()),
		),
	}
}
