import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { TTabsLayoutPluginEvents } from './types'

/**
 * TTabsLayoutPlugin — отслеживает изменения размеров табов через ResizeObserver.
 *
 * Наблюдает:
 * - корневой элемент (список табов);
 * - DOM-элементы каждого таба (через реестр bundles + TElementPlugin).
 *
 * Эмитит change:layout при изменении размеров — нужно для обновления позиции/размера
 * индикатора активного таба (view: line/outline) и при переносе табов на другую строку.
 */
export class TTabsLayoutPlugin extends TBasePlugin<any, TTabsLayoutPluginEvents> {
	private _rootObserver: ResizeObserver | null = null
	private readonly _itemObservers = new Map<string | number, ResizeObserver>()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._rootObserver = new ResizeObserver(() => this.events.emit('change:layout'))
			this._rootObserver.observe(element)
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._rootObserver?.disconnect()
			this._rootObserver = null
		})

		// Наблюдаем элементы табов: подписываемся на реестр bundles и следим за
		// DOM-элементами каждого таба через его TElementPlugin.
		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('bundle:registered', ({ uid, bundle }) => {
			const elementPlugin = bundle.get(TElementPlugin)

			elementPlugin?.events.on('ready', (element) => {
				this._itemObservers.get(uid)?.disconnect()

				const observer = new ResizeObserver(() => this.events.emit('change:layout'))
				observer.observe(element)

				this._itemObservers.set(uid, observer)
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
		this._rootObserver?.disconnect()
		this._rootObserver = null

		for (const observer of this._itemObservers.values()) {
			observer.disconnect()
		}
		this._itemObservers.clear()

		super.destroy()
	}
}
