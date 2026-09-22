import { TOverlayFocusPlugin } from '../../overlay/focus'
import { focusFirst, tabStops, tabStopsAfter } from '../../../utils'
import type { TPopoverFocusPluginEvents } from './types'

/**
 * TPopoverFocusPlugin — модель фокуса Popover, немодального диалога APG.
 *
 * Всё, что у оверлеев общее — запомнить, откуда открыли, увести фокус в
 * панель кадром позже, вернуть его при закрытии (кроме закрытия нажатием
 * мимо, о котором сообщает `TDismissPlugin`), закрыть по Escape и погасить
 * его `preventDefault`, — лежит в `TOverlayFocusPlugin`. Здесь остаётся то,
 * чем немодальный оверлей отличается от модального: Tab и запасной возврат
 * фокуса.
 *
 * **Tab** ведёт себя так, будто панель стоит в документе сразу за
 * триггером, хотя телепортирована в конец `body`:
 * - Tab с последней остановки корня при открытой панели — в панель;
 * - Tab с последней остановки панели — к первой остановке после корня, и
 *   поповер закрывается без возврата фокуса. Если после корня остановок нет —
 *   закрывается так же, а Tab не гасится;
 * - Shift+Tab с первой остановки панели или с неё самой — на триггер, панель
 *   остаётся открытой.
 *
 * **Возврат фокуса**, когда запомненный элемент пропал, — на первую остановку
 * корня, то есть на триггер: у немодального оверлея он всегда рядом.
 *
 * Поповер немодальный: ловушки фокуса, `aria-modal` и `inert` нет, страница
 * за панелью доступна.
 */
export class TPopoverFocusPlugin extends TOverlayFocusPlugin<TPopoverFocusPluginEvents> {
	/** Запомненный элемент пропал — фокус возвращается на триггер в корне. */
	protected override _returnCandidates(root: Element): readonly Element[] {
		return tabStops(root)
	}

	protected override _onTab(event: KeyboardEvent): void {
		const root = this._root
		const panel = this._panel
		const active = root?.ownerDocument.activeElement

		if (!root || !panel || !active) return

		if (panel.contains(active)) {
			if (event.shiftKey) {
				this._tabBackFromPanel(event, root, panel, active)
			} else {
				this._tabForwardFromPanel(event, root, panel, active)
			}

			return
		}

		if (!event.shiftKey && root.contains(active)) this._tabIntoPanel(event, root, panel, active)
	}

	/** Tab с последней остановки корня — в панель, как будто она стоит сразу за триггером. */
	private _tabIntoPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== tabStops(root).at(-1)) return

		if (focusFirst([...tabStops(panel), panel])) event.preventDefault()
	}

	/** Shift+Tab с первой остановки панели или с неё самой — на триггер; панель остаётся открытой. */
	private _tabBackFromPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== panel && active !== tabStops(panel)[0]) return

		if (focusFirst(tabStops(root).reverse())) event.preventDefault()
	}

	/**
	 * Tab с последней остановки панели — к первой остановке после корня.
	 * Поповер закрывается без возврата фокуса: фокус уходит дальше по
	 * странице. Остановок после корня нет — Tab не гасится, фокус уводит
	 * браузер.
	 */
	private _tabForwardFromPanel(
		event: KeyboardEvent,
		root: Element,
		panel: Element,
		active: Element,
	): void {
		if (active !== (tabStops(panel).at(-1) ?? panel)) return

		this._restore = false
		this._close()

		if (focusFirst(tabStopsAfter(root, panel))) event.preventDefault()
	}
}
