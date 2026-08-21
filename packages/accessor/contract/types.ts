/**
 * @soldy/accessor — contract/types.ts
 *
 * Концепция: accessor = множество Unit'ов, Unit = { instance, props, events }.
 * instance[prop.name] — чтение, instance.events.on(trigger) — подписка.
 * Никаких namespace, pluginsMap, collection в accessor.
 */

/** Стратегия форматирования имён для конкретного фреймворка */
export interface INamingStrategy {
	prop(name: string): string
	event(name: string): string
}

/** Объявление свойства в contribution */
export interface IPropDeclaration {
	/** Ключ свойства на instance (instance[name]) */
	name: string
	type?: any
	protected?: boolean
	/** События на instance.events, сигнализирующие об изменении */
	triggers?: string[]	/** Нетривиальное чтение: вместо instance[name] */
	get?: (instance: any) => any
	/** Нетривиальная запись: вместо instance[name] = value */
	set?: (instance: any, value: any) => void}

/** Contribution: группа объявлений props + events */
export interface IContribution {
	props?: IPropDeclaration[]
	events?: string[]
}

/**
 * Единица accessor'а: один instance со своими props и events.
 * Компонент = несколько Unit'ов: сам instance, плагины, расширения коллекции и т.д.
 */
export interface IAccessorUnit {
	instance: any
	props?: IPropDeclaration[]
	events?: string[]
}

/** Скомпилированное свойство: привязано к своему instance */
export interface IAccessorProp {
	name: string
	/** Объект-владелец: instance[name] = значение, instance.events = источник событий */
	instance: any
	type?: any
	protected: boolean
	triggers: string[]
	get?: (instance: any) => any
	set?: (instance: any, value: any) => void
}

/** Скомпилированное событие: привязано к своему instance */
export interface IAccessorEvent {
	name: string
	instance: any
}

/** Elevator: DI-абстракция для передачи значений от родителя к детям */
export interface IContextElevator<T = any> {
	down(value: T): void
	up(): T | undefined
}

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

/** Вход: декларация одного свойства коллекции в контрибуции */
export interface ICollectionPropContribution extends IPropContribution {
	/** Явный геттер — нужен только когда source[name] не работает напрямую (напр. engine.items) */
	get?: (ctx: any) => any
	/** Явный сеттер; отсутствие = default source[name] = value */
	set?: (ctx: any, value: any) => void
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

/** Вспомогательный тип для описания Vue-prop в статическом слое (build time) */
export type TPropType = { type?: any; default?: any; required?: boolean }

/** Контрибуция коллекции: props с поддержкой get/set + события */
export interface ICollectionContribution {
	props?: ICollectionPropContribution[]
	events?: string[]
}

/** Скомпилированный prop коллекции: добавляет явные get/set к базовому ICompiledProp */
export interface ICompiledCollectionProp extends ICompiledProp {
	/** Явный геттер — нужен когда source[name] не совпадает с реальным свойством */
	get?: (target: any) => any
	/** Явный сеттер; отсутствие = target[name] = value */
	set?: (target: any, value: any) => void
}

/**
 * Дескриптор расширения коллекции (результат defineExtension).
 * Используется в defineCollection для сборки ICollectionDescriptor.
 */
export interface ICollectionExtensionDescriptor<TItem = any> {
	/** Имя расширения: ключ в collection.extensions (e.g. 'activation', 'batch') */
	name: string
	/** Конструктор расширения коллекции */
	ctor: new (options?: any) => any
	/** Props/events для родительского компонента (collection-level) */
	contribution?: ICollectionContribution
	/** Props/events для дочернего компонента (item-level) */
	itemContribution?: ICollectionContribution
	/** Фабрика опций с поздним связыванием (e.g. { owner: instance }) */
	optionsFactory?: (instance: any) => any
}

/**
 * Схема коллекции: скомпилированные props/events родительского и дочернего уровней.
 * Используется TCollectionAccessor и TItemContextAccessor.
 */
export interface ICollectionSchema {
	parentProps: ICompiledCollectionProp[]
	parentEvents: ICompiledEvent[]
	itemProps: ICompiledCollectionProp[]
	itemEvents: ICompiledEvent[]
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
