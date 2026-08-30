import type { IList, IListItem, TCollection } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { TListItemPlugin } from '../item'
import type { TListKeyboardPluginEvents } from './types'

/**
 * TListKeyboardPlugin — клавиатурная навигация по списку.
 *
 * ArrowDown/ArrowUp перемещают подсветку (TListItemPlugin.highlighted),
 * Enter/Space переключают выбор через selection-расширение коллекции.
 */
export class TListKeyboardPlugin extends TBasePlugin<any, TListKeyboardPluginEvents> {
	private _element: HTMLElement | null = null
	private _list: IList | null = null
	private _collection: TCollection<any, any> | null = null
	private _bundles: TCollectionBundlesPlugin | null = null
	private _highlightedUid: string | number | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IList>()
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
			element.addEventListener('keydown', this._onKeyDown)
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element?.removeEventListener('keydown', this._onKeyDown)
			this._element = null
		})

		this._bundles?.events.on('collection:bound', (collection) => {
			this._collection = collection

			const selected = collection.extensions.selection.selected as IListItem[]

			if (selected.length > 0) {
				this._trackPosition(selected[0].uid)
			}

			collection.extensions.selection.events.on('change:selection', (items: IListItem[]) => {
				if (items.length > 0) {
					this._trackPosition(items[0].uid)
				}
			})
		})
	}

	override destroy(): void {
		this._element?.removeEventListener('keydown', this._onKeyDown)
		this._clearHighlight()

		this._element = null
		this._list = null
		this._collection = null
		this._bundles = null

		super.destroy()
	}

	/** Текущий список элементов коллекции. */
	private _getItems(): IListItem[] {
		return (this._collection?.engine ?? []) as IListItem[]
	}

	private _getIndex(uid: string | number): number {
		return this._getItems().findIndex((item) => item.uid === uid)
	}

	private _getItemAt(index: number): IListItem | null {
		return this._getItems()[index] ?? null
	}

	private _getNextIndex(currentIdx: number): number {
		const items = this._getItems()
		return currentIdx < items.length - 1 ? currentIdx + 1 : 0
	}

	private _getPrevIndex(currentIdx: number): number {
		const items = this._getItems()
		return currentIdx > 0 ? currentIdx - 1 : items.length - 1
	}

	private readonly _onKeyDown = (e: KeyboardEvent) => {
		if (!this._collection) return

		const items = this._getItems()
		if (items.length === 0) return

		const currentIdx = this._highlightedUid != null ? this._getIndex(this._highlightedUid) : -1

		const isNav = e.key === 'ArrowDown' || e.key === 'ArrowUp'
		const isSelect = e.key === 'Enter' || e.key === ' '

		if (!isNav && !isSelect) return

		e.preventDefault()

		if (e.key === 'ArrowDown') {
			this._setHighlight(items[this._getNextIndex(currentIdx)].uid)
		} else if (e.key === 'ArrowUp') {
			this._setHighlight(items[this._getPrevIndex(currentIdx)].uid)
		} else if (this._highlightedUid != null) {
			const item = this._getItems()[this._getIndex(this._highlightedUid)]

			if (item) {
				this._collection.extensions.selection.toggle(item)
			}
		}
	}

	/** Плагин элемента по uid. */
	private _getItemPlugin(uid: string | number): TListItemPlugin | undefined {
		return this._bundles?.getByUid(uid)?.get(TListItemPlugin)
	}

	private _setHighlight(uid: string | number): void {
		this._trackPosition(uid)
		this._applyVisualHighlight(uid)
	}

	private _trackPosition(uid: string | number): void {
		if (this._highlightedUid === uid) return

		const prevPlugin =
			this._highlightedUid != null ? this._getItemPlugin(this._highlightedUid) : null
		if (prevPlugin) prevPlugin.highlighted = false

		this._highlightedUid = uid

		const idx = this._getIndex(uid)

		this.events.emit('change:highlight', {
			item: this._getItemAt(idx),
			prevItem: this._getItemAt(idx - 1),
			nextItem: this._getItemAt(idx + 1),
		})
	}

	private _applyVisualHighlight(uid: string | number): void {
		const plugin = this._getItemPlugin(uid)
		if (plugin) plugin.highlighted = true
	}

	private _clearHighlight(): void {
		if (this._highlightedUid == null) return

		const prev = this._getItemPlugin(this._highlightedUid)
		if (prev) prev.highlighted = false

		this._highlightedUid = null
		this.events.emit('change:highlight', { item: null, prevItem: null, nextItem: null })
	}

	get highlightedUid(): string | number | null {
		return this._highlightedUid
	}
}
