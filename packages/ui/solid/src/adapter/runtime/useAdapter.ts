/**
 * useAdapter — связка adapter-context с Solid, аналог `useAdapter` у Vue.
 *
 * - состояние — стор, его заполняет подписка на связку;
 * - входы — эффект над всеми пропсами, связка пишет сменившиеся;
 * - события — колбэк-пропсы `onXxx`;
 * - тело компонента выполняется один раз, на сервере тоже: это и есть приём
 *   (`attach()`), а очистка — `onCleanup`.
 *
 * `ref` адаптера привязывает корень к `TElementPlugin` и отдаёт тот же узел
 * `ref` потребителя. У коллекции контекстов два: фасад связывает
 * `useCollectionAdapter` поверх связки компонента. AGENTS.md (Solid), «Связка».
 */

import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from 'solid-js'
import { createStore } from 'solid-js/store'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState, TExchange } from '@soldy-ui/setup'
import { SolidProfile } from '../common'
import { joinState, type TJoinedState } from './state'

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

/** Что фасад берёт у связки компонента: её состояние и несъеденные атрибуты. */
type TOwnerBinding<TProps extends object> = {
	readonly state: object
	forwardProps: () => Partial<TProps>
}

/** Связка компонента с фасадом: состояние одним видом, атрибуты — что не съели оба. */
export type TJoinedBinding<
	TOwner extends TOwnerBinding<TProps>,
	C extends IComponentContract,
	TProps extends object,
> = Omit<TOwner, 'state' | 'forwardProps'> & {
	readonly state: TJoinedState<TOwner['state'], TAdapterState<C>>
	forwardProps: () => Partial<TProps>
}

/** Общее у компонента и фасада: обмен, стор, входы, события, приём и очистка. */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: Readonly<Record<string, unknown>> } {
	const binding = adapter.connect(SolidProfile)
	const [state, setState] = createStore<Record<string, unknown>>({})

	// Merge-форма: путевая `setState(key, value)` сочла бы значение-функцию updater'ом
	onCleanup(binding.state.subscribe((name, value) => setState({ [name]: value })))

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

	// Отвязка — очисткой владельца узла: смена тега (`Dynamic`) отвязывает прежний
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
 * Фасад коллекции поверх связки компонента `owner`: свои входы и события
 * фасад берёт из `props`, атрибуты отбирает из несъеденных компонентом. Узла
 * у фасада нет, `ctrl` и `ref` остаются компонента. Третий контекст
 * (`Menu.Submenu`) — тот же вызов поверх результата.
 */
export function useCollectionAdapter<
	C extends IComponentContract,
	TProps extends object,
	TOwner extends TOwnerBinding<TProps>,
>(adapter: IAdapterContext<C>, props: TProps, owner: TOwner): TJoinedBinding<TOwner, C, TProps> {
	const { binding, state } = useExchange(adapter, props)

	return {
		...owner,
		state: joinState(owner.state, toInstanceState<C>(state)),
		forwardProps: createMemo(() => binding.forward(owner.forwardProps())),
	}
}
