/**
 * @soldy/host — providers/elementPluginAccessorProvider.ts
 *
 * AccessorProvider для плагина TElementPlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для членов с ownerId = elementContributionId.
 */

import type { AccessorProvider, Accessor } from '../runtime/Accessor'
import type { ContractMember } from '../contract/types'
import { elementContributionId } from '../contributions/element.contribution'
import type { TElementPlugin } from '@soldy/plugins'

export class ElementPluginAccessorProvider implements AccessorProvider {
	constructor(private plugin: TElementPlugin) {}

	getAccessor(member: ContractMember): Accessor | undefined {
		if (member.ownerId !== elementContributionId) return undefined

		if (member.name === 'element') {
			const { plugin } = this

			return {
				get: () => plugin.element,
				set: (value: any) => {
					plugin.element = value
				},
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
