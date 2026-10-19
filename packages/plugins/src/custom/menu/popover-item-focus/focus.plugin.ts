import { TPopoverFocusPlugin } from '../../popover/focus'
import { rowIn } from '../../list/row'
import { holdsFocus } from '../nested-layer'
import type { TMenuPopoverItemFocusPluginEvents } from './types'

/**
 * TMenuPopoverItemFocusPlugin — модель фокуса пункта меню с панелью
 * (`Menu.PopoverItem`): панель — немодальный диалог у строки пункта.
 *
 * Немодальная, как у Popover, и от него наследует всё общее: запомнить,
 * откуда открыли, кадром позже увести фокус на первую остановку панели (её
 * нет — на саму панель), вернуть его при закрытии, закрыться по Escape и не
 * возвращать фокус после нажатия и фокуса мимо. Tab ходит по тем же
 * правилам — будто панель стоит в документе сразу за триггером. Своё у пункта
 * — три вещи:
 *
 * - **триггер — строка пункта.** Её открывают нажатием, клавишами и
 *   указателем, и фокус она держит сама (`tabindex="-1"` пишет коллекция), но
 *   остановки Tab у неё нет — у меню их нет вовсе. Поэтому остановки триггера
 *   здесь — сама строка: Tab с неё у открытой панели ведёт в панель,
 *   Shift+Tab с первой остановки панели — на неё, панель открыта, а Escape в
 *   панели возвращает фокус на неё;
 * - **Tab с последней остановки панели** закрывает все меню (APG) и ведёт к
 *   остановке за корнем меню. Корня меню пункт не знает, поэтому сообщает о
 *   Tab меню над собой (`tab`), а то — дальше, до корня (`TMenuFocusPlugin`),
 *   который закрывается и ведёт фокус, как Tab из своей панели. Фокус пункт
 *   после этого не возвращает: он уходит за меню;
 * - **возвращать ли фокус.** Только пока фокус в пункте или нигде
 *   (`holdsFocus`): панель, закрытая вместе с меню, не тянет его на строку
 *   спрятанной панели — меню уже вернуло его на триггер.
 */
export class TMenuPopoverItemFocusPlugin extends TPopoverFocusPlugin<TMenuPopoverItemFocusPluginEvents> {
	/** Триггер — строка пункта: остановки Tab у неё нет, и среди остановок корня её не найти. */
	protected override _triggerStops(root: Element): Element[] {
		const row = rowIn(root)

		return row ? [row] : []
	}

	/** Tab из панели наружу — меню над пунктом: куда вести фокус, решает корень. */
	protected override _tabOutOfPanel(event: KeyboardEvent): void {
		this._restore = false
		this.events.emit('tab', event)
	}

	/** Возвращать фокус, только пока он в пункте или нигде. */
	protected override _returnsFocus(root: Element): boolean {
		return holdsFocus(root, this._dismiss)
	}
}
