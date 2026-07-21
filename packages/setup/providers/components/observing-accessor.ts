/**
 * Универсальный IAccessorProvider для любого IComponent.
 * Перенесён из @soldy/provider: использует IComponent из @soldy/core.
 */

import type { IAccessor, IAccessorProvider, IEventProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { IComponent, TEventHandler } from '@soldy/core'

export class TObservingAccessorProvider implements IAccessorProvider, IEventProvider {
	constructor(private instance: IComponent) {}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		const events = this.instance.events as any

		events.on(event, handler)

		return () => events.off(event, handler)
	}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		const triggers = prop.triggers
		if (!triggers?.length) return undefined

		const { instance } = this
		const events = instance.events as any

		return {
			get: () => (instance as any)[prop.name],
			...(prop.protected
				? {}
				: {
						set: (value: any) => {
							;(instance as any)[prop.name] = value
						},
					}),
			subscribe: (handler) => {
				const unsubs = triggers.map((event) => {
					events.on(event, handler)
					return () => events.off(event, handler)
				})
				return () => unsubs.forEach((fn) => fn())
			},
		}
	}
}
