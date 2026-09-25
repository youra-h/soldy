import type { ISpinner } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils'
import type { TSpinnerLayoutPluginEvents } from './types'

/** Пользовательское свойство, из которого тема берёт толщину кольца. */
const BORDER_WIDTH = '--spinner-border-width'

/**
 * Плагин для управления стилями спиннера: толщина кольца —
 * пользовательским свойством `--spinner-border-width`.
 *
 * Толщину плагин читает геттером `borderWidth` — итог: при `'auto'` ядро
 * считает её по размеру. О смене итога ядро сообщает одним событием
 * `change:borderWidth` — и от записи толщины, и от размера при `'auto'`, —
 * поэтому своей подписки на размер у плагина нет.
 */
export class TSpinnerLayoutPlugin extends TBasePlugin<any, TSpinnerLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const spinner = ctx.getInstance<ISpinner>()
		if (!spinner) return

		// Толщина, с которой спиннер собрали, приходит в инстанс без события —
		// конструктором или готовым `ctrl`, — поэтому стартовые стили плагин
		// берёт у инстанса сам. Без эмита: подписчиков у плагина ещё нет, а
		// связка прочитает `styles` при подписке.
		this._styles = { [BORDER_WIDTH]: toCssValue(spinner.borderWidth) }

		this._listenTo(spinner.events, 'change:borderWidth', () => this._update(spinner))
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/**
	 * Перечитывает толщину. Сменилась ли она, решило ядро: `change:borderWidth`
	 * приходит только на смену итога.
	 *
	 * Объект стилей заменяется целиком, а не мутируется на месте: геттер
	 * отдаёт ссылку наружу, и без смены идентичности UI не увидит изменения.
	 */
	private _update(spinner: ISpinner): void {
		this._styles = { ...this._styles, [BORDER_WIDTH]: toCssValue(spinner.borderWidth) }
		this.events.emit('change:styles', this._styles)
	}
}
