import type { TCollection, IExtension } from './engine'

export type TCollectionServiceEvents<T> = {
	ready: (collection: TCollection<T, any>) => void
}

/** Конструктор расширения коллекции */
export type TExtensionConstructor<T> = new () => IExtension<T>

export interface ICollectionPluginOptions<T> {
	/** Конструкторы расширений — каждый вызов создаёт новый экземпляр */
	extensions?: Record<string, TExtensionConstructor<T>>
	items?: T[]
}
