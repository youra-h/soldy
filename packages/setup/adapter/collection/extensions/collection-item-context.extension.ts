/**
 * TCollectionItemContextExtension — дочерняя сторона:
 * 1. Получает TItemContextRegistry от родителя через ITEM_CONTEXT_ELEVATOR
 * 2. Создаёт TItemContext для текущего instance
 * 3. Создаёт TCollectionItemAccessor для useSyncProps
 */

import { TCollectionItemAccessor } from '@soldy/accessor'
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
	/** TItemContext — exposing to template via useVueCollectionItem */
	readonly itemContext: any | undefined

	constructor(context: IAdapterContext, options: ICollectionItemContextOptions) {
		const { elevator, descriptor } = options
		const registry = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!registry) return

		const itemContext = registry.get(context.instance)

		this.itemContext = itemContext
		this.accessor = new TCollectionItemAccessor(
			descriptor.props,
			descriptor.events,
			itemContext,
		)
	}
}
