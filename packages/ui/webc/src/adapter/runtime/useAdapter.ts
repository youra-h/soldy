/**
 * useAdapter — runtime-слой Web Components (аналог useAdapter из остальных пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context и хост-элемент, возвращает TBinding:
 *
 * - state: текущие значения props из Core (обычный объект) — свойства инстанса
 *   и выходы плагинов его дескриптора, в типе тоже (`TBindingState`)
 * - компонент принят (`adapter.attach()`) сразу при создании связки
 * - syncProps(props): элемент → Core, только переданные ключи
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): снятие подписок + adapter.destroy()
 *
 * Общее с остальными адаптерами — в обмене `adapter.connect()` из setup. Своё
 * здесь: реактивности у платформы нет, поэтому состояние — обычный объект, об
 * изменении сообщает колбэк onUpdate (перерисовку планирует базовый класс
 * элемента), а события уходят `CustomEvent` на элементе. Всплывают они, только
 * если элемент написал потребитель — разметкой или кодом. Элемент, который
 * построил шаблон библиотеки, — деталь (`createDetail`) или элемент из данных
 * (`createItem`), — разметка владельца (`owner-markup.ts`), и его события
 * слышно только на нём самом. `embedded` на всплытие не влияет: это признак
 * для реестра плагинов, и у элемента из данных его нет.
 *
 * Событие «до» — его аргумент `TActionEvent` (`so:show:before`,
 * `so:hide:before`) — уходит отменяемым, как событие DOM:
 * `event.preventDefault()` отменяет и событие ядра (`dispatch`). `detail` —
 * то же событие ядра, и `detail.preventDefault()` отменяет, как прежде.
 *
 * У коллекционного компонента контекстов два — свой и фасада коллекции, — и
 * фасад связывает `useCollectionAdapter`: всё то же, кроме `ctrl` и привязки
 * узла, они принадлежат компоненту. Базе элемента (`SoldyElement`) нужна одна
 * связка, поэтому две сводит `joinBindings`, как у Angular: состояние — одним
 * живым видом, входы и события — обоих, узел — только свой.
 */

import { TActionEvent } from '@soldy-ui/core'
import { toInstanceState } from '@soldy-ui/setup'
import type {
	IAdapterContext,
	IComponentContract,
	TAdapterState,
	TInstanceState,
} from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { WebcProfile } from '../common'
import { isOwnerMarkup } from './owner-markup'

/**
 * Состояние компонента, как его читают база и шаблон: свойства инстанса, выходы
 * плагинов его дескриптора и, у коллекционного компонента, свойства фасада.
 * Одноимённых у них нет: имена пропсов фасада префиксуются (`tab_closable`),
 * выходов плагинов — тоже (`dismiss_ownerAttribute`, `layout_styles`).
 *
 * Выходы — в том же виде, что у остальных адаптеров (`TAdapterState` из
 * setup): геттер плагина читается, как свойство инстанса. Без них в типе
 * шаблон прочёл бы выход только по имени, без типа, — пометку панели
 * владельцем у Popover и Tooltip. Поэтому и вид у них с инстансом один
 * (`TInstance & TOutputs`), а не третий рядом: из пересечения трёх видов
 * TypeScript не выводит инстанс и фасад по ожидаемому типу контекста шаблона.
 */
export type TBindingState<TInstance, TFacade = unknown, TOutputs = unknown> = TInstanceState<
	TInstance & TOutputs
> &
	TInstanceState<TFacade>

/**
 * Связка компонента для базы элемента (`SoldyElement`). `TFacade` — фасад
 * коллекции у компонента с двумя контекстами (`joinBindings`); у остальных его
 * нет. `TOutputs` — выходы плагинов дескриптора компонента
 * (`DescriptorPluginOutputs`): их тоже читает шаблон.
 */
export type TBinding<TInstance = object, TFacade = unknown, TOutputs = unknown> = {
	/**
	 * Свойства инстанса, выходы плагинов и свойства фасада со снимком через
	 * `valueOf()` — см. `TInstanceState`.
	 */
	readonly state: TBindingState<TInstance, TFacade, TOutputs>
	readonly ctrl: TInstance
	/** Фасад коллекции: через его контекст элемента шаблон зовёт команды коллекции. */
	readonly facade: TFacade
	readonly plugins: IPluginBundle | null
	syncProps(props: object): void
	bindElement(el: Element | null): void
	destroy(): void
}

/**
 * То же, что `TBinding`, но без `ctrl` и привязки узла: они принадлежат
 * компоненту, а не фасаду его коллекции (см. `useCollectionAdapter`).
 */
export type TCollectionBinding<TFacade = object> = {
	/** Свойства фасада со снимком через `valueOf()`. */
	readonly state: TInstanceState<TFacade>
	readonly facade: TFacade
	syncProps(props: object): void
	destroy(): void
}

/** Сменился проп в ядре: имя в поверхности и новое значение. */
export type TUpdateListener = (name: string, value: unknown) => void

/** Общая часть связок контекста — свой он или фасада. */
type TExchangeBinding<C extends IComponentContract> = {
	readonly state: TAdapterState<C>
	syncProps(props: object): void
	destroy(): void
}

/**
 * Событие ядра — `CustomEvent` на элементе: `detail` — аргумент события, а у
 * события с несколькими — их список.
 *
 * Событие «до» — аргумент `TActionEvent` (`show:before`, `close:before`,
 * `item:remove:before`) — отменяемое, как событие DOM, и отменённое
 * (`dispatchEvent` вернул `false`) отменяет событие ядра. Приёмник связки
 * зовётся внутри эмита ядра, поэтому отмену ядро застаёт до того, как сверит
 * `defaultPrevented`. Признак — тип аргумента, а не имя события: правило одно
 * на все элементы. `detail` — само событие ядра, а не копия, поэтому
 * `detail.preventDefault()` отменяет, как прежде.
 */
function dispatch(
	host: HTMLElement,
	name: string,
	args: readonly unknown[],
	bubbles: boolean,
): void {
	const detail = args.length > 1 ? args : args[0]
	const action = detail instanceof TActionEvent ? detail : undefined
	const event = new CustomEvent(name, {
		detail,
		bubbles,
		composed: true,
		cancelable: action !== undefined,
	})

	// `false` отдаёт только отменяемое, то есть событие «до»
	if (!host.dispatchEvent(event)) action?.preventDefault()
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: связка контекста,
 * состояние, входы, события, приём и уничтожение.
 *
 * События контекста всплывают, только если хост написал потребитель. Хост,
 * который построил шаблон библиотеки, — разметка владельца: владелец слушает
 * его события на самом элементе, как в остальных адаптерах, где событие
 * вложенного компонента слышит только его разметка. Иначе `so:action:press`
 * кнопки очистки дошёл бы до слушателей поля и до делегирования на форме как
 * событие самого поля, а `so:element:ready` каждой страницы — до слушателей
 * пагинации.
 */
function useExchange<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TExchangeBinding<C> {
	const binding = adapter.connect(WebcProfile)
	const bubbles = !isOwnerMarkup(host)
	const state: Record<string, unknown> = {}

	// Подписка сразу отдаёт значение каждого свойства — тем же вызовом, что и
	// триггер: так состояние и заполняется, а элемент помечает его к отрисовке
	const unsubscribe = binding.state.subscribe((name, value) => {
		state[name] = value
		onUpdate(name, value)
	})

	const unbindEvents = binding.events.listen((exportName, args) => {
		dispatch(host, exportName, args, bubbles)
	})

	// Компонент принят: связку заводит `connectedCallback`, отброшенных
	// сборок у Web Components нет
	adapter.attach()

	return {
		state: toInstanceState<C>(state),

		// Элемент отдаёт не полный набор, а то, что задано: по одному атрибуту или
		// свойству. Выставленное до подключения применила сборка контекста.
		// Поэтому `inputs.delta`: `inputs.full` сбросил бы к умолчанию остальные.
		// Чужих имён дельта не трогает: входы компонента и фасада идут обоим
		syncProps(props: object): void {
			binding.inputs.delta(props)
		},

		destroy(): void {
			unsubscribe()
			unbindEvents()
			adapter.destroy()
		},
	}
}

export function useAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TBinding<C['instance'], unknown, C['plugins']['outputs']> {
	return {
		...useExchange(adapter, host, onUpdate),

		ctrl: adapter.instance,
		facade: undefined,
		plugins: adapter.bundle,

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},
	}
}

/**
 * Адаптер фасада коллекции — всё то же, кроме того, что принадлежит компоненту.
 *
 * У коллекционного компонента контекстов два: свой и фасада. Состояние,
 * входы, события, приём и уничтожение у фасада те же, что у компонента, а
 * `ctrl` и привязки узла — нет:
 *
 * - `ctrl` у фасада это `T*CollectionFacade`, тогда как под этим именем
 *   элемент отдаёт сам компонент;
 * - своего узла у фасада нет: он делит набор компонента, и корень к
 *   `TElementPlugin` привязывает связка компонента.
 *
 * События фасада уходят с того же хоста и всплывают по тому же правилу, что
 * события компонента (`useExchange`): разметка владельца — это компонент
 * целиком, с его коллекцией. Сам фасад связка отдаёт: элемент коллекции зовёт
 * через его контекст команды коллекции (`toggle`, `close`, активацию).
 */
export function useCollectionAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TCollectionBinding<C['instance']> {
	return {
		...useExchange(adapter, host, onUpdate),
		facade: adapter.instance,
	}
}

/**
 * Живой вид двух состояний: свойство — из состояния компонента, а нет его там
 * — из состояния фасада. Состояния заполнила подписка (`useExchange`): ключ на
 * каждое свойство с триггерами, и других ключей у них не появляется, поэтому
 * вид строится по ним один раз, а значения читает в момент обращения: база
 * читает состояние на каждой отрисовке, а связка пишет в оба объекта на месте.
 */
function joinStates(
	owner: Readonly<Record<string, unknown>>,
	facade: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
	const view: Record<string, unknown> = {}

	for (const name of new Set([...Object.keys(facade), ...Object.keys(owner)])) {
		Object.defineProperty(view, name, {
			enumerable: true,
			get: () => (Object.hasOwn(owner, name) ? owner[name] : facade[name]),
		})
	}

	return view
}

/**
 * Типизированный вид на состояние двух связок (`TBindingState`).
 *
 * Граница между рантаймом и типом — как `toInstanceState` у одной связки и
 * `toBindingState` у Vue. Вид собран по дескрипторам компонента и фасада из тех
 * же инстансов, что называют `TInstance` и `TFacade`, — с выходами плагинов
 * компонента (`TOutputs`), — но по именам свойств — эту связь держат
 * дескрипторы, TypeScript её не видит.
 */
function toBindingState<TInstance, TFacade, TOutputs>(
	view: Readonly<Record<string, unknown>>,
): TBindingState<TInstance, TFacade, TOutputs> {
	return view as TBindingState<TInstance, TFacade, TOutputs>
}

/**
 * Связка компонента с двумя контекстами — для базы, которой нужна одна:
 *
 * - состояние — одним живым видом, свойства компонента с выходами его плагинов
 *   и свойства фасада (`TBindingState`);
 * - входы — обоим: элемент отдаёт дельту, и каждый берёт свои;
 * - события — от обоих, с одного элемента (их отдаёт каждая связка сама);
 * - узел — только свой: у фасада его нет;
 * - уничтожение — фасад раньше компонента, как у Angular и React: элемент
 *   выходит из коллекции, пока его набор плагинов цел.
 */
export function joinBindings<TInstance, TFacade, TOutputs>(
	owner: TBinding<TInstance, unknown, TOutputs>,
	facade: TCollectionBinding<TFacade>,
): TBinding<TInstance, TFacade, TOutputs> {
	const ownerState: Readonly<Record<string, unknown>> = owner.state
	const facadeState: Readonly<Record<string, unknown>> = facade.state

	return {
		state: toBindingState<TInstance, TFacade, TOutputs>(joinStates(ownerState, facadeState)),
		ctrl: owner.ctrl,
		facade: facade.facade,
		plugins: owner.plugins,

		syncProps(props: object): void {
			owner.syncProps(props)
			facade.syncProps(props)
		},

		bindElement(el: Element | null): void {
			owner.bindElement(el)
		},

		destroy(): void {
			facade.destroy()
			owner.destroy()
		},
	}
}
