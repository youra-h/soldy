/**
 * Базовые типы контракта компонента.
 * Модель (IComponentModel) — immutable DTO, результат компиляции.
 * Не содержит instance, не знает о плагинах.
 *
 * Contribution — чистое описание свойств и событий, без идентификации источника.
 * Идентификация теперь внешняя — через ComponentDescriptor.
 */

/** Входное описание свойства в контрибуции. */
export interface IContributionProp {
	name: string
	/** Свойство защищено: нет внешнего пропа, нет сеттера. По умолчанию false. */
	protected?: boolean
	/** События instance, при которых свойство считается изменённым */
	triggers?: string[]
}

/** Скомпилированное свойство: нормализованный protected. */
export interface IContractProp extends IContributionProp {
	protected: boolean
}

export interface IComponentModel {
	props: IContractProp[]
	/** Имена всех событий (для генерации emits) */
	events: string[]
}

/**
 * Вклад (IContribution) — чистое описание свойств и событий от одного источника.
 * Не содержит идентификатора источника — связь устанавливается снаружи через ComponentDescriptor.
 */
export interface IContribution {
	props?: IContributionProp[]
	/** Локальные имена событий */
	events?: string[]
}
