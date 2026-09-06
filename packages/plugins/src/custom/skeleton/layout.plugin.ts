import type { ISkeleton } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils/toCssValue'
import type { TSkeletonLayoutPluginEvents } from './types'

/**
 * Плагин для управления стилями скелетона.
 * Вычисляет ширину и высоту placeholder'а на основе size или кастомных width/height.
 */

export class TSkeletonLayoutPlugin extends TBasePlugin<any, TSkeletonLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const skeleton = ctx.getInstance<ISkeleton>()
		if (!skeleton) return

		this._bindDimension(skeleton, 'width')
		this._bindDimension(skeleton, 'height')
	}

	private _bindDimension(skeleton: ISkeleton, prop: 'width' | 'height'): void {
		this._styles = { ...this._styles, [prop]: toCssValue(skeleton[prop]) }

		skeleton.events.on(`change:${prop}` as any, (value: number | string) => {
			this._patch(prop, toCssValue(value || 'auto'))
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}

	/**
	 * Заменяет объект стилей целиком, а не мутирует на месте: геттер отдаёт
	 * ссылку наружу, и без смены идентичности UI не увидит изменения.
	 */
	private _patch(key: string, value: string | number): void {
		this._styles = { ...this._styles, [key]: value }
		;(this.events as any).emit('change:styles', this._styles)
	}
}
