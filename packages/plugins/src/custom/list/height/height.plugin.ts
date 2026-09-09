import { frameDebounce } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TListLayoutPlugin } from '../layout'

/**
 * TListHeightPlugin — высота контейнера списка по `maxRows`.
 *
 * Единственный из четырёх, кому нужны измерения: он следит за размерами корня и
 * каждого элемента и пересчитывает предел. Ради этого здесь и живут
 * `ResizeObserver`ы — остальные свойства раскладки применяются без DOM, и
 * держать их рядом значило бы тянуть за ними всю эту машинерию.
 *
 * Само `maxRows` объявляет и хранит `TListLayoutPlugin`; этот плагин его
 * читает и подписан на смену.
 */
export class TListHeightPlugin extends TBasePlugin<any> {
	private _element: HTMLElement | null = null
	private _layout: TListLayoutPlugin | null = null
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

		this._layout = ctx.get(TListLayoutPlugin) ?? null
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		this._layout?.events.on('change:maxRows', () => this._scheduleUpdate())

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

		bundles?.events.on('engine:bound', (collection) => {
			collection.driver.events.on('change:items', () => this._scheduleUpdate())
			collection.driver.events.on('item:removed', () => this._scheduleUpdate())
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
		this._layout = null
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

		const maxRows = this._layout?.maxRows ?? 0

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

	/** Высота первых `count` строк вместе с промежутками между ними. */
	private _measure(container: HTMLElement, elements: HTMLElement[], count: number): number {
		if (count === 0) return 0

		const gap = parseFloat(getComputedStyle(container).rowGap) || 0

		let total = 0

		for (let i = 0; i < count; i++) {
			total += elements[i].offsetHeight
		}

		return total + (count - 1) * gap
	}
}
