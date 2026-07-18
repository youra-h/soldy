/**
 * @soldy/host — providers/elementPluginAccessorProvider.ts
 *
 * AccessorProvider для плагина TElementPlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для членов с ownerId = elementContributionId.
 */

import type { TEventHandler } from '@soldy/core'
import type { Accessor } from '../runtime/Accessor'
import type { EventProvider } from '../runtime/EventProvider'
import type { ContractMember } from '../contract/types'
import type { TElementPlugin } from '@soldy/plugins'

export class ElementPluginAccessorProvider implements EventProvider {
	constructor(private plugin: TElementPlugin) {}

	private get _eventPrefix(): string {
		return `${this.plugin.key.description}:`
	}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		// 'element:ready' → plugin.events.on('ready', ...)
		if (!event.startsWith(this._eventPrefix)) return undefined

		const internalEvent = event.slice(this._eventPrefix.length)
		const events = this.plugin.events as any

		events.on(internalEvent, handler)

		return () => events.off(internalEvent, handler)
	}

	getAccessor(member: ContractMember): Accessor | undefined {
		if (member.ownerId !== this.plugin.key) return undefined

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
