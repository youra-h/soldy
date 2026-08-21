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
	static readonly namespace = Symbol('layout')

	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const skeleton = ctx.getInstance<ISkeleton>()
		if (!skeleton) return

		this._bindDimension(skeleton, 'width')
		this._bindDimension(skeleton, 'height')
	}

	private _bindDimension(skeleton: ISkeleton, prop: 'width' | 'height'): void {
		const value = skeleton[prop] || 'auto'

		this._styles[prop] = toCssValue(skeleton[prop])

		skeleton.events.on(`change:${prop}` as any, (value: number | string) => {
			const newValue = value || 'auto'
			this._styles[prop] = toCssValue(newValue)
			;(this.events as any).emit('change:styles', { ...this._styles })
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
