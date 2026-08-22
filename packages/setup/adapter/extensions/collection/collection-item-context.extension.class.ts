/**
 * TCollectionItemContextExtension — создаёт TItemContext для элемента коллекции
 * через ITEM_CONTEXT_ELEVATOR (инжектирует коллекцию от родителя).
 *
 * Использование:
 *   adapter.use(TCollectionItemContextExtension, { elevator: VueElevatorFactory })
 *
 * Предполагает, что родитель использовал TCollectionFactoryExtension,
 * который down(collection) через ITEM_CONTEXT_ELEVATOR.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import type { ICollectionDescriptor } from '@soldy/setup'

export interface ICollectionItemContextExtensionOptions {
	descriptor: ICollectionDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemContextExtension<TItem extends object = any, TExtensions = any> {
	static readonly key = Symbol('TCollectionItemContextExtension')

	readonly context: any
	readonly descriptor: ICollectionDescriptor

	constructor(context: IAdapterContext, options: ICollectionItemContextExtensionOptions) {
		const { descriptor, elevator } = options

		this.descriptor = descriptor

		const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!collection) return

		const registry = new TItemContextRegistry(collection.getCore())
		this.context = registry.get(context.instance)
	}
}
