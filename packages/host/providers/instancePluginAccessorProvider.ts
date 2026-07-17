/**
 * @soldy/host — providers/instancePluginAccessorProvider.ts
 *
 * AccessorProvider для плагина TInstancePlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для членов с ownerId = instanceContributionId.
 */

import type { AccessorProvider, Accessor } from '../runtime/Accessor'
import type { ContractMember } from '../contract/types'
import { instanceContributionId } from '../contributions/instance.contribution'
import type { TInstancePlugin } from '@soldy/plugins'

export class InstancePluginAccessorProvider implements AccessorProvider {
	constructor(private plugin: TInstancePlugin) {}

	getAccessor(member: ContractMember): Accessor | undefined {
		if (member.ownerId !== instanceContributionId) return undefined

		if (member.name === 'instance') {
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
