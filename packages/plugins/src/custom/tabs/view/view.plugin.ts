import type { ITabs, TTabsCollection, TTabsView } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import { TTabsActiveTabPlugin } from '../active-tab'
import type { TActiveTabOffset } from '../active-tab'
import type { TTabsViewPluginEvents } from './types'

type TViewHandler = (offset: TActiveTabOffset | null) => void

/**
 * TTabsViewPlugin — отрисовка индикатора активного таба (view: line/outline).
 *
 * Слушает TTabsActiveTabPlugin (change:active-tab) и обновляет CSS-переменные
 * на списке табов для позиционирования/размера индикатора.
 */
export class TTabsViewPlugin extends TBasePlugin<ITabs, TTabsViewPluginEvents> {
	private _tabs: ITabs | null = null
	private _collection: TTabsCollection | null = null

	private readonly _handlers: Partial<Record<TTabsView, TViewHandler>> = {
		line: (offset) => this._updateLine(offset),
		outline: (offset) => this._updateOutline(offset),
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._tabs = ctx.getInstance<ITabs>()

		ctx.get(TElementPlugin)?.events.on('ready', () => {
			if (this._tabs?.view === 'line') {
				this._tabs.classes.add('--ready-animation')
			}
		})

		ctx.get(TCollectionBundlesPlugin)?.events.on('collection:bound', (collection) => {
			this._collection = collection as TTabsCollection
		})

		ctx.get(TTabsActiveTabPlugin)?.events.on('change:active-tab', (offset) => {
			if (!this._tabs) return
			this._handlers[this._tabs.view]?.(offset)
		})
	}

	override destroy(): void {
		this._tabs = null
		this._collection = null

		super.destroy()
	}

	private _updateLine(offset: TActiveTabOffset | null): void {
		if (!offset || !this._collection) return

		const activeItem = this._collection.extensions.activation.activeItem

		if (!activeItem && this._collection.extensions.tabs.hasEnabledTabs()) return

		const { listEl, offsetLeft, offsetWidth, offsetTop, offsetHeight } = offset

		if (this._tabs!.orientation === 'vertical') {
			listEl.style.setProperty('--underline-pos', `${offsetTop}px`)
			listEl.style.setProperty('--underline-size', `${offsetHeight}px`)
		} else {
			listEl.style.setProperty('--underline-pos', `${offsetLeft}px`)
			listEl.style.setProperty('--underline-size', `${offsetWidth}px`)
		}
	}

	private _updateOutline(offset: TActiveTabOffset | null): void {
		if (!offset || !this._collection) return

		const { listEl, offsetLeft, offsetWidth, offsetTop, offsetHeight } = offset

		if (this._tabs!.orientation === 'vertical') {
			listEl.style.setProperty('--gap-pos', `${offsetTop + 1}px`)
			listEl.style.setProperty('--gap-size', `${offsetHeight - 1}px`)
		} else {
			listEl.style.setProperty('--gap-pos', `${offsetLeft + 1}px`)
			listEl.style.setProperty('--gap-size', `${offsetWidth - 1}px`)
		}
	}
}
