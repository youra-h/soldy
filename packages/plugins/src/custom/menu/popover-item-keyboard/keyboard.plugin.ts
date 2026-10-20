import type { IMenuPopoverItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { rowIn } from '../../list/row'
import { TMenuPopoverItemFocusPlugin } from '../popover-item-focus'
import type { IDomEventTarget } from '../../../utils'
import type { TMenuPopoverItemKeyboardPluginEvents } from './types'

/**
 * TMenuPopoverItemKeyboardPlugin — клавиатура строки пункта меню с панелью
 * (`Menu.PopoverItem`, APG Menu: пункт со всплывающим окном).
 *
 * Стрелка к концу строки (в RTL ←) открывает панель, как у подменю, и
 * гасится: меню над пунктом погашенную клавишу не трогает
 * (`TMenuNavigationPlugin`). Фокус в панель уводит модель фокуса пункта — и
 * после клавиши, и после клика. Панель уже открыта — её открыл указатель, и
 * фокус остался на строке, — та же стрелка ведёт фокус в неё: модель фокуса
 * пункта, взятая при установке (`focusPanel`). Так в открытую наведением
 * панель с клавиатуры ведёт не только Tab, но и стрелка, как в подменю.
 * Enter и пробел своих правил не требуют: строка — `Button` на `div`, и клик
 * из них делает её `TActionPlugin`, а клик строки открывает панель —
 * открытую не закрывает и фокус не двигает.
 *
 * Строка лежит в корне пункта, поэтому клавиши слушает корень, — и только со
 * строки: клавиши содержимого слотов строки им и принадлежат. Сторона строки
 * — по направлению письма меню, в котором стоит пункт.
 *
 * Выключенный пункт панель не открывает. Подсвеченным он не бывает, и фокуса
 * на его строке с клавиатуры нет, — проверка на случай фокуса, который
 * поставили кликом.
 */
export class TMenuPopoverItemKeyboardPlugin extends TBasePlugin<
	any,
	TMenuPopoverItemKeyboardPluginEvents
> {
	private _item: IMenuPopoverItem | null = null
	/** Модель фокуса пункта: ведёт фокус в уже открытую панель. */
	private _focus: TMenuPopoverItemFocusPlugin | null = null
	/** Корень пункта — узел пункта в меню; строка лежит в нём. */
	private _root: Element | null = null
	/** Тот же корень — под слушатель клавиш. */
	private _target: IDomEventTarget | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._item = ctx.getInstance<IMenuPopoverItem>() ?? null
		this._focus = ctx.get(TMenuPopoverItemFocusPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._listen(element))
		elementPlugin?.events.on('removed', () => this._unlisten())
	}

	override destroy(): void {
		this._unlisten()
		this._item = null
		this._focus = null

		super.destroy()
	}

	private _listen(element: Element): void {
		this._unlisten()

		const target: IDomEventTarget = element

		this._root = element
		this._target = target
		target.addEventListener('keydown', this._onKeyDown)
	}

	private _unlisten(): void {
		this._target?.removeEventListener('keydown', this._onKeyDown)
		this._target = null
		this._root = null
	}

	/** Стрелка к концу строки на строке пункта — открыть панель, а открытую — фокус в неё. */
	private readonly _onKeyDown = (e: KeyboardEvent): void => {
		const root = this._root
		const item = this._item

		if (!root || !item || item.disabled || e.defaultPrevented) return

		if (e.target !== rowIn(root) || e.key !== this._toEnd(root)) return

		e.preventDefault()

		if (item.open) {
			this._focus?.focusPanel()
		} else {
			item.open = true
		}
	}

	/** Стрелка к концу строки — по направлению строки пункта. */
	private _toEnd(root: Element): string {
		return getComputedStyle(root).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
	}
}
