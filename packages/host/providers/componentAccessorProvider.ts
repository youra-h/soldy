/**
 * @soldy/host — providers/componentAccessorProvider.ts
 *
 * IAccessorProvider для core-компонента TComponent / TComponentView.
 * Принимает готовый экземпляр, реализует getAccessor() для членов с ownerId = componentContributionId.
 */

import type { IAccessor, IEventProvider } from '../runtime/types'
import type { ContractMember } from '../contract/types'
import { componentContributionId } from '../contributions/component.contribution'
import type { IComponent, TEventHandler } from '@soldy/core'

const triggerMap: Record<string, string[]> = {
	rendered: ['change:rendered'],
	visible: ['change:visible'],
	present: ['change:rendered', 'change:visible'],
	tag: ['change:tag'],
	classes: ['change:classes'],
}

export class ComponentAccessorProvider implements IEventProvider {
	constructor(private instance: IComponent) {}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		const events = this.instance.events as any

		events.on(event, handler)

		return () => events.off(event, handler)
	}

	getAccessor(member: ContractMember): IAccessor | undefined {
		if (member.ownerId !== componentContributionId) return undefined

		const { instance } = this
		const events = instance.events as any

		const triggers = triggerMap[member.name]
		if (!triggers) return undefined

		const accessor: IAccessor = {
			get: () => (instance as any)[member.name],
			...(member.mutable
				? {
						set: (value: any) => {
							;(instance as any)[member.name] = value
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
