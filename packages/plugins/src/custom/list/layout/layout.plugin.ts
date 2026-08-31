import type { IList, TCollectionEngine } from '@soldy/core'
import { frameDebounce } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import type { TListLayoutPluginEvents } from './types'

/**
 * TListLayoutPlugin — управляет высотой контейнера List/ListBox в зависимости от maxRows.
 *
 * Вычисляет высоту как сумму высот первых N DOM-элементов + (N - 1) * gap,
 * где N = maxRows (или все элементы, если maxRows === 0).
 */
export class TListLayoutPlugin extends TBasePlugin<any, TListLayoutPluginEvents> {
	private _element: HTMLElement | null = null
	private _list: IList | null = null
	private _collectionElements: TCollectionElements | null = null
	private _collection: TCollectionEngine<any, any> | null = null
	private _rootObserver: ResizeObserver | null = null
	private readonly _itemObservers = new Map<string | number, ResizeObserver>()
	private readonly _scheduleUpdate: () => void

	constructor() {
		super()
		this._scheduleUpdate = frameDebounce(() => this._updateHeight())
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IList>()
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			this._rootObserver = new ResizeObserver(() => this._scheduleUpdate())
			this._rootObserver.observe(element)
			this._scheduleUpdate()
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._rootObserver?.disconnect()
			this._rootObserver = null
			this._element = null
		})

		this._list?.events.on('change:maxRows', () => this._scheduleUpdate())

		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('collection:bound', (collection) => {
			this._collection = collection

			collection.engine.events.on('change:items', () => this._scheduleUpdate())
			collection.engine.events.on('item:removed', () => this._scheduleUpdate())
		})

		bundles?.events.on('bundle:registered', ({ uid, bundle }) => {
			const elementPlugin = bundle.get(TElementPlugin)

			elementPlugin?.events.on('ready', (element) => {
				this._itemObservers.get(uid)?.disconnect()

				const observer = new ResizeObserver(() => this._scheduleUpdate())
				observer.observe(element)

				this._itemObservers.set(uid, observer)
				this._scheduleUpdate()
			})

			elementPlugin?.events.on('removed', () => {
				this._itemObservers.get(uid)?.disconnect()
				this._itemObservers.delete(uid)
				this._scheduleUpdate()
			})
		})

		bundles?.events.on('bundle:unregistered', ({ uid }) => {
			this._itemObservers.get(uid)?.disconnect()
			this._itemObservers.delete(uid)
			this._scheduleUpdate()
		})
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
		this._collection = null

		super.destroy()
	}

	/**
	 * Обновляет высоту контейнера списка в зависимости от maxRows и размеров элементов.
	 */
	private _updateHeight(): void {
		if (!this._element || !this._list) return

		const elements = this._collectionElements?.getAll() ?? []
		const maxRows = this._list.maxRows
		const visibleCount = maxRows === 0 ? elements.length : Math.min(maxRows, elements.length)

		const gap = parseFloat(getComputedStyle(this._element).rowGap) || 0

		let totalHeight = 0
		const limit = Math.min(visibleCount, elements.length)

		for (let i = 0; i < limit; i++) {
			totalHeight += elements[i].offsetHeight
		}

		if (limit > 1) {
			totalHeight += (limit - 1) * gap
		}

		this._element.style.maxHeight = `${totalHeight}px`
		this._element.style.overflowY =
			visibleCount === 0 || visibleCount >= elements.length ? 'hidden' : 'auto'
	}
}
