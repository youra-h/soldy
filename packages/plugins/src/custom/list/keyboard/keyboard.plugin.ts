import type { IControl, TCollectionEngine } from '@soldy/core'
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
 * слушается на нём же. Enter и Space переключают выбор подсвеченного через
 * расширение списка (`list.chooseItem`), как и клик по строке.
 */
export class TListKeyboardPlugin extends TListNavigationPlugin<TListKeyboardPluginEvents> {
	/**
	 * Подсветка встаёт на выбранный элемент — и следует за ним, если выбор
	 * поменяли снаружи. Позиция запоминается без визуальной отметки: список
	 * ещё не в навигации.
	 */
	protected override onEngineBound(engine: TCollectionEngine<any, any>): void {
		const selected = engine.extensions.selection.selected as IControl[]

		if (selected.length > 0) this.trackHighlight(selected[0].uid)

		engine.extensions.selection.events.on('change:selection', (items: IControl[]) => {
			if (items.length > 0) this.trackHighlight(items[0].uid)
		})
	}

	protected override onKeyDown(e: KeyboardEvent): void {
		if (!this._engine) return
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

	/**
	 * Выбор идёт через расширение списка, тем же путём, что клик по строке:
	 * выключенному элементу оно отказывает. `selection.toggle` выключенность
	 * не проверяет — выбрать выключенный элемент из кода вправе приложение.
	 */
	private _toggleHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) this._engine?.extensions.list.chooseItem(item)
	}
}
