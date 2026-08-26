import { TCollection } from '@soldy/core'
import { TAccessor, TName } from '@soldy/accessor'
import type { IContribution } from '@soldy/accessor'
import type { ICollectionExtensionDescriptor, ICollectionDescriptor } from './types'
import { normalizeContribution } from './compile-contribution'

/**
 * defineCollection — собирает ICollectionDescriptor из списка расширений.
 *
 * Поддерживает наследование через `extends`: базовый дескриптор предоставляет
 * свои extensions и статические объявления props/events, дочерний добавляет свои.
 *
 * createAccessor строит TAccessor для родительского компонента (items, activeItem...).
 * createItemAccessor строит TAccessor для дочернего компонента (active, order...).
 * Оба используют TAccessor с Unit'ами { instance, props, events }.
 */
export function defineCollection(options: {
	/** Базовый дескриптор коллекции (наследование extensions + props/events). */
	extends?: ICollectionDescriptor
	/** Собственная контрибуция коллекции (например, engine prop). */
	contribution?: IContribution
	/** Собственные расширения коллекции. */
	extensions: ICollectionExtensionDescriptor[]
}): ICollectionDescriptor {
	const { extends: parent, contribution, extensions } = options

	// Полный список расширений: сначала базовые, затем собственные.
	const allExtensions: ICollectionExtensionDescriptor[] = [
		...(parent?.extensions ?? []),
		...extensions,
	]

	// Статические объявления для useCollectionProps / useCollectionItemProps
	const parentProps: any[] = [...(parent?.parentProps ?? [])]
	const parentEvents: TName[] = [...(parent?.parentEvents ?? [])]
	const itemProps: any[] = [...(parent?.itemProps ?? [])]
	const itemEvents: TName[] = [...(parent?.itemEvents ?? [])]

	if (contribution) {
		const { props, events } = normalizeContribution(contribution)

		parentProps.push(...props)
		parentEvents.push(...events)
	}

	for (const def of extensions) {
		if (def.contribution) {
			const { props, events } = normalizeContribution(def.contribution)

			parentProps.push(...props)
			parentEvents.push(...events)
		}

		if (def.itemContribution) {
			const { props, events } = normalizeContribution(def.itemContribution, def.namespace)

			itemProps.push(...props)
			itemEvents.push(...events)
		}
	}

	return {
		parentProps,
		parentEvents,
		itemProps,
		itemEvents,
		extensions: allExtensions,

		create(instance: any): any {
			const extensionsMap: Record<string, any> = {}

			for (const def of allExtensions) {
				const opts = def.optionsFactory ? def.optionsFactory(instance) : {}
				extensionsMap[def.name] = new def.ctor(opts)
			}

			return new TCollection({ extensions: extensionsMap })
		},

		createAccessor(collection: any): TAccessor {
			return new TAccessor(
				allExtensions
					.filter((def) => def.contribution)
					.map((def) => {
						const { props, events } = normalizeContribution(def.contribution)
						return { instance: collection.extensions[def.name], props, events }
					})
					.filter((u) => u.instance != null),
			)
		},

		createItemAccessor(context: any): TAccessor {
			const units = allExtensions
				.filter((def) => def.itemContribution)
				.map((def) => {
					const { props, events } = normalizeContribution(def.itemContribution, def.namespace)
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
