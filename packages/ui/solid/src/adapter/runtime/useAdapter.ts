/**
 * useAdapter — binds an adapter context to Solid, the counterpart of Vue's
 * `useAdapter`.
 *
 * - the state is shallow, a signal per property read
 *   (`createShallowState`), filled by the subscription to the binding;
 * - the inputs — an effect over all props, the binding writes the changed ones;
 * - the events — the `onXxx` callback props, from the full assembly;
 * - the component body runs once, on the server too: that is the acceptance
 *   (`attach()`), and the cleanup is `onCleanup`.
 *
 * The adapter's `ref` binds the root to `TElementPlugin` and hands the same
 * node to the consumer's `ref`. A component with collection facades binds its
 * own context with `useOwnerAdapter` and each facade with
 * `useCollectionAdapter`; `joinBindings` joins them and starts the events of
 * all of them, once every context is accepted. AGENTS.md (Solid), «Связка».
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

/** Core events from here on: `joinBindings` calls it once every context is accepted. */
type TListen = {
	listen: () => void
}

/** The component's own binding before `joinBindings`: its events have not started yet. */
export type TOwnerBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = TBinding<C, TProps> & TListen

/** Связка фасада коллекции: своего `ctrl` и `ref` у него нет. */
export type TCollectionBinding<TState extends object, TProps extends object = object> = TListen & {
	readonly state: TState
	/** Мемо: атрибуты, которые не съели ни компонент, ни фасад. */
	forwardProps: () => Partial<TProps>
}

/** The binding of a component with a facade: the state as one view, the attributes — the facade's. */
export type TJoinedBinding<
	TOwner extends { readonly state: object },
	TFacadeState extends object,
	TProps extends object,
> = Omit<TOwner, 'state' | 'forwardProps' | 'listen'> & {
	readonly state: TJoinedState<TOwner['state'], TFacadeState>
	forwardProps: () => Partial<TProps>
}

/**
 * What the component and a facade share: the exchange, the state, the inputs,
 * the acceptance and the cleanup — and the events, by `listen`.
 */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: Readonly<Record<string, unknown>>; listen: () => void } {
	const binding = adapter.connect(SolidProfile)
	const [state, write] = createShallowState()

	onCleanup(binding.state.subscribe(write))

	createEffect(() => binding.inputs.full(props))

	// Дети выполняются в порядке документа — элементы входят в коллекцию по DOM
	adapter.attach()

	// Очистки Solid зовёт в обратном порядке: фасад уходит раньше компонента
	onCleanup(() => adapter.destroy())

	return {
		binding,
		state,

		// Called once the whole assembly is done: by `useAdapter` right away, by
		// `joinBindings` after every context of the component. What the assembly
		// writes is the starting state, as in the other adapters
		// (benchmarks/parity/README.md): the collection facade, accepted after
		// the component, writes into it the months of Calendar's grids and
		// Table's `dataset`. Still before the children: the markup items joining
		// the collection reach the consumer
		listen() {
			onCleanup(
				binding.events.listen((exportName, args) => {
					const callback: unknown = Reflect.get(props, exportName)

					if (typeof callback === 'function') callback(...args)
				}),
			)
		},
	}
}

/** The binding of a component with one context, heard right away. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const binding = useOwnerAdapter(adapter, props)

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
	props: TProps,
): TOwnerBinding<C, TProps> {
	const { binding, state, listen } = useExchange(adapter, props)
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
		listen,

		ref(el: Element) {
			bindRef(el)
			consumerRef(el)
		},
	}
}

/**
 * Адаптер фасада коллекции: свои входы и события фасад берёт из `props`,
 * атрибуты отбирает из `forward` — остатка компонента или предыдущего
 * фасада. `ctrl` и `ref` нет: со связкой компонента фасад сводит `joinBindings`.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	forward: () => Partial<TProps>,
): TCollectionBinding<TAdapterState<C>, TProps> {
	const { binding, state, listen } = useExchange(adapter, props)

	return {
		state: toInstanceState<C>(state),
		forwardProps: createMemo(() => binding.forward(forward())),
		listen,
	}
}

/**
 * The binding of a component with its facades — one, for the markup: the
 * state of all of them as one view (`joinState`), the attributes of the last
 * facade (each takes its own from the rest of the previous one), the rest —
 * the component's. Every context is accepted by now, so the events of all of
 * them start here: the consumer hears the component from its full assembly.
 */
export function joinBindings<
	TProps extends object,
	TOwner extends TCollectionBinding<object, TProps>,
	TFacade extends object,
>(
	owner: TOwner,
	facade: TCollectionBinding<TFacade, TProps>,
): TJoinedBinding<TOwner, TFacade, TProps>
export function joinBindings<
	TProps extends object,
	TOwner extends TCollectionBinding<object, TProps>,
	TFacade extends object,
	TOwnerFacade extends object,
>(
	owner: TOwner,
	facade: TCollectionBinding<TFacade, TProps>,
	ownerFacade: TCollectionBinding<TOwnerFacade, TProps>,
): TJoinedBinding<TJoinedBinding<TOwner, TFacade, TProps>, TOwnerFacade, TProps>
export function joinBindings(
	owner: TCollectionBinding<object>,
	...facades: TCollectionBinding<object>[]
): Omit<TCollectionBinding<object>, 'listen'> {
	const { listen, ...rest } = owner
	const last = facades[facades.length - 1] ?? owner

	listen()

	for (const facade of facades) facade.listen()

	return {
		...rest,
		state: facades.reduce((state, facade) => joinState(state, facade.state), owner.state),
		forwardProps: last.forwardProps,
	}
}
