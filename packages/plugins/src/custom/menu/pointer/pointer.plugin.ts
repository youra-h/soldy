import type { IMenu, TMenuOpenOn, TMenuPoint } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TMenuKeyboardPlugin } from '../keyboard'
import { TMenuContextStrategy, TMenuPressStrategy } from './strategies'
import type { IMenuOpenHost, IMenuOpenStrategy, TMenuOpenStrategyCtor } from './strategies'
import type { TMenuPointerPluginEvents } from './types'

/** Стратегия открытия на каждый способ: способ выбирает класс, а не ветку в обработчике. */
const OPEN_STRATEGIES: Readonly<Record<TMenuOpenOn, TMenuOpenStrategyCtor>> = {
	press: TMenuPressStrategy,
	contextmenu: TMenuContextStrategy,
}

/**
 * TMenuPointerPlugin — открытие меню указателем.
 *
 * Открытие — стратегия по способу владельца (`openOn`, `strategies/`): у
 * кнопки (`TMenuPressStrategy`) клик по корню переключает меню, у
 * контекстного меню (`TMenuContextStrategy`) `contextmenu` и долгое касание
 * над областью вызывают его у точки вызова (`point` владельца). Стратегию
 * выбирает подписка на `change:openOn`, а не проверка в обработчике, и
 * слушатели корня у каждого способа свои. Вызванное клавишей контекстное
 * меню открывается на первом пункте — через клавиатуру меню, как кнопка с
 * клавиатуры.
 *
 * Указатель в открытой панели — подсветка пунктов и подменю — у
 * `TMenuHoverPlugin`: он общий у меню и подменю, а способ открытия есть
 * только у меню.
 */
export class TMenuPointerPlugin
	extends TBasePlugin<any, TMenuPointerPluginEvents>
	implements IMenuOpenHost
{
	private _owner: IMenu | null = null
	private _keyboard: TMenuKeyboardPlugin | null = null
	/** Корень — под стратегию открытия. */
	private _root: Element | null = null
	/** Способ открытия на корне — по `openOn` владельца. */
	private _strategy: IMenuOpenStrategy | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<IMenu>() ?? null
		this._keyboard = ctx.get(TMenuKeyboardPlugin) ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => {
			this._root = element
			this._syncStrategy()
		})

		elementPlugin?.events.on('removed', () => {
			this._root = null
			this._syncStrategy()
		})

		this._listenTo(this._owner?.events, 'change:openOn', () => this._syncStrategy())
	}

	override destroy(): void {
		this._strategy?.destroy()
		this._strategy = null

		this._root = null
		this._owner = null
		this._keyboard = null

		super.destroy()
	}

	/** Открыто ли меню — для стратегий открытия. */
	get isOpen(): boolean {
		return this._owner?.open ?? false
	}

	/** Переключить меню — нажатие кнопки. */
	toggle(): void {
		const owner = this._owner

		if (owner) owner.open = !owner.open
	}

	/**
	 * Вызвать меню у точки окна, открытое — переставить к ней: точку отдаёт
	 * якорю панели разметка. Вызвали клавишей — меню открывается на первом
	 * пункте, как кнопка с клавиатуры, указателем — фокус на панели.
	 */
	invoke(point: TMenuPoint, byKeyboard: boolean): void {
		const owner = this._owner

		if (!owner) return

		owner.point = point

		if (byKeyboard && this._keyboard) {
			this._keyboard.openAt('first')
		} else {
			owner.open = true
		}
	}

	/** Закрыть меню. */
	close(): void {
		const owner = this._owner

		if (owner) owner.open = false
	}

	/** Стратегия открытия — по способу владельца, на объявленном корне. */
	private _syncStrategy(): void {
		this._strategy?.destroy()
		this._strategy = null

		const root = this._root
		const owner = this._owner

		if (!root || !owner) return

		this._strategy = new OPEN_STRATEGIES[owner.openOn](root, this)
	}
}
