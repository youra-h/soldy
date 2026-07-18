/**
 * @soldy/host — contract/types.ts
 *
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 */

export type TPropKind = 'state' | 'computed' | 'event'

export interface IContractProp {
	name: string
	kind: TPropKind
	/** Может ли свойство быть изменено извне (есть ли setter) */
	mutable: boolean
	/** Идентификатор источника (IContribution.id), которому принадлежит член */
	ownerId: symbol
}

export interface IComponentModel {
	props: IContractProp[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}

/**
 * Вклад (IContribution) — декларация членов и событий от одного источника.
 * Источником может быть core-компонент, плагин, пользовательский код.
 * Содержит только статическое описание, без instance.
 */
export interface IContribution {
	id: symbol
	props: IContractProp[]
	/** Локальные имена событий. Если задан eventPrefix — компилятор добавит префикс */
	events: string[]
}
