/**
 * @soldy/provider — contract/types.ts
 *
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 */

export type TPropKind = 'state' | 'computed' | 'event'

/** Входное описание свойства в контрибуции. Без ownerId — компилятор всегда добавляет его из Contribution.id. */
export interface IContributionProp {
	name: string
	kind: TPropKind
	/**
	 * Может ли свойство быть изменено извне (есть ли setter).
	 * По умолчанию: state → true, computed → false.
	 */
	mutable?: boolean
	/** События instance, при которых свойство считается изменённым */
	triggers?: string[]
}

/** Скомпилированное свойство: всегда содержит ownerId и нормализованный mutable. */
export interface IContractProp extends IContributionProp {
	mutable: boolean
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
	props: IContributionProp[]
	/** Локальные имена событий */
	events: string[]
}
