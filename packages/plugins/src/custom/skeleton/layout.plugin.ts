import type { ISkeleton } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { sameStyles, toCssValue } from '../../utils'
import type { TSkeletonLayoutPluginEvents } from './types'

/**
 * Плагин для управления стилями скелетона.
 * Вычисляет ширину и высоту placeholder'а на основе size или кастомных width/height.
 *
 * Стили пересчитывает при установке, на смену ширины и высоты и при принятии
 * набора — смену размера до него подписка не застала. Формула одна на все
 * поводы: незаданный размер (пустая строка, `0`) — `auto`.
 */
export class TSkeletonLayoutPlugin extends TBasePlugin<any, TSkeletonLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}
	private _skeleton: ISkeleton | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const skeleton = ctx.getInstance<ISkeleton>()
		if (!skeleton) return

		this._skeleton = skeleton
		this._styles = this._stylesOf(skeleton)

		this._listenTo(skeleton.events, 'change:width', this._update)
		this._listenTo(skeleton.events, 'change:height', this._update)
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
		this._skeleton = null

		super.destroy()
	}

	private _stylesOf(skeleton: ISkeleton): Record<string, string | number> {
		return {
			width: toCssValue(skeleton.width || 'auto'),
			height: toCssValue(skeleton.height || 'auto'),
		}
	}

	/**
	 * Заменяет объект стилей целиком, а не мутирует на месте: геттер отдаёт
	 * ссылку наружу, и без смены идентичности UI не увидит изменения.
	 * `change:styles` — только когда стили сменились.
	 */
	private readonly _update = (): void => {
		const skeleton = this._skeleton

		if (!skeleton) return

		const styles = this._stylesOf(skeleton)

		if (sameStyles(styles, this._styles)) return

		this._styles = styles
		this.events.emit('change:styles', this._styles)
	}
}
