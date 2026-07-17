/**
 * @soldy/host — compiler/compileComponent.ts
 *
 * Чистая функция: собирает ComponentModel из массива Contribution.
 * Не имеет доступа к instance, плагинам, эмиттерам.
 * Только статическая компиляция описаний.
 */

import type { ComponentModel, ContractMember } from '../contract/types'
import type { Contribution } from '../contract/Contribution'

export function compileComponent(
	contributions: Contribution[],
	userMembers?: ContractMember[],
	userEvents?: string[],
): ComponentModel {
	const members: ContractMember[] = []
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
