import type { IIcon } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils/toCssValue'
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

		icon.events.on('change:width', (value) => {
			this._styles['width'] = value != null ? toCssValue(value) : ''
			;(this.events as any).emit('change:styles', { ...this._styles })
		})
		icon.events.on('change:height', (value) => {
			this._styles['height'] = value != null ? toCssValue(value) : ''
			;(this.events as any).emit('change:styles', { ...this._styles })
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
