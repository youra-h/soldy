import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { IComponentView } from '@soldy/core'

/**
 * TReadyPlugin — синхронизирует ready между DOM-элементом и инстансом.
 */
export class TReadyPlugin extends TBasePlugin {
	static readonly namespace = Symbol('ready')

	get namespace(): symbol {
		return TReadyPlugin.namespace
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const instance = ctx.getInstance<IComponentView>()

			if (instance) {
				instance.ready = true
			}
		})

		elementPlugin?.events.on('removed', () => {
			const instance = ctx.getInstance<IComponentView>()

			if (instance) {
				instance.ready = false
			}
		})
	}
}
