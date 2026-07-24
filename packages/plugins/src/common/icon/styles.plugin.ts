import type { IIcon } from '@soldy/core'
import type { IPluginBundle } from '../../base/types'
import { TBasePlugin } from '../../base/plugin'
import { toCssValue } from '../../base/css-value'
import { TInstancePlugin } from '../instance'
import type { TIconStylesPluginEvents } from './types'

/**
 * Плагин для управления стилями иконки.
 */
export class TIconStylesPlugin extends TBasePlugin<TIconStylesPluginEvents> {
	static readonly key = Symbol('icon-styles')

	protected _styles: Record<string, string | number> = {}

	override install(bundle: IPluginBundle): void {
		const instancePlugin = bundle.get(TInstancePlugin) as TInstancePlugin<IIcon> | undefined

		instancePlugin?.events.on('ready', ({ instance }) => {
			;(instance as unknown as IIcon).events.on('change:width', (value) => {
				this._styles['width'] = value != null ? toCssValue(value) : ''
				;(this.events as any).emit('change:styles', { ...this._styles })
			})
			;(instance as unknown as IIcon).events.on('change:height', (value) => {
				this._styles['height'] = value != null ? toCssValue(value) : ''
				;(this.events as any).emit('change:styles', { ...this._styles })
			})
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}
