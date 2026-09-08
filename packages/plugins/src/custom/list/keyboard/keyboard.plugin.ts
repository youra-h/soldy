import type { IList, IListItem, TCollectionEngine } from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TListNavigationPlugin } from '../navigation'
import type { TListKeyboardPluginEvents } from './types'

/**
 * TListKeyboardPlugin — клавиатура самостоятельного списка (ListBox).
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг — в `TListNavigationPlugin`. Здесь только то,
 * чем список отличается: набор клавиш и смысл активации.
 *
 * `ListBox` фокусируется сам (`tabindex="0"` на корне), поэтому `keydown`
 * слушается на нём же. Enter и Space переключают выбор через
 * selection-расширение коллекции.
 */
export class TListKeyboardPlugin extends TListNavigationPlugin<TListKeyboardPluginEvents> {
	private _list: IList | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._list = ctx.getInstance<IList>()
	}

	override destroy(): void {
		this._list = null

		super.destroy()
	}

	/**
	 * Подсветка встаёт на выбранный элемент — и следует за ним, если выбор
	 * поменяли снаружи. Позиция запоминается без визуальной отметки: список
	 * ещё не в навигации.
	 */
	protected override onCollectionBound(collection: TCollectionEngine<any, any>): void {
		const selected = collection.extensions.selection.selected as IListItem[]

		if (selected.length > 0) this.trackHighlight(selected[0].uid)

		collection.extensions.selection.events.on('change:selection', (items: IListItem[]) => {
			if (items.length > 0) this.trackHighlight(items[0].uid)
		})
	}

	protected override onKeyDown(e: KeyboardEvent): void {
		if (!this._collection) return
		if (this.items().length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				this.move(1)

				return

			case 'ArrowUp':
				e.preventDefault()
				this.move(-1)

				return

			case 'Enter':
			case ' ':
				e.preventDefault()
				this._toggleHighlighted()

				return
		}
	}

	private _toggleHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) this._collection?.extensions.selection.toggle(item)
	}
}
