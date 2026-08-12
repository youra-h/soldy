/**
 * @soldy/accessor — contract/types.ts
 *
 * Базовые типы контрактов: описание свойств и событий.
 * Чистые абстракции, без привязки к конкретным классам.
 */

/** Вход: декларация одного свойства в контрибуции */
export interface IPropContribution {
	name: string
	type?: any | any[]
	protected?: boolean
	triggers?: string[]
}

/** Вход: декларация контрибуции — набор свойств + событий */
export interface IContribution {
	props?: IPropContribution[]
	events?: string[]
}

/** Базовый скомпилированный элемент (prop или event) с опциональным namespace */
export interface ICompiledItem {
	name: string
	namespace?: string
}

/** Скомпилированное свойство: всегда с нормализованным protected и triggers */
export interface ICompiledProp extends ICompiledItem {
	type?: any
	protected: boolean
	triggers: string[]
}

/** Скомпилированное событие */
export interface ICompiledEvent extends ICompiledItem {}

/** Вход: декларация одного свойства коллекции в контрибуции (с указанием источника) */
export interface ICollectionPropContribution extends IPropContribution {
	/** Где живёт свойство: 'engine' — collection.engine, иначе — collection.extensions[name] */
	source: 'engine' | string
}

/** Вход: декларация контрибуции коллекции */
export interface ICollectionContribution {
	props?: ICollectionPropContribution[]
	events?: string[]
}

/** Скомпилированное свойство коллекции: ICompiledProp + source */
export interface ICompiledCollectionProp extends ICompiledProp {
	source: 'engine' | string
}

/** Схема коллекции: скомпилированные props + events (контракт для TDescriptorInspector + TCollectionAccessor) */
export interface ICollectionSchema {
	props: ICompiledCollectionProp[]
	events: ICompiledEvent[]
}

/** Схема компонента: скомпилированные props + events (контракт для TDescriptorInspector) */
export interface IComponentSchema {
	props: ICompiledProp[]
	events: ICompiledEvent[]
}

/**
 * Стратегия форматирования имён props и событий под конкретный фреймворк.
 *
 * - prop(name, ns):  'styles' + 'icon-styles' → 'iconStyles_styles' (Vue/JS)
 * - event(name, ns): 'ready' + 'element'    → 'element:ready'      (Vue)
 */
export interface INamingStrategy {
	prop: (name: string, namespace?: string) => string
	event: (name: string, namespace?: string) => string
}

/**
 * Адаптер контекста родитель-ребёнок (Elevator).
 *
 * Абстрагирует provide/inject (Vue), React.Context, Angular DI
 * за единым интерфейсом. Вызовы up()/down() должны происходить
 * синхронно во время инициализации UI-компонента.
 *
 * @template T — тип передаваемого значения
 */
export interface IContextElevator<T = any> {
	/** Передать значение вниз по дереву (provide) */
	down(value: T): void
	/** Получить значение от ближайшего родителя (inject) */
	up(): T | undefined
}
