/**
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 *
 * Contribution — чистое описание свойств и событий, без идентификации источника.
 * Идентификация теперь внешняя — через ComponentDescriptor.
 */

export type TPropKind = 'state' | 'computed'

/** Входное описание свойства в контрибуции. */
export interface IContributionProp {
	name: string
	kind: TPropKind
	/**
	 * Может ли свойство быть изменено извне (есть ли setter).
	 * По умолчанию: state → true, computed → false.
	 */
	mutable?: boolean
	/** Свойство доступно снаружи как prop. По умолчанию: kind !== 'computed'. */
	public?: boolean
	/** События instance, при которых свойство считается изменённым */
	triggers?: string[]
}

/** Скомпилированное свойство: нормализованный mutable и public. */
export interface IContractProp extends IContributionProp {
	mutable: boolean
	public: boolean
}

export interface IComponentModel {
	props: IContractProp[]
	/** Только public свойства (для генерации props во фреймворках) */
	publicProps: IContractProp[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}

/**
 * Вклад (IContribution) — чистое описание свойств и событий от одного источника.
 * Не содержит идентификатора источника — связь устанавливается снаружи через ComponentDescriptor.
 */
export interface IContribution {
	props: IContributionProp[]
	/** Локальные имена событий */
	events: string[]
}
