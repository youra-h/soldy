/**
 * @soldy/setup — providers/plugins/element.ts
 *
 * IAccessorProvider для плагина TElementPlugin.
 * Принимает готовый экземпляр плагина, реализует getAccessor() для свойств с ownerCtor === TElementPlugin.
 */

import type { TEventHandler } from '@soldy/core'
import type { IAccessor, IAccessorProvider, IEventProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { TElementPlugin } from '@soldy/plugins'

export class TElementPluginAccessorProvider implements IAccessorProvider, IEventProvider {
	constructor(private plugin: TElementPlugin) {}

	private get _eventPrefix(): string {
		return `${this.plugin.key.description}:`
	}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		if (!event.startsWith(this._eventPrefix)) return undefined

		const internalEvent = event.slice(this._eventPrefix.length)
		const events = this.plugin.events as any

		events.on(internalEvent, handler)

		return () => events.off(internalEvent, handler)
	}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.name !== 'element') return undefined

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
}
