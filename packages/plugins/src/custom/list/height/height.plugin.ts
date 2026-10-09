import { batchOf, frameDebounce } from '@soldy-ui/core'
import type { IList, TCollectionEngine, TListEvents } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IListenable, IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { isMeasurableElement } from '../../../utils'

/**
 * Что плагину нужно от компонента: число строк и канал о его смене.
 *
 * Структурный тип, а не `IListBox`: тот же плагин стоит и на Select, у
 * которого общего предка со списком нет — есть только общий контракт.
 */
interface IListHeightOwner extends Pick<IList, 'maxRows'> {
	readonly events: IListenable<Pick<TListEvents, 'change:maxRows'>>
}

/**
 * TListHeightPlugin — высота контейнера списка по `maxRows`.
 *
 * Единственное списочное свойство, которому нужен плагин. `contentFit` ядро
 * применяет само (`data-*`), `scrollBehavior` только читают — а `maxRows`
 * требует измерений: высоту строк без DOM не узнать. Ради этого здесь и живут
 * `ResizeObserver`ы.
 *
 * Оба наблюдателя — за корнем и за каждой строкой — смотрят border-box:
 * наблюдать надо ровно то, что меряем, а строки меряются `offsetHeight`.
 * Умолчание `content-box` пропустило бы смену одного паддинга или рамки
 * строки (паддинг по размеру, толщина рамки по состоянию): content-box строки
 * от неё не меняется, а контейнер, уже зажатый `max-height`, не меняется
 * вовсе. Предел держался бы по старой высоте строк до ближайшего пересчёта по
 * другой причине.
 *
 * Само свойство лежит на инстансе (`IList`), плагин его читает и подписан на
 * `change:maxRows`. Так устроены и остальные плагины пакета: свойство —
 * ядру, применение — плагину.
 *
 * Строки считаются по показанным элементам коллекции (`batch.shown`), а не по
 * узлам в документе: в окне (обёртка `Virtual`) нарисованы только видимые, и
 * их число и порядок не говорят ни сколько строк в списке, ни нужна ли
 * прокрутка. Высоту строки дают нарисованные: показанный, но не нарисованный
 * элемент — той же высоты, высота строк в окне одна на все.
 */
export class TListHeightPlugin extends TBasePlugin<any> {
	private _element: Element | null = null
	private _list: IListHeightOwner | null = null
	private _engine: TCollectionEngine<any, any> | null = null
	private _collectionElements: TCollectionElements | null = null
	private _rootObserver: ResizeObserver | null = null
	private readonly _itemObservers = new Map<string | number, ResizeObserver>()
	private readonly _scheduleUpdate: () => void

	constructor() {
		super()
		this._scheduleUpdate = frameDebounce(() => this._update())
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IListHeightOwner>()
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		this._listenTo(this._list?.events, 'change:maxRows', () => this._scheduleUpdate())

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._rootObserver?.disconnect()
			this._rootObserver = new ResizeObserver(() => this._scheduleUpdate())
			this._rootObserver.observe(element, { box: 'border-box' })
			this._scheduleUpdate()
		})

		elementPlugin?.events.on('removed', () => {
			this._rootObserver?.disconnect()
			this._rootObserver = null
			this._element = null
		})

		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('engine:bound', (engine) => {
			this._engine = engine

			// Показанные сменились — состав, отбор или порядок: сменилось и число строк
			this._listenTo(batchOf(engine)?.events, 'change:shown', () => this._scheduleUpdate())
		})

		bundles?.events.on('bundle:registered', ({ uid, bundle }) => {
			const itemElement = bundle.get(TElementPlugin)

			itemElement?.events.on('ready', (element) => {
				this._observeItem(uid, element)
			})

			itemElement?.events.on('removed', () => this._unobserveItem(uid))
		})

		bundles?.events.on('bundle:unregistered', ({ uid }) => this._unobserveItem(uid))
	}

	override destroy(): void {
		this._rootObserver?.disconnect()
		this._rootObserver = null

		for (const observer of this._itemObservers.values()) {
			observer.disconnect()
		}
		this._itemObservers.clear()

		this._element = null
		this._list = null
		this._engine = null
		this._collectionElements = null

		super.destroy()
	}

	private _observeItem(uid: string | number, element: Element): void {
		this._itemObservers.get(uid)?.disconnect()

		const observer = new ResizeObserver(() => this._scheduleUpdate())

		observer.observe(element, { box: 'border-box' })

		this._itemObservers.set(uid, observer)
		this._scheduleUpdate()
	}

	private _unobserveItem(uid: string | number): void {
		this._itemObservers.get(uid)?.disconnect()
		this._itemObservers.delete(uid)
		this._scheduleUpdate()
	}

	/**
	 * Ограничивает высоту прокручиваемого контейнера по `maxRows`.
	 *
	 * Контейнер — **родитель элементов**, а не корень компонента. Для ListBox
	 * это одно и то же, а для Select нет: его корень — поле, а список лежит в
	 * телепортированной панели. Пока плагин писал в корень, Select получал
	 * `max-height` на поле и схлопывался в полосу.
	 */
	private _update(): void {
		const shown: readonly object[] = batchOf<object>(this._engine)?.shown ?? []
		// Узлы показанных по порядку; не нарисованный окном — `null`
		const rows = shown.map((item) => this._collectionElements?.getElementByItem(item) ?? null)
		const container = rows.find((row) => row !== null)?.parentElement ?? this._element

		// Высота пишется инлайновым стилем и считается по `offsetHeight` — у узла
		// без layout-бокса (например, корень-`svg`) мерить нечего и писать некуда.
		if (!isMeasurableElement(container)) return

		const maxRows = this._list?.maxRows ?? 0

		// `0` — «предела нет»: плагин не пишет ничего и отдаёт потолок теме.
		// Не то же самое, что «предел по содержимому»: инлайновый стиль перебил
		// бы `.s-select__list { max-h-64 }` и заодно снял прокрутку.
		//
		// Список пуст или строки ещё не измерены — тот же случай: писать нечего.
		const visibleCount = maxRows === 0 ? 0 : Math.min(maxRows, shown.length)
		const totalHeight = this._measure(container, rows, visibleCount)

		if (totalHeight === 0) {
			container.style.maxHeight = ''
			container.style.overflowY = ''

			return
		}

		container.style.maxHeight = `${totalHeight}px`
		container.style.overflowY = visibleCount >= shown.length ? 'hidden' : 'auto'
	}

	/**
	 * Высота первых `count` строк вместе с промежутками между ними.
	 *
	 * Строку, которую окно не нарисовало, считаем высотой нарисованной: в окне
	 * высота строк одна на все. Не нарисовано ни одной — строки ещё не
	 * измерены, и писать нечего.
	 *
	 * `max-height` пишется в контейнер, а не в область строк, поэтому при
	 * `box-sizing: border-box` в неё нужно добавить вертикальные паддинги и
	 * рамки — иначе тема, добавившая отступы, теряет последнюю строку. При
	 * `content-box` добавлять нечего, поэтому решаем по факту стиля, а не по
	 * допущению про конкретную тему.
	 */
	private _measure(
		container: HTMLElement,
		rows: ReadonlyArray<Element | null>,
		count: number,
	): number {
		if (count === 0) return 0

		const drawn = rows.find((row) => row !== null && isMeasurableElement(row))

		if (!isMeasurableElement(drawn)) return 0

		const style = getComputedStyle(container)
		const gap = parseFloat(style.rowGap) || 0

		let total = 0

		for (let i = 0; i < count; i++) {
			const row = rows[i] ?? drawn

			// Строка без layout-бокса высоты не имеет — она идёт в счёт строк, но
			// не в сумму.
			if (isMeasurableElement(row)) total += row.offsetHeight
		}

		total += (count - 1) * gap

		if (style.boxSizing === 'border-box') {
			total +=
				(parseFloat(style.paddingTop) || 0) +
				(parseFloat(style.paddingBottom) || 0) +
				(parseFloat(style.borderTopWidth) || 0) +
				(parseFloat(style.borderBottomWidth) || 0)
		}

		return total
	}
}
