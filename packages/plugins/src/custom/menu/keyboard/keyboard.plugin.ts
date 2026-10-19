import type { IMenu } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TMenuNavigationPlugin } from '../navigation'
import type { TMenuKeyboardPluginEvents } from './types'

/**
 * TMenuKeyboardPlugin — клавиатура меню по паттерну APG Menu Button.
 *
 * Панель — общая с подменю (`TMenuNavigationPlugin`): фокус идёт за
 * подсветкой, ↑/↓, Home и End, набор по первым буквам. Своё у меню — корень,
 * в котором только триггер: ↓, Enter и пробел открывают меню и подсвечивают
 * первый пункт, ↑ — последний (APG). Клавиши гасятся `preventDefault`: иначе
 * Enter и пробел нажали бы кнопку-триггер, а клик по ней переключил бы меню
 * обратно. Это клавиши кнопки (`openOn: 'press'`); у контекстного меню в
 * корне область, и её клавиши — её: стрелки ходят по её строкам, Enter
 * нажимает её кнопки. Меню над ней открывает `contextmenu` — плагин
 * открытия. Какие клавиши корня слушаются, выбирает подписка на смену
 * способа, а не проверка в обработчике.
 *
 * Открытие на крайнем пункте (`openAt`) зовёт и плагин открытия: контекстное
 * меню, вызванное клавишей, открывается на первом пункте, как кнопка с
 * клавиатуры.
 */
export class TMenuKeyboardPlugin extends TMenuNavigationPlugin<TMenuKeyboardPluginEvents> {
	private _menu: IMenu | null = null
	/**
	 * Клавиши корня по способу открытия: у кнопки — открыть меню, у области
	 * контекстного меню — никаких, её клавиши принадлежат ей.
	 */
	private _rootKeys: ((e: KeyboardEvent) => void) | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._menu = ctx.getInstance<IMenu>() ?? null

		this._syncRootKeys()
		this._listenTo(this._menu?.events, 'change:openOn', () => this._syncRootKeys())
	}

	override destroy(): void {
		this._menu = null
		this._rootKeys = null

		super.destroy()
	}

	/** Клавиши корня — по способу открытия (`_rootKeys`). */
	protected override onKeyDown(e: KeyboardEvent): void {
		this._rootKeys?.(e)
	}

	/**
	 * Клавиши корня по способу открытия: у кнопки — свои, у области
	 * контекстного меню — никаких. Подписка на смену способа, а не проверка в
	 * обработчике.
	 */
	private _syncRootKeys(): void {
		this._rootKeys = this._menu?.openOn === 'press' ? this._onTriggerKeyDown : null
	}

	/** Клавиши кнопки-триггера: открыть меню на крайнем пункте. */
	private readonly _onTriggerKeyDown = (e: KeyboardEvent): void => {
		switch (e.key) {
			case 'ArrowDown':
			case 'Enter':
			case ' ':
				e.preventDefault()
				this.openAt('first')

				return

			case 'ArrowUp':
				e.preventDefault()
				this.openAt('last')

				return
		}
	}
}
