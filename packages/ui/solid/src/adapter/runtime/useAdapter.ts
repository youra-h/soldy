/**
 * useAdapter — единственный Solid-хук на весь проект (аналог useAdapter
 * из Vue/React/Svelte-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его с Solid через обмен `adapter.connect()`
 * из setup. Своё здесь — только куда писать значение (`createStore`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Solid это делать:
 *
 * 1. Core → Solid: подписка на состояние связки
 * 2. Solid → Core: входные пропсы в эффекте
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. Компонент принят — adapter.attach()
 * 5. DOM-биндинг через callback-ref, и тот же узел — `ref` потребителя и
 *    аксессор привязанного корня (`rootElement`)
 * 6. Очистка при уничтожении компонента (onCleanup)
 *
 * Фасад коллекции связывает `useCollectionAdapter` — те же шаги, кроме
 * привязки узла: она принадлежит компоненту.
 *
 * Привязанный корень разметка читает аксессором `rootElement`, как
 * `rootElement` у Vue: так Popover и Tooltip отдают свой корень якорем панели
 * (`anchor_anchor`). У связки Solid узел приходит только callback-ref, а
 * сигнала компонент не заводит, поэтому сигнал — здесь: узел ему пишет
 * привязка (`bindRef`), её очистка ставит `null`, а смена тега (`Dynamic`) —
 * новый узел. На сервере узлов нет, и корень там `null`.
 *
 * Props передаются как есть: в Solid это объект геттеров, деструктурировать
 * его нельзя, но читать напрямую — можно и нужно.
 *
 * `ref` потребителя (`<Button ref={button}>`) получает корень компонента —
 * узел, на который ложатся его класс и атрибуты. У поля (Input, CheckBox,
 * Switch) — тоже корень, а не `<input>`: от корня до поля потребитель дойдёт
 * `querySelector`, а от поля до корня — только по родителям, и этот путь
 * ломается при каждой правке разметки. Отдаёт его callback-ref корня — тем же
 * вызовом, после привязки к `TElementPlugin`: у узла `ref` один, и ставит его
 * адаптер. Компоненту Solid отдаёт `ref` функцией — `ref={button}` тоже:
 * функция присвоит узел переменной. Узлом он бывает только мимо компилятора
 * Solid, и присвоить такой некуда. Снятие узла Solid своим `ref` не
 * объявляет, и `ref` потребителя тоже: на `onCleanup` — только отвязка корня.
 *
 * Корень внутри обёртки (окно таблицы вокруг `table`, `createWrappedRootProps`)
 * получает эти две половины `ref` по отдельности: корню — только привязку
 * (`bindRef`), обёртке — только `ref` потребителя (`consumerRef`): внешний
 * узел — тот, на который легли его класс и атрибуты.
 */

import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from 'solid-js'
import { createStore } from 'solid-js/store'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState, TExchange } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { SolidProfile } from '../common'

/**
 * `ref` потребителя — корень компонента. Функция, которой Solid отдаёт узел,
 * или переменная: `ref={button}` компилятор Solid превращает в функцию,
 * которая присвоит ей узел. Узел — `Element`, а не `HTMLElement`: `tag`
 * свободен, и корнем бывает `<svg>` (иконка по роли).
 */
export type TConsumerRef = Element | ((element: Element) => void)

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	readonly state: TAdapterState<C>
	/** Мемо: DOM-атрибуты, не съеденные компонентом */
	forwardProps: () => Partial<TProps>
	/**
	 * Привязанный корень — узел, который получил `bindRef`; не отрисован или
	 * снят — `null`. Сменился тег — новый узел. Аналог `rootElement` у Vue:
	 * якорь панели у Popover и Tooltip (`anchor_anchor`).
	 */
	rootElement: Accessor<Element | null>
	/** callback-ref корня: привязка к `TElementPlugin`, затем тот же узел — `ref` потребителя */
	ref: (el: Element) => void
	/**
	 * callback-ref корня внутри обёртки (`createWrappedRootProps`) — только
	 * привязка к `TElementPlugin`: `ref` потребителя получает обёртка.
	 */
	bindRef: (el: Element) => void
	/**
	 * callback-ref обёртки корня — только `ref` потребителя: узел, на который
	 * легли его класс и атрибуты. К `TElementPlugin` привязан корень внутри
	 * неё (`bindRef`).
	 */
	consumerRef: (el: Element) => void
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
	/** Мемо: атрибуты, которые не съели ни компонент, ни фасад */
	forwardProps: () => Partial<TProps>
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: связка контекста,
 * состояние, входы, события, приём и уничтожение. Отдаёт то, из чего каждый
 * хук собирает свой результат.
 */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: Readonly<Record<string, unknown>> } {
	const binding = adapter.connect(SolidProfile)
	const [state, setState] = createStore<Record<string, unknown>>({})

	// 1. Core → Solid: подписка на всё время жизни, отписка на onCleanup.
	// Подписка сразу отдаёт значение каждого свойства — тем же вызовом, что и
	// триггер: так стор и заполняется. Merge-форма, а не setState(key, value):
	// при значении-функции путевая форма трактовала бы его как updater.
	onCleanup(binding.state.subscribe((name, value) => setState({ [name]: value })))

	// 2. Solid → Core: эффект читает все props и перезапускается при смене любого,
	// а связка пишет из них только сменившиеся с прошлого раза
	createEffect(() => binding.inputs.full(props))

	// 3. События
	onCleanup(
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(props, exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Компонент принят: тело компонента Solid выполняется один раз, и на
	// сервере тоже, — это и есть его монтирование. Дети выполняются в порядке
	// документа, и элементы разметки входят в коллекцию в порядке DOM
	adapter.attach()

	// 6. Очистка контекста. Очистки Solid зовёт в обратном порядке: фасад,
	// собранный после компонента, уходит раньше него
	onCleanup(() => adapter.destroy())

	return { binding, state }
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)
	const forwardProps = createMemo(() => binding.forward(props))
	const [rootElement, setRootElement] = createSignal<Element | null>(null)

	// 5. DOM-биндинг: контекст сам знает, есть ли у набора `TElementPlugin`.
	// Отвязка — очисткой того владельца, под которым Solid создал узел: смена
	// тега (`Dynamic`) отвязывает прежний и привязывает новый. Тот же узел —
	// привязанный корень разметке: очистка прежнего ставит `null` раньше, чем
	// придёт новый
	const bindRef = (el: Element): void => {
		adapter.bindElement(el)
		setRootElement(el)

		onCleanup(() => {
			adapter.bindElement(null)
			setRootElement(null)
		})
	}

	// `ref` потребителя: Solid читает `ref` один раз, когда создаёт узел, — и
	// потребителю его отдаёт тот же вызов
	const consumerRef = (el: Element): void => {
		const consumer: unknown = Reflect.get(props, 'ref')

		if (typeof consumer === 'function') consumer(el)
	}

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),
		forwardProps,
		rootElement,
		bindRef,
		consumerRef,

		// Корень и есть внешний узел: привязка, затем тот же узел — `ref` потребителя
		ref(el: Element) {
			bindRef(el)
			consumerRef(el)
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
 * `props` — все пропсы компонента: фасад берёт из них свои входы и колбэки
 * своих событий. `forward` — то, что не съел компонент (`forwardProps` его
 * `useAdapter`): фасад отбирает из них свои имена, и на корень уходит только
 * то, что не съели ни компонент, ни фасад.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	forward: () => Partial<TProps>,
): TCollectionBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)
	const forwardProps = createMemo(() => binding.forward(forward()))

	return {
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),
		forwardProps,
	}
}
