/**
 * Контракты сборки: состав компонента, вход одного монтирования, его плагины и собранный по нему компонент.
 */

import type { IPropDeclaration, TAccessor, TName, TProperty } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { TPluginCtor } from '../define/types'

/**
 * Запись состава: какой плагин ставить, с чем и что он объявляет наружу.
 *
 * Декларации есть только у плагинов дескриптора: контракт внешнего плагина
 * ведётся через `pluginProps`
 * (AGENTS.md, «Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`»).
 */
export interface ICompositionEntry {
	readonly ctor: TPluginCtor
	readonly options?: object
	readonly props?: readonly IPropDeclaration[]
	readonly events?: readonly TName[]
}

/** Что известно о монтировании: готовый инстанс или аргументы конструктора, место, чужой набор. */
export interface IAssemblyInput<TInstance extends object = object> {
	/** Готовый инстанс (`ctrl`); без него инстанс строит `ctor` дескриптора. */
	ctrl?: TInstance
	/**
	 * Пропсы фреймворка: аргумент конструктора и запасной источник `embedded`.
	 * `object`, а не `Record<string, unknown>`: адаптеры объявляют пропсы
	 * интерфейсами без индексной сигнатуры.
	 */
	props?: object
	/** Опции конструктора. */
	options?: object
	/** Имя места, если компонент — деталь разметки другого компонента. */
	embedded?: string
	/** Набор, собранный для того же инстанса раньше; без него набор собирается заново. */
	bundle?: IPluginBundle | null
}

/**
 * Плагины компонента на одно монтирование.
 *
 * Реализаций две, и различает их только сборка: набор, собранный для этого
 * монтирования (`TOwnPlugins`), и набор владельца, на котором работает фасад
 * коллекции (`TSharedPlugins`). Всё, что у них разное — состав, начальные
 * значения, плагины снаружи, уничтожение, — решает реализация, а не проверка
 * «чей набор» у каждого, кто с набором работает.
 */
export interface IComponentPlugins {
	readonly bundle: IPluginBundle | null
	/** Из чего собран набор; по нему строятся units аксессора. */
	readonly composition: readonly ICompositionEntry[]
	/**
	 * Начальные значения пропсов плагинов из пропсов фреймворка — и плагинов
	 * дескриптора (`properties`), и поставленных снаружи (`pluginProps`).
	 */
	initialize(properties: readonly TProperty[], props: object | undefined): void
	/**
	 * Значения пропсов плагинов, поставленных снаружи (`pluginProps`):
	 * `{ timer_ms: 500 }`. Ключ пропал — проп возвращается к умолчанию
	 * декларации; плагина ещё нет — значение ждёт его установки.
	 */
	writeExternal(values: unknown): void
	destroy(): void
}

/** Компонент, собранный на одно монтирование. */
export interface IAssembledComponent<TInstance extends object = object> {
	readonly instance: TInstance
	/** Имя места, если компонент — деталь чужой разметки. */
	readonly embedded: string | undefined
	readonly plugins: IComponentPlugins
	readonly accessor: TAccessor
}
