/**
 * TCollectionItemExtension — единая точка входа для настройки элемента коллекции.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Collapse/...).
 * Выполняется регистрация элемента в родительской коллекции.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import { collectItemProps } from '../../../descriptors/base/collect-props'

export interface ICollectionItemExtensionOptions {
	/** Реальный элемент коллекции (инстанс из owner-дескриптора). */
	item: any
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
		const { item, elevator } = options

		// context.instance — item-фасад, созданный item-дескриптором.
		const facade = context.instance as any
		const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (collection) {
			const registry = new TItemContextRegistry(collection.getCore())
			facade.setContext(registry.get(item))
		}

		this._register(context, item, elevator)

		if (collection?.extensions?.meta) {
			const meta = collectItemProps(context.descriptor.props, context.props)
			collection.extensions.meta.apply(item, meta)
		}
	}

	private _register(context: IAdapterContext, item: any, elevator: TElevatorFactory): void {
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const register = itemElevator.up() as ((item: any, bundle: any) => () => void) | undefined

		if (register) {
			const cleanup = register(item, context.bundle)

			context.events.on('destroy', cleanup)
		}
	}
}
