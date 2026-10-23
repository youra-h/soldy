/**
 * useAdapter — связка adapter-context со Svelte, аналог `useAdapter` у Vue.
 *
 * 1. Core → Svelte: подписка на состояние связки, значения — в руну `$state`
 * 2. Svelte → Core: входные пропсы в эффекте
 * 3. События — в колбэк-пропы `onXxx`
 * 4. Компонент принят — `adapter.attach()` при инициализации
 * 5. Корень — attachment-ом: к `TElementPlugin`, в `ref` компонента и в руну
 *    `rootElement`
 * 6. Очистка при уничтожении
 *
 * Фасад коллекции добавляет к связке компонента `useCollectionAdapter`.
 * AGENTS.md (Svelte), «Связка».
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

/** Общая часть `useAdapter` и `useCollectionAdapter`. */
function useExchange(
	adapter: IAdapterContext,
	getProps: () => object,
): { exchange: TExchange; state: Record<string, unknown> } {
	const exchange = adapter.connect(SvelteProfile)
	const values: Record<string, unknown> = {}
	let target = values

	// 1. Подписка — сразу, а не в эффекте: эффекта нет на сервере. Первые
	// значения ложатся в обычный объект, руна заводится над полным составом.
	// Запись — мимо слежения: ядро меняется и посреди отрисовки
	onDestroy(
		exchange.state.subscribe((name, value) => {
			untrack(() => {
				target[name] = value
			})
		}),
	)

	const state = $state(values)

	target = state

	// 2. Эффект читает все пропсы, связка пишет только сменившиеся
	$effect(() => {
		exchange.inputs.full(getProps())
	})

	// 3. Подписка одна на всё время жизни, колбэк читается лениво
	$effect(() =>
		exchange.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(getProps(), exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Инициализация компонента — и на сервере тоже — это его монтирование:
	// элемент коллекции входит в неё к серверной разметке, в порядке DOM
	adapter.attach()

	// 6.
	$effect(() => () => adapter.destroy())

	return { exchange, state }
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

/** `receive` — приёмник корня; у сборки без своего корня (`setupControl`) его нет. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
	receive: TRootReceiver = NO_RECEIVER,
): TBinding<C, TProps> {
	const { exchange, state } = useExchange(adapter, getProps)
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
 * Связка компонента с фасадом коллекции: состояние фасада под состоянием
 * компонента, на корень — то, что не съели ни компонент, ни фасад. `ctrl` и
 * корень — компонента: своего узла у фасада нет. Два фасада (подменю) —
 * цепочкой, ближний к компоненту внутри.
 */
export function useCollectionAdapter<
	C extends IComponentContract,
	F extends IComponentContract,
	TProps extends object,
	TState extends object,
>(
	facade: IAdapterContext<F>,
	getProps: () => TProps,
	owner: TBinding<C, TProps, TState>,
): TBinding<C, TProps, TJoinedState<TAdapterState<F>, TState>> {
	const { exchange, state } = useExchange(facade, getProps)
	const forwardProps = $derived(forwardOf(exchange, owner.forwardProps))

	return {
		ctrl: owner.ctrl,
		state: joinState(toInstanceState<F>(state), owner.state),
		attachElement: owner.attachElement,
		bindRef: owner.bindRef,
		consumerRef: owner.consumerRef,

		get forwardProps() {
			return forwardProps
		},

		get rootElement() {
			return owner.rootElement
		},
	}
}
