import type { TEvented } from '@soldy/core'
import type { IComponentDescriptor } from '@soldy/setup'

export type TAdapterEvents = {
	destroy: () => void
}

export interface IAdapterExtensionCtor<T = any, TOpts = any> {
	new (context: IAdapterContext, options: TOpts): T
}

export interface IAdapterExtensionCtorNoOpts<T = any> {
	new (context: IAdapterContext): T
}

export type TAnyExtensionCtor = IAdapterExtensionCtorNoOpts<any> | IAdapterExtensionCtor<any, any>

/** Опции создания адаптер-контекста: готовый инстанс (ctrl) или props/options конструктора. */
export interface IAdapterContextOptions {
	ctrl?: any
	props?: Readonly<Record<string, any>>
	options?: Readonly<Record<string, any>>
}

export interface IAdapterContextConfig {
	/** Готовый бандл плагинов. Если не передан — создаётся из descriptor. */
	bundle?: any
	/** Стартовый набор расширений (по умолчанию TPluginsBindingExtension). */
	defaultExtensions?: Array<TAnyExtensionCtor>
}

export interface IAdapterContext {
	readonly instance: any
	readonly bundle: any
	readonly accessor: any
	readonly descriptor: IComponentDescriptor
	readonly props: Readonly<Record<string, any>>
	readonly events: TEvented<TAdapterEvents>

	/** Подключить расширение БЕЗ опций */
	use<T>(ExtensionCtor: IAdapterExtensionCtorNoOpts<T>): this
	/** Подключить расширение С обязательными опциями */
	use<T, TOpts>(ExtensionCtor: IAdapterExtensionCtor<T, TOpts>, options: TOpts): this

	/** Получить зарегистрированное расширение по его классу */
	get<T>(ctor: IAdapterExtensionCtor<T, any> | IAdapterExtensionCtorNoOpts<T>): T | undefined

	/** Запустить уничтожение контекста */
	destroy(): void
}
