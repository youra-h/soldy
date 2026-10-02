import type { IIcon } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { sameStyles, toCssValue } from '../../utils'
import type { TIconLayoutPluginEvents } from './types'

/**
 * Плагин для управления стилями иконки.
 */
export class TIconLayoutPlugin extends TBasePlugin<any, TIconLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}
	private _icon: IIcon | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const icon = ctx.getInstance<IIcon>()
		if (!icon) return

		this._icon = icon

		// Размер, с которым иконку собрали, приходит в инстанс без события —
		// конструктором или готовым `ctrl`, — поэтому стартовые стили плагин
		// берёт у инстанса сам. Без эмита: подписчиков у плагина ещё нет, а
		// связка прочитает `styles` при подписке.
		this._styles = this._stylesOf(icon)

		this._listenTo(icon.events, 'change:width', this._update)
		this._listenTo(icon.events, 'change:height', this._update)
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/** Размер, сменившийся до принятия, подписка не застала — пересчитать. */
	override attach(): void {
		super.attach()

		this._update()
	}

	override destroy(): void {
		this._icon = null

		super.destroy()
	}

	private _stylesOf(icon: IIcon): Record<string, string | number> {
		return { width: this._toCss(icon.width), height: this._toCss(icon.height) }
	}

	/**
	 * Размер → значение инлайнового стиля. Незаданный размер даёт пустую
	 * строку: она снимает стиль, и размер иконки снова задаёт `size`.
	 */
	private _toCss(value: number | string | undefined): string {
		return value != null ? toCssValue(value) : ''
	}

	/**
	 * Перечитывает размер. Объект стилей заменяется целиком, а не мутируется
	 * на месте: геттер отдаёт ссылку наружу, и без смены идентичности UI не
	 * увидит изменения. `change:styles` — только когда стили сменились.
	 */
	private readonly _update = (): void => {
		const icon = this._icon

		if (!icon) return

		const styles = this._stylesOf(icon)

		if (sameStyles(styles, this._styles)) return

		this._styles = styles
		this.events.emit('change:styles', this._styles)
	}
}
