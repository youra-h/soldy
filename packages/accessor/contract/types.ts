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

/**
 * Декларация одного слота. Ключ словаря slots — имя слота.
 *
 * Слоты — третья категория контракта рядом с props и events. До их объявления
 * они существовали только как разметка в шаблонах, поэтому «одна структура во
 * всех фреймворках» ничем не гарантировалась и не проверялась.
 *
 * Синтаксис у каждого фреймворка свой (`<template #leading>`, `{#snippet}`,
 * проп с JSX, `<ng-template>`, атрибут `slot`) — общими остаются имена, состав
 * и scope. Именно это и есть контракт.
 */
export interface ISlotDefinition {
	/**
	 * Данные, которые компонент передаёт ВНУТРЬ слота (scoped slot):
	 * `v-slot="{ text }"`, `{#snippet children(scope)}`, `let-text`.
	 *
	 * **Это не тип содержимого и не ограничение на него.** В слот можно
	 * положить что угодно — текст, иконку, таблицу; компонент от этого не
	 * перестаёт быть собой. Ограничений на содержимое контракт сейчас не
	 * выражает вовсе; если такой случай появится (слот, где посторонняя
	 * разметка ломает поведение), поле для этого добавляется сюда отдельно.
	 *
	 * Значения — те же брендированные типы, что и у props (`defineType<T>`):
	 * в рантайме нужен лишь состав ключей, тип живёт на уровне типов.
	 */
	scope?: Record<string, any>
	/** Одна строка для документации и генерации. */
	description?: string
}

/** Нормализованная декларация слота: имя вынесено из ключа словаря. */
export interface ISlotDeclaration {
	name: string
	scope?: Record<string, any>
	description?: string
}

/** Contribution: словарь props (имя → декларация) + events (raw строки) + slots. */
export interface IContribution {
	props?: Record<string, IPropDefinition>
	events?: string[]
	slots?: Record<string, ISlotDefinition>
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
