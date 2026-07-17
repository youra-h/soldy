/**
 * @soldy/host — contract/Contribution.ts
 *
 * Вклад (Contribution) — декларация членов и событий от одного источника.
 * Источником может быть core-компонент, плагин, пользовательский код.
 * Содержит только статическое описание, без instance.
 */

import type { ContractMember } from './types'

export interface Contribution {
	id: symbol
	members: ContractMember[]
	events: string[]
}
