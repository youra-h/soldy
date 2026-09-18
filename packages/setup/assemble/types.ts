/**
 * Контракты сборки: вход одного монтирования и собранный по нему компонент.
 */

import type { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'

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
}
