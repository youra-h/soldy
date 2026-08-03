import type { TCollection, IExtension } from './engine'

export type TCollectionServiceEvents<T> = {
	ready: (collection: TCollection<T, any>) => void
}

export interface ICollectionPluginOptions<T> {
	extensions?: Record<string, IExtension<T>>
	items?: T[]
}
