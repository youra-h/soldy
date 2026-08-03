import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { IComponentView } from '@soldy/core'

/**
 * Плагин-мост для синхронизации состояния ready между элементом и инстансом компонента.
 * Устанавливает ready в true, когда элемент готов, и в false, когда элемент удаляется.
 * Позволяет компоненту знать, когда он готов к взаимодействию с DOM.
 */
export class TReadyPlugin extends TBasePlugin {
	static readonly namespace = Symbol('ready')

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
