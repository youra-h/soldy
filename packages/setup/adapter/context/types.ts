import type { TEvented } from '@soldy/core'

export type TAdapterEvents = {
	destroy: () => void
}

export interface IAdapterExtensionCtor<T = any, TOpts = any> {
	key: symbol
	new (context: IAdapterContext, options: TOpts): T
}

export interface IAdapterExtensionCtorNoOpts<T = any> {
	key: symbol
	new (context: IAdapterContext): T
}

export interface IAdapterContext {
	readonly instance: any
	readonly bundle: any
	readonly accessor: any
	readonly props: Readonly<Record<string, any>>
	readonly events: TEvented<TAdapterEvents>

	/** Подключить расширение БЕЗ опций */
	use<T>(ExtensionCtor: IAdapterExtensionCtorNoOpts<T>): this
	/** Подключить расширение С обязательными опциями */
	use<T, TOpts>(ExtensionCtor: IAdapterExtensionCtor<T, TOpts>, options: TOpts): this

	/** Получить зарегистрированное расширение */
	get<T>(ctor: IAdapterExtensionCtor<T, any> | IAdapterExtensionCtorNoOpts<T>): T | undefined
	get(key: symbol): any | undefined

	/** Запустить уничтожение контекста */
	destroy(): void
}
