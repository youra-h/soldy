/**
 * @soldy/host — contract/types.ts
 *
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 */

export type TMemberKind = 'state' | 'computed' | 'event'

export interface IContractMember {
	name: string
	kind: TMemberKind
	/** Может ли свойство быть изменено извне (есть ли setter) */
	mutable: boolean
	/** Идентификатор источника (IContribution.id), которому принадлежит член */
	ownerId: symbol
}

export interface IComponentModel {
	members: IContractMember[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}
