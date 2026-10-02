import type { ISpinner } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { sameStyles, toCssValue } from '../../utils'
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
	private _spinner: ISpinner | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const spinner = ctx.getInstance<ISpinner>()
		if (!spinner) return

		this._spinner = spinner

		// Толщина, с которой спиннер собрали, приходит в инстанс без события —
		// конструктором или готовым `ctrl`, — поэтому стартовые стили плагин
		// берёт у инстанса сам. Без эмита: подписчиков у плагина ещё нет, а
		// связка прочитает `styles` при подписке.
		this._styles = this._stylesOf(spinner)

		this._listenTo(spinner.events, 'change:borderWidth', this._update)
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/** Толщина, сменившаяся до принятия, подписка не застала — пересчитать. */
	override attach(): void {
		super.attach()

		this._update()
	}

	override destroy(): void {
		this._spinner = null

		super.destroy()
	}

	private _stylesOf(spinner: ISpinner): Record<string, string | number> {
		return { [BORDER_WIDTH]: toCssValue(spinner.borderWidth) }
	}

	/**
	 * Перечитывает толщину. На подписке сменилась ли она, решило ядро:
	 * `change:borderWidth` приходит только на смену итога. При принятии набора
	 * повода нет, поэтому `change:styles` — только когда стили сменились.
	 *
	 * Объект стилей заменяется целиком, а не мутируется на месте: геттер
	 * отдаёт ссылку наружу, и без смены идентичности UI не увидит изменения.
	 */
	private readonly _update = (): void => {
		const spinner = this._spinner

		if (!spinner) return

		const styles = this._stylesOf(spinner)

		if (sameStyles(styles, this._styles)) return

		this._styles = styles
		this.events.emit('change:styles', this._styles)
	}
}
