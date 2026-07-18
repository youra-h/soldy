/**
 * @soldy/setup — providers/core/instance.ts
 *
 * Универсальный IAccessorProvider для любого core-компонента.
 * Работает с любым набором контрибуций одного инстанса.
 * Использует triggers из IContractProp — не знает о конкретных компонентах.
 */

import type { IAccessor, IAccessorProvider, IEventProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { IComponent, TEventHandler } from '@soldy/core'

export class TInstanceAccessorProvider implements IAccessorProvider, IEventProvider {
	constructor(
		private instance: IComponent,
		private ownerIds: symbol[],
	) {}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		const events = this.instance.events as any

		events.on(event, handler)

		return () => events.off(event, handler)
	}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (!this.ownerIds.includes(prop.ownerId)) return undefined

		const triggers = prop.triggers
		if (!triggers?.length) return undefined

		const { instance } = this
		const events = instance.events as any

		return {
			get: () => (instance as any)[prop.name],
			...(prop.mutable
				? {
						set: (value: any) => {
							;(instance as any)[prop.name] = value
						},
					}
				: {}),
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
