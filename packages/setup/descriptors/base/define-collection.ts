import { TCollection } from '@soldy/core'
import { TCollectionAccessor, TItemContextAccessor } from '@soldy/accessor'
import type { ICollectionExtensionDescriptor, ICollectionDescriptor } from './types'
import type { INamingStrategy, ICollectionSchema } from '@soldy/accessor'
import { compileCollectionContribution } from './compile-contribution'

/**
 * defineCollection — собирает ICollectionDescriptor из списка расширений.
 *
 * @example
 * ```ts
 * export const TabsCollectionDescriptor = defineCollection({
 *   extensions: [
 *     { ...FactoryExtensionDescriptor, optionsFactory: () => ({ itemCtor: TTabItem }) },
 *     UniqueExtensionDescriptor,
 *     OrderExtensionDescriptor,
 *     PlainExtensionDescriptor,
 *     BatchExtensionDescriptor,
 *     ActivationExtensionDescriptor,
 *     { ...TabsExtensionDescriptor, optionsFactory: (instance) => ({ owner: instance }) },
 *   ],
 * })
 * ```
 */
export function defineCollection(options: {
	extensions: ICollectionExtensionDescriptor[]
}): ICollectionDescriptor {
	const { extensions } = options

	const parentProps: any[] = []
	const parentEvents: any[] = []
	const itemProps: any[] = []
	const itemEvents: any[] = []

	for (const def of extensions) {
		if (def.contribution) {
			const compiled = compileCollectionContribution(def.contribution, def.name)
			parentProps.push(...compiled.props)
			parentEvents.push(...compiled.events)
		}
		if (def.itemContribution) {
			const compiled = compileCollectionContribution(def.itemContribution, def.name)
			itemProps.push(...compiled.props)
			itemEvents.push(...compiled.events)
		}
	}

	const schema: ICollectionSchema = { parentProps, parentEvents, itemProps, itemEvents }

	return {
		schema,

		create(instance: any): any {
			const extensionsMap: Record<string, any> = {}
			for (const def of extensions) {
				const opts = def.optionsFactory ? def.optionsFactory(instance) : {}
				extensionsMap[def.name] = new def.ctor(opts)
			}
			return new TCollection({ extensions: extensionsMap })
		},

		createAccessor(collection: any, naming?: INamingStrategy): TCollectionAccessor {
			return new TCollectionAccessor(schema, collection, naming)
		},

		createItemAccessor(context: any, naming?: INamingStrategy): TItemContextAccessor {
			return new TItemContextAccessor(schema, context, naming)
		},
	}
}
