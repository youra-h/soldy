import { TCollection } from '@soldy/core'
import { TAccessor, TName } from '@soldy/accessor'
import type { ICollectionExtensionDescriptor, ICollectionDescriptor } from './types'
import { normalizeContribution } from './compile-contribution'

/**
 * defineCollection — собирает ICollectionDescriptor из списка расширений.
 *
 * createAccessor строит TAccessor для родительского компонента (items, activeItem...).
 * createItemAccessor строит TAccessor для дочернего компонента (active, order...).
 * Оба используют TAccessor с Unit'ами { instance, props, events }.
 */
export function defineCollection(options: {
	extensions: ICollectionExtensionDescriptor[]
}): ICollectionDescriptor {
	const { extensions } = options

	// Статические объявления для useCollectionProps / useCollectionItemProps
	const parentProps: any[] = []
	const parentEvents: TName[] = []
	const itemProps: any[] = []
	const itemEvents: TName[] = []

	for (const def of extensions) {
		if (def.contribution) {
			const { props, events } = normalizeContribution(def.contribution)

			parentProps.push(...props)
			parentEvents.push(...events)
		}

		if (def.itemContribution) {
			const { props, events } = normalizeContribution(def.itemContribution, def.name)

			itemProps.push(...props)
			itemEvents.push(...events)
		}
	}

	return {
		parentProps,
		parentEvents,
		itemProps,
		itemEvents,

		create(instance: any): any {
			const extensionsMap: Record<string, any> = {}

			for (const def of extensions) {
				const opts = def.optionsFactory ? def.optionsFactory(instance) : {}
				extensionsMap[def.name] = new def.ctor(opts)
			}

			return new TCollection({ extensions: extensionsMap })
		},

		createAccessor(collection: any): TAccessor {
			return new TAccessor(
				extensions
					.filter((def) => def.contribution)
					.map((def) => {
						const { props, events } = normalizeContribution(def.contribution)
						return { instance: collection.extensions[def.name], props, events }
					})
					.filter((u) => u.instance != null),
			)
		},

		createItemAccessor(context: any): TAccessor {
			const units = extensions
				.filter((def) => def.itemContribution)
				.map((def) => {
					const { props, events } = normalizeContribution(def.itemContribution, def.name)
					return {
						instance: context.adapters[def.name],
						props,
						events,
					}
				})
				.filter((u) => u.instance != null)

			return new TAccessor(units)
		},
	}
}
