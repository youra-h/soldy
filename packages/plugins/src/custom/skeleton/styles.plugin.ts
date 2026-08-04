import type { ISkeleton } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils/toCssValue'

/**
 * Плагин для управления стилями скелетона.
 * Вычисляет ширину и высоту placeholder'а на основе size или кастомных width/height.
 */
export class TSkeletonStylesPlugin extends TBasePlugin {
	static readonly namespace = Symbol('skeleton-styles')

	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const skeleton = ctx.getInstance<ISkeleton>()
		if (!skeleton) return

		this._bindDimension(skeleton, 'width')
		this._bindDimension(skeleton, 'height')
	}

	private _bindDimension(skeleton: ISkeleton, prop: 'width' | 'height'): void {
		if (!!skeleton[prop]) {
			this._styles[prop] = toCssValue(skeleton[prop])
		}

		skeleton.events.on(`change:${prop}` as any, (value: number | string) => {
			if (!value) {
				delete this._styles[prop]
			} else {
				this._styles[prop] = toCssValue(value)
			}
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
