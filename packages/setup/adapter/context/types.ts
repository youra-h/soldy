import type { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '@soldy/setup'

export type TAdapterEvents = {
	destroy: () => void
}

/**
 * Конструктор расширения с опциями.
 *
 * `TInstance` — какой инстанс нужен расширению (`TCollectionExtension` —
 * фасад с `engine`). `IAdapterContext.use()` сверяет его с инстансом контекста
 * при компиляции: расширение не подключить к компоненту, у которого нет того,
 * с чем оно работает.
 */
export interface IAdapterExtensionCtor<
	T = unknown,
	TOpts = unknown,
	TInstance extends object = object,
> {
	new (context: IAdapterContext<TInstance>, options: TOpts): T
}

/** Конструктор расширения без опций. */
export interface IAdapterExtensionCtorNoOpts<T = unknown, TInstance extends object = object> {
	new (context: IAdapterContext<TInstance>): T
}

/** Любой конструктор расширения — ключ реестра и элемент стартового набора. */
export type TAnyExtensionCtor = new (...args: any[]) => unknown

/** Опции создания адаптер-контекста: готовый инстанс (ctrl) или props/options конструктора. */
export interface IAdapterContextOptions<TInstance extends object = object> {
	ctrl?: TInstance
	/**
	 * Пропсы фреймворка. `object`, а не `Record<string, unknown>`: адаптеры
	 * объявляют пропсы интерфейсами, у которых нет индексной сигнатуры. Читаются
	 * по имени из дескриптора — через `Reflect.get`.
	 */
	props?: object
	options?: object
}

export interface IAdapterContextConfig {
	/** Готовый бандл плагинов. Если не передан — создаётся из descriptor. */
	bundle?: IPluginBundle | null
	/** Стартовый набор расширений (по умолчанию TPluginsBindingExtension). */
	defaultExtensions?: Array<TAnyExtensionCtor>
}

export interface IAdapterContext<TInstance extends object = object> {
	readonly instance: TInstance
	readonly bundle: IPluginBundle | null
	readonly accessor: TAccessor
	readonly descriptor: IComponentDescriptor
	readonly props: object
	readonly events: TEvented<TAdapterEvents>

	/** Подключить расширение БЕЗ опций */
	use<T>(ExtensionCtor: IAdapterExtensionCtorNoOpts<T, TInstance>): this
	/** Подключить расширение С обязательными опциями */
	use<T, TOpts>(ExtensionCtor: IAdapterExtensionCtor<T, TOpts, TInstance>, options: TOpts): this

	/** Получить зарегистрированное расширение по его классу */
	get<T>(ctor: new (...args: any[]) => T): T | undefined

	/** Запустить уничтожение контекста */
	destroy(): void
}
