/**
 * TCollectionItemMetaExtension — снимает item-метаданные из props и толкает их
 * в коллекционное TMetaExtension уже после вставки элемента.
 *
 * Использование:
 *   adapter.use(TCollectionItemMetaExtension, { descriptor, elevator })
 *
 * Регистрируется ПОСЛЕ TCollectionItemExtension (который вставляет элемент),
 * чтобы meta применилась к уже находящемуся в коллекции элементу.
 */

// TODO remove

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import type { ICollectionDescriptor } from '@soldy/setup'
import { collectItemProps } from '../../../descriptors/base/collect-props'

export interface ICollectionItemMetaExtensionOptions {
	descriptor: ICollectionDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemMetaExtension {
	constructor(context: IAdapterContext, options: ICollectionItemMetaExtensionOptions) {
		const { descriptor, elevator } = options

		const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any
		const metaExt = collection?.extensions?.meta

		if (!metaExt) return

		const meta = collectItemProps(descriptor.itemProps, context.props)

		metaExt.apply(context.instance, meta)
	}
}
