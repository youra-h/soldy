/**
 * useAdapter — связка adapter-context со Svelte, аналог `useAdapter` у Vue.
 *
 * 1. Core → Svelte: подписка на состояние связки, значения — в сырые руны
 * 2. Svelte → Core: входные пропсы в эффекте
 * 3. События — в колбэк-пропы `onXxx`
 * 4. Компонент принят — `adapter.attach()` при инициализации
 * 5. Корень — attachment-ом: к `TElementPlugin`, в `ref` компонента и в руну
 *    `rootElement`
 * 6. Очистка при уничтожении
 *
 * Фасад коллекции связывает `useCollectionAdapter`, со связкой компонента его
 * сводит `joinBindings`.
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

/** Связка фасада коллекции: своего `ctrl` и корня у него нет. */
export type TCollectionBinding<TState extends object, TProps extends object = object> = {
	readonly state: TState
	/** Атрибуты, которые не съели ни компонент, ни фасад. */
	readonly forwardProps: TForwardProps<TProps>
}

/**
 * Значение свойства связки — сырая руна (`$state.raw`). Ядро отдаёт значения, а
 * не ручки на живое состояние, и о смене сообщает новым значением (AGENTS.md,
 * «Контракт границы core → ui»). Глубокая руна `$state` оборачивала в прокси
 * всё составное — массив ячеек строки таблицы, каждую ячейку, её `aria` и
 * `dataset`, — с источником на каждый прочитанный ключ, и следить за ними
 * незачем: на месте их никто не меняет. В таблице это была треть памяти строки
 * (benchmarks/table/svelte.md, 869fmcau7)
 */
class TRawValue {
	value = $state.raw<unknown>()

	constructor(value: unknown) {
		this.value = value
	}
}

/** Руны свойств связки по именам — за прокси её состояния. */
type TRawValues = {
	readonly values: Map<string, TRawValue>
}

/** Руна свойства — как свойство объекта: у символа и незаведённого имени её нет. */
function valueOf({ values }: TRawValues, name: string | symbol): TRawValue | undefined {
	return typeof name === 'string' ? values.get(name) : undefined
}

/**
 * Состояние связки — прокси над рунами её свойств, обработчик один на все
 * связки. Геттер на каждое свойство — замыкание, его области и пара
 * аксессоров — у строки таблицы стоил килобайты (benchmarks/table/svelte.md).
 * Руна заводится подпиской, а не первым чтением: руна, заведённая в
 * исполняемом эффекте, в нём же не отслеживается.
 */
const STATE: ProxyHandler<TRawValues> = {
	get: (target, name) => valueOf(target, name)?.value,
	has: (target, name) => valueOf(target, name) !== undefined,
	ownKeys: ({ values }) => [...values.keys()],
	getOwnPropertyDescriptor(target, name) {
		const known = valueOf(target, name)

		return (
			known && { value: known.value, enumerable: true, configurable: true, writable: false }
		)
	},
}

/** Общая часть `useAdapter` и `useCollectionAdapter`. */
function useExchange(
	adapter: IAdapterContext,
	getProps: () => object,
): { exchange: TExchange; state: Readonly<Record<string, unknown>> } {
	const exchange = adapter.connect(SvelteProfile)
	const values = new Map<string, TRawValue>()

	// 1. Подписка — сразу, а не в эффекте: эффекта нет на сервере. Первое
	// значение свойства заводит его руну. Запись — мимо слежения: ядро
	// меняется и посреди отрисовки
	onDestroy(
		exchange.state.subscribe((name, value) => {
			untrack(() => {
				const known = values.get(name)

				if (known) known.value = value
				else values.set(name, new TRawValue(value))
			})
		}),
	)

	// 2. Эффект читает все пропсы, связка пишет только сменившиеся
	$effect(() => {
		exchange.inputs.full(getProps())
	})

	// 3. and 6. One subscription for the whole life, the callback is read
	// lazily; one effect that tracks nothing: its teardown unsubscribes, then
	// destroys the adapter — the order two effects had, at the cost of one
	$effect(() => {
		const stop = exchange.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(getProps(), exportName)

			if (typeof callback === 'function') callback(...args)
		})

		return () => {
			stop()
			adapter.destroy()
		}
	})

	// 4. Инициализация компонента — и на сервере тоже — это его монтирование:
	// элемент коллекции входит в неё к серверной разметке, в порядке DOM
	adapter.attach()

	return { exchange, state: new Proxy<TRawValues>({ values }, STATE) }
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
 * Адаптер фасада коллекции: его состояние и то, что из атрибутов `getForward`
 * он не съел. `ctrl` и корня нет: они компонента, со связкой которого фасад
 * сводит `joinBindings`.
 */
export function useCollectionAdapter<F extends IComponentContract, TProps extends object>(
	facade: IAdapterContext<F>,
	getProps: () => TProps,
	getForward: () => TForwardProps<TProps>,
): TCollectionBinding<TAdapterState<F>, TProps> {
	const { exchange, state } = useExchange(facade, getProps)
	const forwardProps = $derived(forwardOf(exchange, getForward()))

	return {
		state: toInstanceState<F>(state),

		get forwardProps() {
			return forwardProps
		},
	}
}

/**
 * Связка компонента с его фасадами — одна, для разметки: состояние всех одним
 * видом, атрибуты — последнего фасада (каждый отбирает свои из остатка
 * предыдущего), `ctrl` и корень — компонента.
 */
export function joinBindings<
	C extends IComponentContract,
	TProps extends object,
	TState extends object,
	TFacade extends object,
>(
	owner: TBinding<C, TProps, TState>,
	facade: TCollectionBinding<TFacade, TProps>,
): TBinding<C, TProps, TJoinedState<TFacade, TState>>
export function joinBindings<
	C extends IComponentContract,
	TProps extends object,
	TState extends object,
	TFacade extends object,
	TOwnerFacade extends object,
>(
	owner: TBinding<C, TProps, TState>,
	facade: TCollectionBinding<TFacade, TProps>,
	ownerFacade: TCollectionBinding<TOwnerFacade, TProps>,
): TBinding<C, TProps, TJoinedState<TOwnerFacade, TJoinedState<TFacade, TState>>>
export function joinBindings(
	owner: TBinding<IComponentContract, object, object>,
	...facades: TCollectionBinding<object, object>[]
): TBinding<IComponentContract, object, object> {
	const last = facades[facades.length - 1] ?? owner

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
