/**
 * @soldy/setup — providers/plugins/instance.ts
 *
 * IAccessorProvider для плагина TInstancePlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для свойств с ownerCtor === TInstancePlugin.
 */

import type { IAccessor, IAccessorProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { TInstancePlugin } from '@soldy/plugins'

export class TInstancePluginAccessorProvider implements IAccessorProvider {
	constructor(private plugin: TInstancePlugin) {}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.name !== 'instance') return undefined

		if (prop.name === 'instance') {
			const { plugin } = this

			return {
				get: () => plugin.instance,
				subscribe: (handler) => {
					const events = plugin.events as any

					events.on('ready', handler)
					events.on('removed', handler)

					return () => {
						events.off('ready', handler)
						events.off('removed', handler)
					}
				},
			}
		}

		return undefined
	}
}
