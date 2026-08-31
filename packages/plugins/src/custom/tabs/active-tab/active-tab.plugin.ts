import type { ITabs, TTabsCollection } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TTabsLayoutPlugin } from '../layout'
import type { TActiveTabOffset, TTabsActiveTabPluginEvents } from './types'

/**
 * TTabsActiveTabPlugin — вычисляет позицию/размер активного таба (offset).
 *
 * Использует:
 * - корневой DOM-элемент списка табов (через TElementPlugin);
 * - активный элемент коллекции (collection.extensions.activation);
 * - DOM-элемент активного таба (через TCollectionElements).
 *
 * Пересчитывает offset при активации/деактивации, удалении/перемещении элементов,
 * изменении view и изменении layout (resize).
 */
export class TTabsActiveTabPlugin extends TBasePlugin<ITabs, TTabsActiveTabPluginEvents> {
	private _element: HTMLElement | null = null
	private _tabs: ITabs | null = null
	private _collectionElements: TCollectionElements | null = null
	private _collection: TTabsCollection | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._tabs = ctx.getInstance<ITabs>()
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			this._emitOffset()
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element = null
		})

		ctx.get(TTabsLayoutPlugin)?.events.on('change:layout', () => this._emitOffset())

		// Коллекция привязывается к TCollectionBundlesPlugin ПОСЛЕ install() —
		// слушаем момент привязки и подписываемся на события коллекции.
		ctx.get(TCollectionBundlesPlugin)?.events.on('collection:bound', (collection) => {
			this._collection = collection as TTabsCollection

			collection.extensions.activation.events.on('item:activated', () => this._emitOffset())
			collection.extensions.activation.events.on('item:deactivated', () => this._emitOffset())

			collection.driver.events.on('item:removed', () =>
				requestAnimationFrame(() => this._emitOffset()),
			)
			collection.driver.events.on('item:moved', () =>
				requestAnimationFrame(() => this._emitOffset()),
			)
		})

		this._tabs?.events.on('change:view', () => this._emitOffset())
	}

	override destroy(): void {
		this._element = null
		this._tabs = null
		this._collectionElements = null
		this._collection = null

		super.destroy()
	}

	getOffset(): TActiveTabOffset | null {
		return this._computeOffset()
	}

	private _emitOffset(): void {
		this.events.emit('change:active-tab', this._computeOffset())
	}

	private _computeOffset(): TActiveTabOffset | null {
		if (!this._element || !this._collectionElements || !this._collection || !this._tabs) {
			return null
		}

		const listCls = this._tabs.classes.resolve('__list', { point: true })
		const listEl = this._element.querySelector(listCls) as HTMLElement | null

		if (!listEl) return null

		const activeItem = this._collection.extensions.activation.activeItem
		const activeEl = activeItem
			? this._collectionElements.getElementByUid(activeItem.uid)
			: null

		return {
			listEl,
			offsetLeft: activeEl ? activeEl.offsetLeft : 0,
			offsetWidth: activeEl ? activeEl.offsetWidth : 0,
			offsetTop: activeEl ? activeEl.offsetTop : 0,
			offsetHeight: activeEl ? activeEl.offsetHeight : 0,
		}
	}
}
