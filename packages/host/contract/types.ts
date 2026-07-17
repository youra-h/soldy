/**
 * @soldy/host — contract/types.ts
 *
 * Базовые типы контракта компонента.
 * Модель (ComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 */

export type MemberKind = 'state' | 'computed' | 'event'

export interface ContractMember {
	name: string
	kind: MemberKind
	/** Идентификатор источника (Contribution.id), которому принадлежит член */
	ownerId: symbol
}

export interface ComponentModel {
	members: ContractMember[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}
