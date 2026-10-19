import type { IMenu } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TPopoverFocusPlugin } from '../../popover/focus'
import type { IOverlayOpenOptions } from '../../overlay/types'
import { TMenuKeyboardPlugin } from '../keyboard'
// Не из бочки `../submenu-focus`: подписка на Tab подменю — внутренний
// инструмент двух моделей фокуса меню, а не API пакета
import { listenSubmenuTabs } from '../submenu-focus/focus.plugin'
import { focusFirst, tabStopsAfter } from '../../../utils'

/** Возвращать фокус некуда. */
const NOWHERE = (): readonly Element[] => []

/**
 * TMenuFocusPlugin — модель фокуса меню у кнопки (APG Menu Button) и
 * контекстного меню.
 *
 * Немодальная, как у Popover, и от него наследует всё общее: запомнить,
 * откуда открыли, увести фокус в панель кадром позже, вернуть его при
 * закрытии, закрыться по Escape, не возвращать фокус после нажатия и фокуса
 * мимо, а запасной возврат — на триггер в корне. Поэтому Escape и нажатие
 * пункта возвращают фокус на триггер, а нажатие мимо — нет: пользователь уже
 * там, куда нажал.
 *
 * Своё у меню — три вещи:
 *
 * - **куда при открытии.** Фокус в меню идёт за подсветкой
 *   (`TMenuKeyboardPlugin`): открыли клавишей — подсвечен крайний пункт, и
 *   фокус встаёт на его строку; открыли кликом — подсветки нет, фокус на самой
 *   панели (`tabindex="-1"`), и первая стрелка подсветит первый пункт. Первая
 *   остановка Tab панели не годится: у пунктов её нет вовсе. У контекстного
 *   меню так же: клавиша контекстного меню — первый пункт, правая кнопка и
 *   касание — панель;
 * - **Tab.** Остановок Tab в меню нет, и Tab из него закрывает меню (APG): Tab
 *   ведёт к первой остановке после корня — будто панель стоит в документе
 *   сразу за триггером — и фокус не возвращает; остановок после корня нет —
 *   Tab не гасится, фокус уводит браузер. Shift+Tab закрывает с возвратом:
 *   предыдущая остановка перед панелью — сам триггер. Tab в подменю — так
 *   же: о нём сообщает модель фокуса подменю (`tab`), и меню закрывается
 *   целиком, со всеми подменю;
 * - **куда вернуть фокус, когда возвращать некуда** — фокус был на `body`.
 *   Запасной возврат Popover — на кнопку в корне — годится кнопке. У
 *   контекстного меню в корне область, а она бывает нефокусируемой, и её
 *   первая остановка Tab — не то место, откуда меню вызвали: фокус не
 *   возвращается никуда. Запасной возврат выбирает подписка на смену способа
 *   открытия, а не проверка при закрытии.
 */
export class TMenuFocusPlugin extends TPopoverFocusPlugin {
	private _owner: IMenu | null = null
	private _keyboard: TMenuKeyboardPlugin | null = null
	/** Запасной возврат фокуса — по способу открытия (`openOn`). */
	private _fallback: (root: Element) => readonly Element[] = NOWHERE

	override install(ctx: IPluginContext, options?: IOverlayOpenOptions): void {
		super.install(ctx, options)

		this._owner = ctx.getInstance<IMenu>() ?? null
		this._keyboard = ctx.get(TMenuKeyboardPlugin) ?? null

		this._syncFallback()
		this._listenTo(this._owner?.events, 'change:openOn', () => this._syncFallback())

		// Tab в подменю — Tab из меню: подменю корня меню не знают
		listenSubmenuTabs(ctx, (event) => this._leave(event))
	}

	override destroy(): void {
		this._owner = null
		this._keyboard = null

		super.destroy()
	}

	/** Фокус при открытии — строке подсвеченного пункта, без подсветки — панели. */
	protected override _focusCandidates(panel: Element): readonly Element[] {
		const row = this._keyboard?.highlightedRow

		return row ? [row, panel] : [panel]
	}

	/** Запомненного элемента нет — у кнопки на неё, у области никуда. */
	protected override _returnCandidates(root: Element): readonly Element[] {
		return this._fallback(root)
	}

	protected override _onTab(event: KeyboardEvent): void {
		const root = this._root
		const panel = this._panel
		const active = root?.ownerDocument.activeElement

		// Tab с триггера уводит фокус мимо панели сам: уход фокуса закрывает меню
		if (!root || !panel || !active || !panel.contains(active)) return

		this._leave(event)
	}

	/**
	 * Tab из меню — из его панели или из подменю: Shift+Tab закрывает с
	 * возвратом на триггер, Tab — без возврата, к остановке за корнем.
	 */
	private _leave(event: KeyboardEvent): void {
		const root = this._root
		// Панель — до закрытия: закрытие снимает слушатели вместе с ней
		const panel = this._panel

		if (!root || !panel) return

		if (event.shiftKey) {
			this._close()
			event.preventDefault()

			return
		}

		this._restore = false
		this._close()

		if (focusFirst(tabStopsAfter(root, panel))) event.preventDefault()
	}

	/** Запасной возврат: у области — никуда, у кнопки — остановки корня, как у Popover. */
	private _syncFallback(): void {
		this._fallback =
			this._owner?.openOn === 'contextmenu'
				? NOWHERE
				: (root) => super._returnCandidates(root)
	}
}
