/**
 * Контракты сборки: состав компонента, вход одного монтирования и собранный по нему компонент.
 */

import type { IPropDeclaration, TAccessor, TName } from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'

/**
 * Запись состава: какой плагин ставить, с чем и что он объявляет наружу.
 *
 * Декларации есть только у плагинов дескриптора: контракт внешнего плагина
 * ведёт контекст через `pluginProps`
 * (AGENTS.md, «Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`»).
 */
export interface ICompositionEntry {
	readonly ctor: IPluginConstructor<any, any, any>
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

/** Компонент, собранный на одно монтирование. */
export interface IAssembledComponent<TInstance extends object = object> {
	readonly instance: TInstance
	/** Имя места, если компонент — деталь чужой разметки. */
	readonly embedded: string | undefined
	readonly bundle: IPluginBundle | null
	/**
	 * Набор собран этой сборкой, а не пришёл на вход: уничтожает его тот, кто
	 * сборку запросил. Пришедший набор принадлежит тому, кто его передал.
	 */
	readonly ownsBundle: boolean
	readonly accessor: TAccessor
	/** Из чего собран набор: плагины дескриптора, затем реестра. */
	readonly composition: readonly ICompositionEntry[]
}

/** Куда сборка пишет начальные значения пропсов (`applyInitialProps`). */
export interface IInitialPropsTarget {
	readonly accessor: TAccessor
	/** Декларации всех пропсов компонента — ядра и плагинов, с умолчаниями. */
	readonly declarations: readonly IPropDeclaration[]
	readonly instance: object
	/** Инстанс собран конструктором из тех же пропсов. */
	readonly constructed: boolean
	/** Набор собран этой сборкой; пришедший инициализировал его владелец. */
	readonly ownsBundle: boolean
}
