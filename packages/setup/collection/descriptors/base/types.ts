import type {
	ICollectionContribution,
	ICompiledCollectionProp,
	ICompiledEvent,
	ICollectionSchema,
} from '@soldy/accessor'

/**
 * Дескриптор коллекции — результат компиляции ICollectionContribution.
 *
 * Аналог IComponentDescriptor, но:
 * - factory создаёт TCollection (вместо new ctor)
 * - props имеет source (engine / extension name)
 * - нет extends / plugins / bundle — это параллельная система
 */
export interface ICollectionDescriptor<TItem extends object = any> {
	/** Props коллекции (скомпилированные) */
	readonly props: ICompiledCollectionProp[]
	/** Events коллекции (скомпилированные) */
	readonly events: ICompiledEvent[]

	/** Создать TCollection для переданного владельца */
	factory(owner: any): any // TCollection<TItem, any>
}

/** Опции для defineCollection() */
export interface ICollectionDefinitionOptions<TItem extends object = any> {
	/** Фабрика: (owner) → TCollection */
	factory: (owner: any) => any
	/** Контрибуция коллекции */
	contribution?: ICollectionContribution
}

/** Дескриптор элемента коллекции. Props компилируются с namespace 'item'. */
export interface ICollectionItemDescriptor {
	readonly props: ICompiledCollectionProp[]
	readonly events: ICompiledEvent[]
}

/** Опции для defineCollectionItem() */
export interface ICollectionItemDefinitionOptions {
	contribution?: ICollectionContribution
}
