/**
 * Чистая функция: собирает IComponentModel из массива IContribution.
 * Не имеет доступа к instance, плагинам, эмиттерам.
 * Только статическая компиляция описаний.
 */

import type { IComponentModel, IContractProp, IContribution } from '../contract'

export function compileComponent(
	contributions: IContribution[],
	userEvents?: string[],
): IComponentModel {
	const props: IContractProp[] = []
	const events: string[] = []

	// Собираем свойства от всех вкладов
	for (const c of contributions) {
		const ownedProps: IContractProp[] = c.props.map((p) => ({
			...p,
			mutable: p.kind === 'computed' ? false : p.mutable ?? true,
			ownerId: c.id,
		}))
		props.push(...ownedProps)
		events.push(...c.events)
	}

	if (userEvents) {
		events.push(...userEvents)
	}

	return { props, events: [...new Set(events)] }
}
