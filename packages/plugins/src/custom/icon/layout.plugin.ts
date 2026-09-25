import type { IIcon } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils'
import type { TIconLayoutPluginEvents } from './types'

/**
 * Плагин для управления стилями иконки.
 */
export class TIconLayoutPlugin extends TBasePlugin<any, TIconLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const icon = ctx.getInstance<IIcon>()
		if (!icon) return

		// Размер, с которым иконку собрали, приходит в инстанс без события —
		// конструктором или готовым `ctrl`, — поэтому стартовые стили плагин
		// берёт у инстанса сам. Без эмита: подписчиков у плагина ещё нет, а
		// связка прочитает `styles` при подписке.
		this._styles = {
			width: this._toCss(icon.width),
			height: this._toCss(icon.height),
		}

		this._listenTo(icon.events, 'change:width', (value) => {
			this._patch('width', this._toCss(value))
		})
		this._listenTo(icon.events, 'change:height', (value) => {
			this._patch('height', this._toCss(value))
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/**
	 * Размер → значение инлайнового стиля. Незаданный размер даёт пустую
	 * строку: она снимает стиль, и размер иконки снова задаёт `size`.
	 */
	private _toCss(value: number | string | undefined): string {
		return value != null ? toCssValue(value) : ''
	}

	/**
	 * Заменяет объект стилей целиком, а не мутирует на месте: геттер отдаёт
	 * ссылку наружу, и без смены идентичности UI не увидит изменения.
	 */
	private _patch(key: string, value: string | number): void {
		this._styles = { ...this._styles, [key]: value }
		this.events.emit('change:styles', this._styles)
	}
}
