/**
 * @soldy/accessor — contract/types.ts
 *
 * Концепция: accessor = множество Unit'ов, Unit = { instance, props, events }.
 * instance[prop.name] — чтение, instance.events.on(trigger) — подписка.
 * Никаких namespace, pluginsMap, collection в accessor.
 */

/**
 * Квалифицированное имя: raw name + опциональный namespace.
 * - name      — как обращаться к instance (instance[name], events.on(name))
 * - namespace — контекст для экспорта во фреймворк (naming strategy)
 * - getName() — уникальный идентификатор (для дедупликации в TAccessor)
 */
export class TName {
	readonly name: string
	readonly namespace?: string

	constructor(name: string, namespace?: string) {
		this.name = name
		this.namespace = namespace
	}

	getName(): string {
		return this.namespace ? `${this.namespace}:${this.name}` : this.name
	}
}

/** Стратегия форматирования имён для конкретного фреймворка */
export interface INamingStrategy {
	prop(name: TName): string
	event(name: TName): string
}

/** Декларация одного свойства. Ключ словаря props — имя свойства. */
export interface IPropDefinition {
	type?: any
	protected?: boolean
	triggers?: string[]
	/** Нетривиальное чтение: вместо instance[name] */
	get?: (instance: any) => any
	/** Нетривиальная запись: вместо instance[name] = value */
	set?: (instance: any, value: any) => void
}

/** Нормализованная декларация свойства: имена уже TName */
export interface IPropDeclaration {
	name: TName
	type?: any
	protected?: boolean
	triggers?: TName[]
	get?: (instance: any) => any
	set?: (instance: any, value: any) => void
}

/** Contribution: словарь props (имя → декларация) + events (raw строки). */
export interface IContribution {
	props?: Record<string, IPropDefinition>
	events?: string[]
}

/**
 * Единица accessor'а: один instance со своими props и events.
 * Компонент = несколько Unit'ов: сам instance, плагины, расширения коллекции и т.д.
 */
export interface IAccessorUnit {
	instance: any
	props?: IPropDeclaration[]
	events?: TName[]
}

/** Скомпилированное свойство: привязано к своему instance */
export interface IAccessorProp {
	name: TName
	/** Объект-владелец: instance[name] = значение, instance.events = источник событий */
	instance: any
	type?: any
	protected: boolean
	triggers: TName[]
	get?: (instance: any) => any
	set?: (instance: any, value: any) => void
}

/** Скомпилированное событие: привязано к своему instance */
export interface IAccessorEvent {
	name: TName
	instance: any
}

/** Elevator: DI-абстракция для передачи значений от родителя к детям */
export interface IContextElevator<T = any> {
	down(value: T): void
	up(): T | undefined
}
