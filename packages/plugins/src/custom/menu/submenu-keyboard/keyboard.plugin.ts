import type { IMenuSubmenu } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { rowIn } from '../../list/row'
import { TMenuNavigationPlugin } from '../navigation'
import type { TMenuSubmenuKeyboardPluginEvents } from './types'

/**
 * TMenuSubmenuKeyboardPlugin — клавиатура пункта с подменю: клавиши его
 * строки в меню над ним и его собственной панели (APG Menu).
 *
 * Панель — общая с меню (`TMenuNavigationPlugin`): фокус идёт за подсветкой,
 * ↑/↓ по кругу, Home и End, набор по первым буквам. Своё у подменю — две
 * границы уровня:
 *
 * - **открыть** — стрелка к концу строки (в RTL ←), Enter и пробел на строке
 *   пункта: подменю открывается на первом пункте, и фокус уходит на него.
 *   Строка лежит в корне пункта, поэтому клавиши слушает корень, — и только
 *   со строки: клавиши содержимого слотов строки им и принадлежат. Клавиша
 *   гасится: Enter и пробел иначе нажали бы строку, а клик открыл бы
 *   подменю ещё раз, без подсветки, — и меню над ним её не трогает
 *   (`defaultPrevented`): пробел подменю открывает и тогда, когда в меню над
 *   ним идёт набор по буквам;
 * - **закрыть** — стрелка к началу строки (в RTL →) в панели подменю: уровень
 *   закрывается, фокус возвращается на строку пункта (модель фокуса подменю).
 *   Escape делает то же — его ведёт модель фокуса, как у любого слоя.
 *
 * Сторона строки — по направлению письма: у строки — направление меню над
 * подменю, у панели — своё.
 *
 * Выключенный пункт подменю не открывает. Подсвеченным он не бывает, и
 * фокуса на его строке с клавиатуры нет, — проверка на случай фокуса, который
 * поставили кликом.
 */
export class TMenuSubmenuKeyboardPlugin extends TMenuNavigationPlugin<TMenuSubmenuKeyboardPluginEvents> {
	private _submenu: IMenuSubmenu | null = null
	/** Корень пункта — узел пункта в меню над подменю; строка лежит в нём. */
	private _root: Element | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._submenu = ctx.getInstance<IMenuSubmenu>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
		})
		elementPlugin?.events.on('removed', () => {
			this._root = null
		})
	}

	override destroy(): void {
		this._submenu = null
		this._root = null

		super.destroy()
	}

	/** Клавиши строки пункта: открыть подменю на первом пункте. */
	protected override onKeyDown(e: KeyboardEvent): void {
		const root = this._root

		if (!root || e.target !== rowIn(root) || this._submenu?.disabled) return

		if (e.key === 'Enter' || e.key === ' ' || e.key === this._toEnd(root)) {
			e.preventDefault()
			this.openAt('first')
		}
	}

	/** Стрелка к началу строки в панели — закрыть уровень. */
	protected override onPanelKey(e: KeyboardEvent): boolean {
		const submenu = this._submenu

		if (!submenu || e.key !== (this.isRtl() ? 'ArrowRight' : 'ArrowLeft')) return false

		submenu.open = false

		return true
	}

	/** Стрелка к концу строки — по направлению строки пункта. */
	private _toEnd(root: Element): string {
		return getComputedStyle(root).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
	}
}
