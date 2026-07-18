/**
 * @soldy/provider — contract/types.ts
 *
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 */

export type TPropKind = 'state' | 'computed' | 'event'

export interface IContractProp {
	name: string
	kind: TPropKind
	/**
	 * Может ли свойство быть изменено извне (есть ли setter).
	 * По умолчанию: state → true, computed → false.
	 */
	mutable?: boolean
	/** Идентификатор источника (IContribution.id), которому принадлежит свойство */
	ownerId: symbol
}

export interface IComponentModel {
	props: IContractProp[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}

/**
 * Вклад (IContribution) — декларация свойств и событий от одного источника.
 * Источником может быть core-компонент, плагин, пользовательский код.
 * Содержит только статическое описание, без instance.
 */
export interface IContribution {
	id: symbol
	props: IContractProp[]
	/** Локальные имена событий. Если задан eventPrefix — компилятор добавит префикс */
	events: string[]
}
