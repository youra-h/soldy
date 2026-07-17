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
	/** Локальные имена событий. Если задан eventPrefix — компилятор добавит префикс */
	events: string[]
	/** Префикс для событий (например 'plugin:element' → 'plugin:element:ready') */
	eventPrefix?: string
}
