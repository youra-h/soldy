/**
 * @soldy/host — providers/componentAccessorProvider.ts
 *
 * AccessorProvider для core-компонента TComponent / TComponentView.
 * Принимает готовый экземпляр, реализует getAccessor() для членов с ownerId = componentContributionId.
 */

import type { Accessor } from '../runtime/Accessor'
import type { AccessorProvider } from '../runtime/AccessorProvider'
import type { ContractMember } from '../contract/types'
import { componentContributionId } from '../contributions/component.contribution'
import type { IComponent } from '@soldy/core'

/**
 * Карта: имя свойства → список событий, которые сигнализируют об изменении
 */
const triggerMap: Record<string, string[]> = {
	rendered: ['change:rendered'],
	visible: ['change:visible'],
	present: ['change:rendered', 'change:visible'],
	tag: ['change:tag'],
	classes: ['change:classes'],
}

export class ComponentAccessorProvider implements AccessorProvider {
	constructor(private instance: IComponent) {}

	getAccessor(member: ContractMember): Accessor | undefined {
		if (member.ownerId !== componentContributionId) return undefined

		const { instance } = this
		const events = instance.events as any

		const triggers = triggerMap[member.name]
		if (!triggers) return undefined

		const accessor: Accessor = {
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
