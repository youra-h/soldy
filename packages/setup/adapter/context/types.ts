import type { TEvented } from '@soldy/core'

export type TAdapterEvents = {
	destroy: () => void
}

export interface IAdapterContext {
	readonly instance: any
	readonly bundle: any
	readonly accessor: any
	readonly events: TEvented<TAdapterEvents>

	/** Подключить расширение без опций */
	use<T>(ExtensionCtor: IAdapterExtensionCtor<T, void>): this
	/** Подключить расширение с объектом опций */
	use<T, TOpts>(ExtensionCtor: IAdapterExtensionCtor<T, TOpts>, options: TOpts): this

	/** Получить зарегистрированное расширение */
	get<T>(ctor: IAdapterExtensionCtor<T, any>): T | undefined
	get(key: symbol): any | undefined

	/** Запустить уничтожение контекста */
	destroy(): void
}

export interface IAdapterExtensionCtor<T = any, TOpts = any> {
	key: symbol
	new (context: IAdapterContext, options?: TOpts): T
}
