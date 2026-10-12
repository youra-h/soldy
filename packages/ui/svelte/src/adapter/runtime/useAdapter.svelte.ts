/**
 * useAdapter — единственный Svelte-хук на весь проект (аналог useAdapter
 * из Vue/React-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его со Svelte через обмен `adapter.connect()`
 * из setup. Своё здесь — только куда писать значение (руна `$state`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Svelte это делать:
 *
 * 1. Core → Svelte: подписка на состояние связки
 * 2. Svelte → Core: входные пропсы в эффекте
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. Компонент принят — adapter.attach()
 * 5. DOM-биндинг через attachment (аналог callback-ref в React)
 * 6. Очистка при уничтожении компонента
 *
 * Фасад коллекции связывает `useCollectionAdapter` — те же шаги, кроме
 * привязки узла: она принадлежит компоненту.
 *
 * Принимает геттер props: в Svelte 5 деструктуризация рвёт реактивность,
 * поэтому наружу передаётся сам объект `$props()`, а читается он лениво.
 *
 * Файл `.svelte.ts` — иначе руны `$effect` / `$derived` недоступны.
 */

import { onDestroy } from 'svelte'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState, TExchange } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { SvelteProfile } from '../common'

/** Пропсы, которые компонент не съел. `children` и `ctrl` он съедает всегда. */
type TForwardProps<TProps extends object> = Omit<Partial<TProps>, 'children' | 'ctrl'>

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	readonly state: TAdapterState<C>
	/**
	 * Атрибуты корня от потребителя: пропсы, которые не съела связка, и
	 * attachment-ы потребителя — пропсы с ключом-символом.
	 */
	readonly forwardProps: TForwardProps<TProps>
	/** Svelte-attachment: `<div {@attach binding.attachElement}>` */
	attachElement: (node: Element) => (() => void) | void
}

/**
 * То же, что `TBinding`, но без `ctrl` и привязки узла: они принадлежат
 * компоненту, а не фасаду его коллекции (см. `useCollectionAdapter`).
 */
export type TCollectionBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly plugins: IPluginBundle | null
	/** Свойства фасада и выходы плагинов его дескриптора — как у `TBinding`. */
	readonly state: TAdapterState<C>
	/** Атрибуты, которые не съели ни компонент, ни фасад, и attachment-ы потребителя. */
	readonly forwardProps: TForwardProps<TProps>
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: связка контекста,
 * состояние, входы, события, приём и уничтожение. Отдаёт то, из чего каждый
 * хук собирает свой результат.
 */
function useExchange(
	adapter: IAdapterContext,
	getProps: () => object,
): { binding: TExchange; state: Record<string, unknown> } {
	const binding = adapter.connect(SvelteProfile)
	const values: Record<string, unknown> = {}
	let target = values

	// 1. Core → Svelte: подписка сразу, при инициализации компонента, а не в
	// эффекте — иначе изменение ядра до эффекта не дошло бы. Она же отдаёт
	// значение каждого свойства тем же вызовом, что и триггер: так состояние и
	// заполняется. onDestroy, а не cleanup эффекта: эффект на сервере не
	// выполняется, а отписаться нужно и там.
	//
	// Значения, которые подписка отдаёт сразу, ложатся в обычный объект, и руна
	// заводится над ним уже с полным составом; дальше подписка пишет в руну.
	// Свойство, которого у руны ещё нет, Svelte считает ростом её состава, а в
	// разработке с шестой такой записи за такт снимает на каждую стек вызовов:
	// у элемента коллекции с двумя контекстами по десяткам свойств на это
	// уходила большая часть монтирования
	onDestroy(
		binding.state.subscribe((name, value) => {
			target[name] = value
		}),
	)

	const state = $state(values)

	target = state

	// 2. Svelte → Core: эффект читает все props и перезапускается при смене любого,
	// а связка пишет из них только сменившиеся с прошлого раза
	$effect(() => {
		binding.inputs.full(getProps())
	})

	// 3. События: подписка одна на всё время жизни, props читаются лениво в колбэке.
	$effect(() =>
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(getProps(), exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Компонент принят: инициализация компонента Svelte выполняется один
	// раз, и на сервере тоже, — это и есть его монтирование. Не в эффекте:
	// эффект на сервере не выполняется, а элемент коллекции обязан войти в неё
	// к серверной разметке. Дети инициализируются в порядке документа, и
	// элементы разметки входят в коллекцию в порядке DOM
	adapter.attach()

	// 6. Очистка контекста
	$effect(() => () => adapter.destroy())

	return { binding, state }
}

/**
 * Атрибуты от потребителя: то, что из `props` не съела связка, и все
 * attachment-ы потребителя. Связка отдаёт пропсы по строковым ключам, а
 * attachment потребителя (`<Button {@attach tooltip}>`) Svelte передаёт
 * пропом с ключом-символом — его связка не видит. Поэтому собственные
 * символьные ключи добавляются здесь, все: attachment среди них при спреде на
 * корень отбирает сам Svelte. С привязкой корня адаптера ключ не совпадёт —
 * её attachment `Dynamic` ставит под своим ключом.
 */
function forwardOf<TProps extends object>(binding: TExchange, props: TProps): Partial<TProps> {
	const forward = binding.forward(props)

	for (const key of Object.getOwnPropertySymbols(props)) {
		Reflect.set(forward, key, Reflect.get(props, key))
	}

	return forward
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
): TBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, getProps)
	const forwardProps = $derived(forwardOf(binding, getProps()))

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),

		get forwardProps() {
			return forwardProps
		},

		// 5. DOM-биндинг: контекст сам знает, есть ли у набора TElementPlugin
		attachElement(node: Element) {
			adapter.bindElement(node)

			return () => adapter.bindElement(null)
		},
	}
}

/**
 * Адаптер фасада коллекции — всё то же, кроме того, что принадлежит компоненту.
 *
 * У коллекционного компонента контекстов два: свой и фасада. Состояние, входы,
 * события, приём и уничтожение у фасада те же, что у компонента, а `ctrl` и
 * привязки узла — нет:
 *
 * - `ctrl` у фасада это `T*CollectionFacade`, тогда как снаружи под этим именем
 *   ждут сам компонент;
 * - своего узла у фасада нет: он делит набор компонента, и корень к
 *   `TElementPlugin` привязывает `useAdapter` компонента.
 *
 * `getProps` — все пропсы компонента: фасад берёт из них свои входы и колбэки
 * своих событий. `getForward` — то, что не съел компонент (`forwardProps` его
 * `useAdapter`): фасад отбирает из них свои имена, и на корень уходит только
 * то, что не съели ни компонент, ни фасад.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
	getForward: () => TForwardProps<TProps>,
): TCollectionBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, getProps)
	const forwardProps = $derived(forwardOf(binding, getForward()))

	return {
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),

		get forwardProps() {
			return forwardProps
		},
	}
}
