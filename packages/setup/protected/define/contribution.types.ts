/**
 * Синтаксис объявления в дескрипторе: пропсы, события и слоты — то, что автор пишет в `contribution`.
 *
 * Это вход описания. Во что он превращается — `TPropSpec`, `TName` и
 * `ISlotDeclaration` — решает `normalizeContribution`.
 */

/**
 * Объявление одного свойства. Ключ словаря `props` — имя свойства.
 *
 * `get`/`set` объявлены методами, а не свойствами-функциями: contribution пишет
 * их под владельца своего компонента (`get: (item: TTabsItemCollectionFacade) =>
 * item.closable`), а слой вызывает их с владельцем того же участника — эту связь
 * держит дескриптор, а не тип. Метод принимает такую реализацию без приведения.
 */
export interface IPropDefinition {
	type?: unknown
	/** Свойство вычисляет владелец, снаружи его только читают. */
	protected?: boolean
	/**
	 * События владельца, после которых значение надо перечитать. Только для
	 * чтения: объявление — литерал, и из него выводятся имена событий дескриптора
	 * (`const`-параметр даёт `readonly`-кортеж).
	 */
	triggers?: readonly string[]
	/** Нетривиальное чтение: вместо `owner[name]`. */
	get?(instance: object): unknown
	/** Нетривиальная запись: вместо `owner[name] = value`. */
	set?(instance: object, value: unknown): void
}

/**
 * Объявление одного слота. Ключ словаря `slots` — имя слота.
 *
 * Слоты — третья категория контракта рядом с пропсами и событиями. Синтаксис у
 * каждого фреймворка свой (`<template #leading>`, `{#snippet}`, проп с JSX,
 * `<ng-template>`, атрибут `slot`) — общими остаются имена, состав и scope.
 */
export interface ISlotDefinition {
	/**
	 * Данные, которые компонент передаёт ВНУТРЬ слота (scoped slot):
	 * `v-slot="{ text }"`, `{#snippet children(scope)}`, `let-text`.
	 *
	 * **Это не тип содержимого и не ограничение на него.** В слот можно положить
	 * что угодно. Значения несут тип данных слота (`defineType<T>`): в рантайме
	 * нужен лишь состав ключей, тип живёт на уровне типов.
	 */
	scope?: Record<string, unknown>
	/** Одна строка для документации и генерации. */
	description?: string
}

/** Нормализованное объявление слота: имя вынесено из ключа словаря. */
export interface ISlotDeclaration {
	readonly name: string
	readonly scope?: Record<string, unknown>
	readonly description?: string
}

/**
 * Contribution: словарь пропсов (имя → объявление), события сырыми строками и слоты.
 *
 * Только для чтения, как и `IPropDefinition.triggers`: объявление после записи
 * не меняется, а его литеральный тип — источник типов дескриптора.
 */
export interface IContribution {
	readonly props?: Readonly<Record<string, IPropDefinition>>
	readonly events?: readonly string[]
	readonly slots?: Readonly<Record<string, ISlotDefinition>>
}
