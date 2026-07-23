import type { ISpinner } from '@soldy/core'
import type { IPluginBundle } from '../../base/types'
import { TBasePlugin } from '../../base/plugin'
import { toCssValue } from '../../base/css-value'
import { TInstancePlugin } from '../instance'
import type { TSpinnerStylesPluginEvents } from './types'

/**
 * Плагин для управления стилями спиннера.
 */
export class TSpinnerStylesPlugin extends TBasePlugin<TSpinnerStylesPluginEvents> {
	static readonly key = Symbol('spinner-styles')

	protected _styles: Record<string, string | number> = {}

	override install(bundle: IPluginBundle): void {
		const instancePlugin = bundle.get(TInstancePlugin) as TInstancePlugin<ISpinner> | undefined

		instancePlugin?.events.on('ready', ({ instance }) => {
			;(instance as unknown as ISpinner).events.on('change:borderWidth', (value) => {
				this._styles['--spinner-border-width'] = toCssValue(value)

				this.events.emit('change:styles', { ...this._styles })
			})
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
