/**
 * @soldy/host — providers/instancePluginAccessorProvider.ts
 *
 * IAccessorProvider для плагина TInstancePlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для членов с ownerId = instanceContributionId.
 */

import type { IAccessor, IAccessorProvider } from '../runtime'
import type { IContractProp } from '../contract'
import type { TInstancePlugin } from '@soldy/plugins'

export class TInstancePluginAccessorProvider implements IAccessorProvider {
	constructor(private plugin: TInstancePlugin) {}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.ownerId !== this.plugin.key) return undefined

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
