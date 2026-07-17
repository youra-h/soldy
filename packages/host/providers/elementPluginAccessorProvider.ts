/**
 * @soldy/host — providers/elementPluginAccessorProvider.ts
 *
 * AccessorProvider для плагина TElementPlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для членов с ownerId = elementContributionId.
 */

import type { Accessor } from '../runtime/Accessor'
import type { RuntimeProvider } from '../runtime/AccessorProvider'
import type { ContractMember } from '../contract/types'
import { elementContributionId } from '../contributions/element.contribution'
import type { TElementPlugin } from '@soldy/plugins'

export class ElementPluginAccessorProvider implements RuntimeProvider {
	constructor(private plugin: TElementPlugin) {}

	subscribe(event: string, handler: (...args: any[]) => void): (() => void) | undefined {
		// element:ready → plugin.events.on('ready', ...)
		// element:removed → plugin.events.on('removed', ...)
		const internalEvent = event.replace(/^element:/, '')
		if (internalEvent === event) return undefined

		const events = this.plugin.events as any
		events.on(internalEvent, handler)
		return () => events.off(internalEvent, handler)
	}

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
