import type { IList, IListItem, TCollectionEngine, TScrollBehavior } from '@soldy/core'
import { frameDebounce } from '@soldy/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../../collection'
import { TListKeyboardPlugin } from '../keyboard'
import type { TListScrollPluginEvents } from './types'

/**
 * TListScrollPlugin — автоматическая прокрутка контейнера к выделенному элементу.
 *
 * Поведение управляется `scrollBehavior` инстанса списка: none / instant / smooth.
 */
export class TListScrollPlugin extends TBasePlugin<any, TListScrollPluginEvents> {
	private _element: HTMLElement | null = null
	private _list: IList | null = null
	private _collectionElements: TCollectionElements | null = null
	private readonly _scheduleScroll: (payload: {
		uid: string | number
		mode: 'center' | 'nearest'
	}) => void

	constructor() {
		super()
		this._scheduleScroll = frameDebounce(
			({ uid, mode }: { uid: string | number; mode: 'center' | 'nearest' }) =>
				this._scrollToItem(uid, mode),
		)
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IList>()
		this._collectionElements = ctx.get(TCollectionElements) ?? null

		ctx.get(TElementPlugin)?.events.on('ready', (element) => {
			this._element = element
		})

		ctx.get(TElementPlugin)?.events.on('removed', () => {
			this._element = null
		})

		const bundles = ctx.get(TCollectionBundlesPlugin)

		bundles?.events.on('collection:bound', (collection) => {
			this._subscribeToCollection(collection)
		})

		const keyboardPlugin = ctx.get(TListKeyboardPlugin) ?? null

		keyboardPlugin?.events.on('change:highlight', ({ item }) => {
			if (item) {
				this._scheduleScroll({ uid: item.uid, mode: 'nearest' })
			}
		})
	}

	override destroy(): void {
		this._element = null
		this._list = null
		this._collectionElements = null

		super.destroy()
	}

	private _subscribeToCollection(collection: TCollectionEngine<any, any>): void {
		const selected = collection.extensions.selection.selected as IListItem[]

		if (selected.length > 0) {
			this._scrollToItem(selected[0].uid, 'center')
		}

		collection.extensions.selection.events.on('change:selection', (items: IListItem[]) => {
			if (items.length > 0) {
				this._scheduleScroll({ uid: items[0].uid, mode: 'center' })
			}
		})
	}

	private _scrollToItem(uid: string | number, mode: 'center' | 'nearest'): void {
		if (!this._element || !this._list) return

		const behavior: TScrollBehavior = this._list.scrollBehavior

		if (behavior === 'none') return

		const targetElement = this._collectionElements?.getElementByUid(uid)

		if (!targetElement) return

		if (mode === 'nearest') {
			targetElement.scrollIntoView({
				block: 'nearest',
				behavior: behavior === 'instant' ? 'instant' : 'smooth',
			})
			return
		}

		if (this._isFullyVisible(targetElement)) return

		const container = this._element
		const containerRect = container.getBoundingClientRect()
		const targetRect = targetElement.getBoundingClientRect()

		const scrollTop =
			container.scrollTop + (targetRect.top - containerRect.top) - container.clientHeight / 2

		container.scrollTo({
			top: scrollTop,
			behavior: behavior === 'instant' ? 'instant' : 'smooth',
		})
	}

	private _isFullyVisible(el: HTMLElement): boolean {
		if (!this._element) return false

		const containerRect = this._element.getBoundingClientRect()
		const targetRect = el.getBoundingClientRect()

		return targetRect.top >= containerRect.top && targetRect.bottom <= containerRect.bottom
	}
}
