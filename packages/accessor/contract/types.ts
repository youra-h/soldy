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

/**
 * Декларация одного свойства. Ключ словаря props — имя свойства.
 *
 * `get`/`set` объявлены методами, а не свойствами-функциями: contribution пишет
 * их под instance своего компонента (`get: (item: TTabsItemCollectionFacade) =>
 * item.closable`), а accessor вызывает их с instance того же unit — эту связь
 * держит дескриптор, а не тип. Метод принимает такую реализацию без приведения.
 */
export interface IPropDefinition {
	type?: unknown
	protected?: boolean
	/**
	 * Только для чтения: объявление — литерал, и setup выводит из него имена
	 * событий дескриптора (`const`-параметр даёт `readonly`-кортеж).
	 */
	triggers?: readonly string[]
	/** Нетривиальное чтение: вместо instance[name] */
	get?(instance: object): unknown
	/** Нетривиальная запись: вместо instance[name] = value */
	set?(instance: object, value: unknown): void
}

/** Нормализованная декларация свойства: имена уже TName */
export interface IPropDeclaration {
	name: TName
	type?: unknown
	protected?: boolean
	triggers?: TName[]
	/**
	 * Значение, с которым владелец пропа стартует, если проп не задан.
	 *
	 * В contribution (`IPropDefinition`) этого поля нет: умолчание принадлежит
	 * классу, а не метаданным. Заполняет его setup при сборке дескриптора — из
	 * `defaultValues` класса ядра, а у пропа плагина из опции дескриптора или
	 * `defaultValues` плагина. Адаптер берёт его отсюда — из поверхности
	 * компонента (`surfaceOf` в `@soldy/setup`) — и сам не ищет.
	 *
	 * **Объявлено — значит, ключ есть, даже со значением `undefined`.**
	 * `closable: undefined` у `TTabsItem`/`TTagsItem` держит наследование от
	 * владельца, `value: undefined` у `TValueControl` не даёт Vue превратить
	 * отсутствующий `value` в `false`. Проверка `default !== undefined` сломала
	 * бы оба случая молча, поэтому проверяется наличие ключа.
	 */
	default?: unknown
	get?(instance: object): unknown
	set?(instance: object, value: unknown): void
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
	 * Значения несут тип данных слота (`defineType<T>` в setup): в рантайме
	 * нужен лишь состав ключей, тип живёт на уровне типов.
	 */
	scope?: Record<string, unknown>
	/** Одна строка для документации и генерации. */
	description?: string
}

/** Нормализованная декларация слота: имя вынесено из ключа словаря. */
export interface ISlotDeclaration {
	name: string
	scope?: Record<string, unknown>
	description?: string
}

/**
 * Contribution: словарь props (имя → декларация) + events (raw строки) + slots.
 *
 * Только для чтения, как и `IPropDefinition.triggers`: объявление после записи
 * не меняется, а его литеральный тип — источник типов дескриптора в setup.
 */
export interface IContribution {
	readonly props?: Readonly<Record<string, IPropDefinition>>
	readonly events?: readonly string[]
	readonly slots?: Readonly<Record<string, ISlotDefinition>>
}

/**
 * Единица accessor'а: один instance со своими props и events.
 * Компонент = несколько Unit'ов: сам instance, плагины, расширения коллекции и т.д.
 */
export interface IAccessorUnit {
	instance: object | null | undefined
	/** Только для чтения: декларации принадлежат дескриптору, аксессор их не меняет. */
	props?: readonly IPropDeclaration[]
	events?: readonly TName[]
}

/** Скомпилированное свойство: привязано к своему instance */
export interface IAccessorProp {
	name: TName
	/** Объект-владелец: instance[name] = значение, instance.events = источник событий */
	instance: object
	type?: unknown
	protected: boolean
	triggers: TName[]
	get?(instance: object): unknown
	set?(instance: object, value: unknown): void
}

/** Скомпилированное событие: привязано к своему instance */
export interface IAccessorEvent {
	name: TName
	instance: object
}

/** Elevator: DI-абстракция для передачи значений от родителя к детям */
export interface IContextElevator<T = any> {
	down(value: T): void
	up(): T | undefined
}
