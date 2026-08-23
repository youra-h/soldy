import type { ISpinner } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { toCssValue } from '../../utils/toCssValue'
import type { TSpinnerLayoutPluginEvents } from './types'

/**
 * Плагин для управления стилями спиннера.
 */
export class TSpinnerLayoutPlugin extends TBasePlugin<any, TSpinnerLayoutPluginEvents> {
	private _styles: Record<string, string | number> = {}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const spinner = ctx.getInstance<ISpinner>()
		if (!spinner) return

		spinner.events.on('change:borderWidth', (value) => {
			this._styles['--spinner-border-width'] = toCssValue(value)
			this.events.emit('change:styles', { ...this._styles })
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
