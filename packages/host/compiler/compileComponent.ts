/**
 * @soldy/host — compiler/compileComponent.ts
 *
 * Чистая функция: собирает IComponentModel из массива IContribution.
 * Не имеет доступа к instance, плагинам, эмиттерам.
 * Только статическая компиляция описаний.
 */

import type { IComponentModel, IContractProp, IContribution } from '../contract'

export function compileComponent(
	contributions: IContribution[],
	userProps?: IContractProp[],
	userEvents?: string[],
): IComponentModel {
	const props: IContractProp[] = []
	const events: string[] = []

	// Собираем члены от всех вкладов
	for (const c of contributions) {
		const ownedProps = c.props.map((m) => ({
			...m,
			ownerId: c.id,
		}))
		props.push(...ownedProps)
		events.push(...c.events)
	}

	// Пользовательские члены
	if (userProps) {
		props.push(...userProps)
	}
	if (userEvents) {
		events.push(...userEvents)
	}

	// Убираем дубликаты событий
	const uniqueEvents = [...new Set(events)]

	return { props, events: uniqueEvents }
}
