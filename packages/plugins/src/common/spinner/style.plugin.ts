import type { ISpinner } from '@soldy/core'
import type { IPluginBundle } from '../../base/types'
import { TBasePlugin } from '../../base/plugin'
import { toCssValue } from '../../base/css-value'
import { TInstancePlugin } from '../instance'
import type { TSpinnerStylePluginEvents } from './types'

/**
 * Плагин для управления стилями спиннера.
 */
export class TSpinnerStylePlugin extends TBasePlugin<TSpinnerStylePluginEvents> {
	static readonly key = 'spinner-style'

	protected _styles: Record<string, string | number> = {}

	override install(bundle: IPluginBundle): void {
		const instancePlugin = bundle.get(TInstancePlugin) as TInstancePlugin<ISpinner> | undefined

		instancePlugin?.events.on('ready', ({ instance }) => {
			;(instance as unknown as ISpinner).events.on('changeBorderWidth', (value) => {
				this._styles['--spinner-border-width'] = toCssValue(value)

				this.events.emit('changeStyles', { ...this._styles })
			})
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
