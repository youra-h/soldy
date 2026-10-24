import type { ITabs } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { listOf } from '../parts'
import type { TTabsLayoutPluginEvents } from './types'

/**
 * TTabsLayoutPlugin — отслеживает изменения размеров табов через ResizeObserver.
 *
 * Наблюдает:
 * - корень набора;
 * - свой список табов — ребёнка своего ряда. При выравнивании `center` и `end`
 *   слот ряда меняет ширину, и табы сдвигаются, а размеры табов и корня — нет:
 *   меняется только место, которое список забирает между слотами;
 * - DOM-элементы каждого таба (через реестр bundles + TElementPlugin).
 *
 * Эмитит change:layout при изменении размеров — нужно для обновления позиции/размера
 * активного таба, по которым тема рисует его отметку, и при переносе табов на
 * другую строку.
 *
 * Все наблюдатели смотрят border-box: наблюдать надо ровно то, что меряется
 * по `change:layout`, — `TTabsActiveTabPlugin` берёт позицию и размер таба из
 * `offsetLeft`/`offsetTop` и `offsetWidth`/`offsetHeight`. Умолчание
 * `content-box` пропустило бы смену одного паддинга или рамки таба (паддинг
 * по размеру, толщина рамки по состоянию), и геометрия активного таба
 * держалась бы по старому размеру до ближайшего пересчёта по другой причине.
 */
export class TTabsLayoutPlugin extends TBasePlugin<ITabs, TTabsLayoutPluginEvents> {
	private _tabs: ITabs | null = null
	private _rootObserver: ResizeObserver | null = null
	private _listObserver: ResizeObserver | null = null
	private readonly _itemObservers = new Map<string | number, ResizeObserver>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._tabs = ctx.getInstance<ITabs>()

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._disconnect()
			this._rootObserver = this._observe(element)

			// Список ищется прямым путём от корня: он стоит в ряду после `leading`, и
			// Tabs, вложенные в слот, нашлись бы первыми
			const list = this._tabs ? listOf(this._tabs, element) : null

			this._listObserver = list ? this._observe(list) : null
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => this._disconnect())

		// Наблюдаем элементы табов: подписываемся на реестр bundles и следим за
		// DOM-элементами каждого таба через его TElementPlugin.
		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('bundle:registered', ({ uid, bundle }) => {
			const elementPlugin = bundle.get(TElementPlugin)

			elementPlugin?.events.on('ready', (element) => {
				this._itemObservers.get(uid)?.disconnect()
				this._itemObservers.set(uid, this._observe(element))
			})

			elementPlugin?.events.on('removed', () => {
				this._itemObservers.get(uid)?.disconnect()
				this._itemObservers.delete(uid)
			})
		})

		bundles?.events.on('bundle:unregistered', ({ uid }) => {
			this._itemObservers.get(uid)?.disconnect()
			this._itemObservers.delete(uid)
		})
	}

	override destroy(): void {
		this._disconnect()
		this._tabs = null

		for (const observer of this._itemObservers.values()) {
			observer.disconnect()
		}
		this._itemObservers.clear()

		super.destroy()
	}

	/** Наблюдатель размеров узла по border-box (см. шапку). */
	private _observe(element: Element): ResizeObserver {
		const observer = new ResizeObserver(() => this.events.emit('change:layout'))

		observer.observe(element, { box: 'border-box' })

		return observer
	}

	/** Снять наблюдение за корнем и списком: узел снят, заменён или плагин уничтожен. */
	private _disconnect(): void {
		this._rootObserver?.disconnect()
		this._rootObserver = null
		this._listObserver?.disconnect()
		this._listObserver = null
	}
}
