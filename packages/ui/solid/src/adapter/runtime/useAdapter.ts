/**
 * useAdapter — связка adapter-context с Solid, аналог `useAdapter` у Vue.
 *
 * - состояние — неглубокое, сигнал на прочитанное свойство
 *   (`createShallowState`), его заполняет подписка на связку;
 * - входы — эффект над всеми пропсами, связка пишет сменившиеся;
 * - события — колбэк-пропсы `onXxx`;
 * - тело компонента выполняется один раз, на сервере тоже: это и есть приём
 *   (`attach()`), а очистка — `onCleanup`.
 *
 * `ref` адаптера привязывает корень к `TElementPlugin` и отдаёт тот же узел
 * `ref` потребителя. У коллекции контекстов два: фасад связывает
 * `useCollectionAdapter`, со связкой компонента его сводит `joinBindings`.
 * AGENTS.md (Solid), «Связка».
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
	/** Мемо: атрибуты, которые не съели ни компонент, ни фасад. */
	forwardProps: () => Partial<TProps>
}

/** Связка компонента с фасадом: состояние одним видом, атрибуты — фасада. */
export type TJoinedBinding<
	TOwner extends TCollectionBinding<object, TProps>,
	TFacadeState extends object,
	TProps extends object,
> = Omit<TOwner, 'state' | 'forwardProps'> & {
	readonly state: TJoinedState<TOwner['state'], TFacadeState>
	forwardProps: () => Partial<TProps>
}

/** Общее у компонента и фасада: обмен, состояние, входы, события, приём и очистка. */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: Readonly<Record<string, unknown>> } {
	const binding = adapter.connect(SolidProfile)
	const [state, write] = createShallowState()

	onCleanup(binding.state.subscribe(write))

	createEffect(() => binding.inputs.full(props))

	onCleanup(
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(props, exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// Дети выполняются в порядке документа — элементы входят в коллекцию по DOM
	adapter.attach()

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
 * Адаптер фасада коллекции: свои входы и события фасад берёт из `props`,
 * атрибуты отбирает из `forward` — остатка компонента или предыдущего
 * фасада. `ctrl` и `ref` нет: со связкой компонента фасад сводит `joinBindings`.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	forward: () => Partial<TProps>,
): TCollectionBinding<TAdapterState<C>, TProps> {
	const { binding, state } = useExchange(adapter, props)

	return {
		state: toInstanceState<C>(state),
		forwardProps: createMemo(() => binding.forward(forward())),
	}
}

/**
 * Связка компонента с его фасадами — одна, для разметки: состояние всех одним
 * видом (`joinState`), атрибуты — последнего фасада (каждый отбирает свои из
 * остатка предыдущего), остальное — компонента.
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
): TCollectionBinding<object> {
	const last = facades[facades.length - 1] ?? owner

	return {
		...owner,
		state: facades.reduce((state, facade) => joinState(state, facade.state), owner.state),
		forwardProps: last.forwardProps,
	}
}
