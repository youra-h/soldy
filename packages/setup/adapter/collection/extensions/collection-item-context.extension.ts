/**
 * TCollectionItemContextExtension — получает контекст коллекции от родителя
 * через elevator и создаёт TCollectionItemAccessor для item-адаптеров.
 *
 * Использование:
 *   adapter.use(TCollectionItemContextExtension, {
 *       elevator: VueElevatorFactory,
 *       descriptor: TabsCollectionItemDescriptor,
 *   })
 */

import { TCollectionItemAccessor } from '@soldy/accessor'
import { TItemContextRegistry } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import type { ICollectionItemDescriptor } from '../../../collection'

export interface ICollectionItemContextOptions {
	elevator: TElevatorFactory
	descriptor: ICollectionItemDescriptor
}

export class TCollectionItemContextExtension {
	static readonly key = Symbol('TCollectionItemContextExtension')

	readonly accessor: TCollectionItemAccessor | undefined
	readonly itemAdapters: any | undefined

	constructor(context: IAdapterContext, options: ICollectionItemContextOptions) {
		const { elevator, descriptor } = options
		const colCtx = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!colCtx) return

		const registry = new TItemContextRegistry(colCtx.collection.extensions)
		this.itemAdapters = registry.get(context.instance).adapters

		this.accessor = new TCollectionItemAccessor(
			descriptor.props,
			descriptor.events,
			this.itemAdapters,
			colCtx.collection,
		)
	}
}
