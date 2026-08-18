import type {
	ICollectionContribution,
	ICompiledCollectionProp,
	ICompiledEvent,
	ICollectionSchema,
	ICollectionExtensionDescriptor,
} from '@soldy/accessor'

export interface ICollectionDescriptor<TItem extends object = any> {
	readonly props: ICompiledCollectionProp[]
	readonly events: ICompiledEvent[]
	factory(owner: any): any
}

/** Опции для defineCollection(): extensions — аналог plugins в defineComponent */
export interface ICollectionDefinitionOptions<TItem extends object = any> {
	factory: (owner: any) => any
	extensions: ICollectionExtensionDescriptor[]
}

export interface ICollectionItemDescriptor {
	readonly props: ICompiledCollectionProp[]
	readonly events: ICompiledEvent[]
}

/** Опции для defineCollectionItem(): extensions — аналог plugins в defineComponent */
export interface ICollectionItemDefinitionOptions {
	extensions: ICollectionExtensionDescriptor[]
}

/** Опции для defineCollectionExtension() — аналог definePlugin */
export interface ICollectionExtensionDefinitionOptions {
	source: 'engine' | string
	contribution?: ICollectionContribution
}
