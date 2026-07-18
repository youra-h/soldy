/**
 * @soldy/host — contract/IContribution.ts
 *
 * Вклад (IContribution) — декларация членов и событий от одного источника.
 * Источником может быть core-компонент, плагин, пользовательский код.
 * Содержит только статическое описание, без instance.
 */

import type { IContractMember } from './types'

export interface IContribution {
	id: symbol
	members: IContractMember[]
	/** Локальные имена событий. Если задан eventPrefix — компилятор добавит префикс */
	events: string[]
}
