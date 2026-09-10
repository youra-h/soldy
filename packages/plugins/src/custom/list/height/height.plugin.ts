import { frameDebounce } from '@soldy/core'
import type { IList } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'

/**
 * Что плагину нужно от компонента: число строк и канал о его смене.
 *
 * Структурный тип, а не `IListBox`: тот же плагин стоит и на Select, у
 * которого общего предка со списком нет — есть только общий контракт.
 */
interface IListHeightOwner extends Pick<IList, 'maxRows'> {
	readonly events: { on(name: 'change:maxRows', handler: () => void): unknown }
}

/**
 * TListHeightPlugin — высота контейнера списка по `maxRows`.
 *
 * Единственное списочное свойство, которому нужен плагин. `contentFit` ядро
 * применяет само (`data-*`), `scrollBehavior` только читают — а `maxRows`
 * требует измерений: высоту строк без DOM не узнать. Ради этого здесь и живут
 * `ResizeObserver`ы.
 *
 * Само свойство лежит на инстансе (`IList`), плагин его читает и подписан на
 * `change:maxRows`. Так устроены и остальные плагины пакета: свойство —
 * ядру, применение — плагину.
 */
export class TListHeightPlugin extends TBasePlugin<any> {
	private _element: HTMLElement | null = null
	private _list: IListHeightOwner | null = null
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

		this._list?.events.on('change:maxRows', () => this._scheduleUpdate())

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._rootObserver = new ResizeObserver(() => this._scheduleUpdate())
			this._rootObserver.observe(element)
			this._scheduleUpdate()
		})

		elementPlugin?.events.on('removed', () => {
			this._rootObserver?.disconnect()
			this._rootObserver = null
			this._element = null
		})

		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('engine:bound', (engine) => {
			engine.driver.events.on('change:items', () => this._scheduleUpdate())
			engine.driver.events.on('item:removed', () => this._scheduleUpdate())
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
		this._collectionElements = null

		super.destroy()
	}

	private _observeItem(uid: string | number, element: HTMLElement): void {
		this._itemObservers.get(uid)?.disconnect()

		const observer = new ResizeObserver(() => this._scheduleUpdate())

		observer.observe(element)

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
		const elements = this._collectionElements?.getAll() ?? []
		const container = elements[0]?.parentElement ?? this._element

		if (!container) return

		const maxRows = this._list?.maxRows ?? 0

		// `0` — «предела нет»: плагин не пишет ничего и отдаёт потолок теме.
		// Не то же самое, что «предел по содержимому»: инлайновый стиль перебил
		// бы `.s-select__list { max-h-64 }` и заодно снял прокрутку.
		//
		// Список пуст или строки ещё не измерены — тот же случай: писать нечего.
		const visibleCount = maxRows === 0 ? 0 : Math.min(maxRows, elements.length)
		const totalHeight = this._measure(container, elements, visibleCount)

		if (totalHeight === 0) {
			container.style.maxHeight = ''
			container.style.overflowY = ''

			return
		}

		container.style.maxHeight = `${totalHeight}px`
		container.style.overflowY = visibleCount >= elements.length ? 'hidden' : 'auto'
	}

	/**
	 * Высота первых `count` строк вместе с промежутками между ними.
	 *
	 * `max-height` пишется в контейнер, а не в область строк, поэтому при
	 * `box-sizing: border-box` в неё нужно добавить вертикальные паддинги и
	 * рамки — иначе тема, добавившая отступы, теряет последнюю строку. При
	 * `content-box` добавлять нечего, поэтому решаем по факту стиля, а не по
	 * допущению про конкретную тему.
	 */
	private _measure(container: HTMLElement, elements: HTMLElement[], count: number): number {
		if (count === 0) return 0

		const style = getComputedStyle(container)
		const gap = parseFloat(style.rowGap) || 0

		let total = 0

		for (let i = 0; i < count; i++) {
			total += elements[i].offsetHeight
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
