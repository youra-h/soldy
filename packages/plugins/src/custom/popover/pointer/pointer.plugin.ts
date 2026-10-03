import type { IPopover } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TDismissPlugin } from '../../dismiss'
import type { IDomEventTarget } from '../../../utils'
import type { TPopoverPointerPluginEvents } from './types'

/**
 * TPopoverPointerPlugin — клик по триггеру Popover переключает панель.
 *
 * Слушает корень: в нём лежит только триггер (слот `trigger`), поэтому клик
 * по корню — это клик по триггеру, чем бы потребитель его ни нарисовал. Клик
 * из Enter и пробела на `<button>` браузер делает сам, так что клавиатура
 * триггера приходит сюда тем же путём.
 *
 * По открытому триггеру клик закрывает панель без мигания: корень — внутри
 * владельца, и `pointerdown` перед кликом `TDismissPlugin` мимо не считает.
 * Будь триггер снаружи, нажатие закрыло бы панель, а клик открыл бы снова.
 *
 * Панель внутри контейнера (`contained`) не телепортирована и лежит в самом
 * корне: нажатие в ней всплывает до корня, но это не нажатие по триггеру.
 * Панель плагин узнаёт у `TDismissPlugin`, по пометке владельцем.
 *
 * Внутри ли панели нажатие, решает путь события, а не цель: нажатие может
 * сменить содержимое панели (выбор года в календаре пересобирает список под
 * месяцы), и фреймворк перерисует его между обработчиками того же клика. До
 * корня клик дойдёт с целью, которой в панели уже нет, а путь собран при
 * отправке и панель в нём остаётся.
 */
export class TPopoverPointerPlugin extends TBasePlugin<any, TPopoverPointerPluginEvents> {
	private _owner: IPopover | null = null
	private _dismiss: TDismissPlugin | null = null
	/** Узел нужен только под слушатель клика — отсюда и тип. */
	private _element: IDomEventTarget | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IPopover>()
		this._dismiss = ctx.get(TDismissPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._element = element
			this._element.addEventListener('click', this._onClick)
		})

		elementPlugin?.events.on('removed', () => {
			this._unlisten()
			this._element = null
		})
	}

	override destroy(): void {
		this._unlisten()

		this._element = null
		this._owner = null
		this._dismiss = null

		super.destroy()
	}

	private _unlisten(): void {
		this._element?.removeEventListener('click', this._onClick)
	}

	private readonly _onClick = (event: MouseEvent): void => {
		const owner = this._owner
		const panel = this._dismiss?.findPanel()

		if (!owner) return
		if (panel && event.composedPath().includes(panel)) return

		owner.open = !owner.open
	}
}
