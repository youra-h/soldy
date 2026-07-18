/**
 * @soldy/provider — runtime/accessor-provider.class.ts
 *
 * Универсальный IAccessorProvider для любого IComponent.
 * Использует triggers из IContractProp для подписки на изменения.
 * Не знает о конкретных компонентах или контрибуциях.
 */

import type { IAccessor, IAccessorProvider, IEventProvider } from './types'
import type { IContractProp } from '../contract/types'
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
