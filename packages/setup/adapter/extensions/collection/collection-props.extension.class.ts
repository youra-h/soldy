/**
 * TCollectionPropsExtension — инициализирует owner-level пропсы коллекции
 * (items, trackBy, ...) из context.props при создании адаптера.
 *
 * Берёт коллекцию и descriptor из уже зарегистрированного TCollectionFactoryExtension —
 * инициализация props не существует без factory.
 *
 * Использование:
 *   adapter.use(TCollectionFactoryExtension, { descriptor, elevator })
 *          .use(TCollectionPropsExtension)
 *
 * Регистрируется ПОСЛЕ TCollectionFactoryExtension, чтобы коллекция уже существовала.
 */

// TODO remove

import type { IAdapterContext } from '../../context'
import { TCollectionFactoryExtension } from './collection-factory.extension.class'
import { collectOwnerProps } from '../../../descriptors/base/collect-props'

export class TCollectionPropsExtension {
	/** Собранные owner-level пропсы (items, trackBy, ...). */
	readonly ownerProps: Record<string, any>

	constructor(context: IAdapterContext) {
		const factory = context.get(TCollectionFactoryExtension)

		const collection = factory?.collection
		const descriptor = factory?.descriptor

		this.ownerProps = descriptor ? collectOwnerProps(descriptor.parentProps, context.props) : {}

		if (!collection || !descriptor) return

		const accessor = descriptor.createAccessor(collection)

		for (const prop of accessor.getProps(false)) {
			const key = prop.name.name

			if (key in this.ownerProps) {
				accessor.setValue(prop, this.ownerProps[key])
			}
		}
	}
}
