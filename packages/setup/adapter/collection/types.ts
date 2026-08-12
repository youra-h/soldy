import type { TEvented } from '@soldy/core'
import type { TCollectionAccessor } from '@soldy/accessor'

export type TCollectionAdapterEvents = {
	destroy: () => void
}

export interface ICollectionAdapterExtensionCtor<T = any, TOpts = any> {
	key: symbol
	new (context: ICollectionAdapterContext, options: TOpts): T
}

export interface ICollectionAdapterContext {
	readonly collection: any // TCollection<any, any>
	readonly accessor: TCollectionAccessor
	readonly events: TEvented<TCollectionAdapterEvents>

	use<T>(ExtensionCtor: ICollectionAdapterExtensionCtor<T, any>, options?: any): this
	get<T>(ctor: ICollectionAdapterExtensionCtor<T, any>): T | undefined
	get(key: symbol): any | undefined

	destroy(): void
}
