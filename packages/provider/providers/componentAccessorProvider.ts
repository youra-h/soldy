/**
 * @soldy/provider — providers/componentAccessorProvider.ts
 *
 * IAccessorProvider для core-компонента TComponent / TComponentView.
 * Принимает готовый экземпляр, реализует getAccessor() для свойств с ownerId = componentContributionId.
 */

import type { IAccessor, IEventProvider } from '../runtime'
import type { IContractProp } from '../contract'
import { componentContributionId } from '../contributions/component.contribution'
import type { IComponent, TEventHandler } from '@soldy/core'

const triggerMap: Record<string, string[]> = {
	rendered: ['change:rendered'],
	visible: ['change:visible'],
	present: ['change:rendered', 'change:visible'],
	tag: ['change:tag'],
	classes: ['change:classes'],
}

export class TComponentAccessorProvider implements IEventProvider {
	constructor(private instance: IComponent) {}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		const events = this.instance.events as any

		events.on(event, handler)

		return () => events.off(event, handler)
	}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.ownerId !== componentContributionId) return undefined

		const { instance } = this
		const events = instance.events as any

		const triggers = triggerMap[prop.name]
		if (!triggers) return undefined

		const accessor: IAccessor = {
			get: () => (instance as any)[prop.name],
			...(prop.mutable
				? {
						set: (value: any) => {
							;(instance as any)[prop.name] = value
						},
					}
				: {}),
			subscribe: (handler) => {
				const unsubs = triggers.map((event: string) => {
					events.on(event, handler)
					return () => events.off(event, handler)
				})
				return () => unsubs.forEach((fn: () => void) => fn())
			},
		}

		return accessor
	}
}
