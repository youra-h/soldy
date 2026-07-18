/**
 * @soldy/host — compiler/compileComponent.ts
 *
 * Чистая функция: собирает IComponentModel из массива IContribution.
 * Не имеет доступа к instance, плагинам, эмиттерам.
 * Только статическая компиляция описаний.
 */

import type { IComponentModel, IContractMember } from '../contract/types'
import type { IContribution } from '../contract/Contribution'

export function compileComponent(
	contributions: IContribution[],
	userMembers?: IContractMember[],
	userEvents?: string[],
): IComponentModel {
	const members: IContractMember[] = []
	const events: string[] = []

	// Собираем члены от всех вкладов
	for (const c of contributions) {
		const ownedMembers = c.members.map(m => ({
			...m,
			ownerId: c.id,
		}))
		members.push(...ownedMembers)
		events.push(...c.events)
	}

	// Пользовательские члены
	if (userMembers) {
		members.push(...userMembers)
	}
	if (userEvents) {
		events.push(...userEvents)
	}

	// Убираем дубликаты событий
	const uniqueEvents = [...new Set(events)]

	return { members, events: uniqueEvents }
}
