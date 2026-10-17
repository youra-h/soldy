import type { IPluginContext } from '../../../base'
import { TPopoverFocusPlugin } from '../../popover/focus'
import type { IOverlayOpenOptions } from '../../overlay/types'
import { TMenuKeyboardPlugin } from '../keyboard'
import { focusFirst, tabStopsAfter } from '../../../utils'

/**
 * TMenuFocusPlugin — модель фокуса меню у кнопки (APG Menu Button).
 *
 * Немодальная, как у Popover, и от него наследует всё общее: запомнить,
 * откуда открыли, увести фокус в панель кадром позже, вернуть его при
 * закрытии, закрыться по Escape, не возвращать фокус после нажатия и фокуса
 * мимо, а запасной возврат — на триггер в корне. Поэтому Escape и нажатие
 * пункта возвращают фокус на триггер, а нажатие мимо — нет: пользователь уже
 * там, куда нажал.
 *
 * Своё у меню — две вещи:
 *
 * - **куда при открытии.** Фокус в меню идёт за подсветкой
 *   (`TMenuKeyboardPlugin`): открыли клавишей — подсвечен крайний пункт, и
 *   фокус встаёт на его строку; открыли кликом — подсветки нет, фокус на самой
 *   панели (`tabindex="-1"`), и первая стрелка подсветит первый пункт. Первая
 *   остановка Tab панели не годится: у пунктов её нет вовсе;
 * - **Tab.** Остановок Tab в меню нет, и Tab из него закрывает меню (APG): Tab
 *   ведёт к первой остановке после корня — будто панель стоит в документе
 *   сразу за триггером — и фокус не возвращает; остановок после корня нет —
 *   Tab не гасится, фокус уводит браузер. Shift+Tab закрывает с возвратом:
 *   предыдущая остановка перед панелью — сам триггер.
 */
export class TMenuFocusPlugin extends TPopoverFocusPlugin {
	private _keyboard: TMenuKeyboardPlugin | null = null

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this._keyboard = ctx.get(TMenuKeyboardPlugin) ?? null
	}

	override destroy(): void {
		this._keyboard = null

		super.destroy()
	}

	/** Фокус при открытии — строке подсвеченного пункта, без подсветки — панели. */
	protected override _focusCandidates(panel: Element): readonly Element[] {
		const row = this._keyboard?.highlightedRow

		return row ? [row, panel] : [panel]
	}

	protected override _onTab(event: KeyboardEvent): void {
		const root = this._root
		const panel = this._panel
		const active = root?.ownerDocument.activeElement

		// Tab с триггера уводит фокус мимо панели сам: уход фокуса закрывает меню
		if (!root || !panel || !active || !panel.contains(active)) return

		if (event.shiftKey) {
			this._close()
			event.preventDefault()

			return
		}

		this._restore = false
		this._close()

		if (focusFirst(tabStopsAfter(root, panel))) event.preventDefault()
	}
}
