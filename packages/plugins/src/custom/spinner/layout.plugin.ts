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
 * Толщину плагин берёт у ядра итогом (`borderWidthResolved`), а не заданным
 * значением и не из события: `borderWidth` и `change:borderWidth` несут
 * толщину как задана, а `'auto'` — недопустимая толщина рамки. При `'auto'`
 * итог считает размер, поэтому толщину перечитывает и смена размера.
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
		this._styles = { [BORDER_WIDTH]: toCssValue(spinner.borderWidthResolved) }

		const update = () => this._update(spinner)

		this._listenTo(spinner.events, 'change:borderWidth', update)
		this._listenTo(spinner.events, 'change:size', update)
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/**
	 * Перечитывает толщину и сообщает о ней, только если она сменилась:
	 * размер меняет толщину лишь при `'auto'`, а `'auto'`, заменённое той же
	 * толщиной числом, — не смена.
	 *
	 * Объект стилей заменяется целиком, а не мутируется на месте: геттер
	 * отдаёт ссылку наружу, и без смены идентичности UI не увидит изменения.
	 */
	private _update(spinner: ISpinner): void {
		const value = toCssValue(spinner.borderWidthResolved)

		if (this._styles[BORDER_WIDTH] === value) return

		this._styles = { ...this._styles, [BORDER_WIDTH]: value }
		this.events.emit('change:styles', this._styles)
	}
}
