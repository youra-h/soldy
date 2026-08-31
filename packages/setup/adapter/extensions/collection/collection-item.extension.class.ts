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
import type { IComponentDescriptor } from '@soldy/setup'

export interface ICollectionItemExtensionOptions {
	/** item-фасад, которому передаётся TItemContext. */
	facade?: any
	/** item-дескриптор коллекции (defineComponent) для сбора meta. */
	itemDescriptor?: IComponentDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
		const { facade, itemDescriptor, elevator } = options

		if (facade) {
			// Контекст из коллекции-владельца, meta из item-пропсов.
			const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

			if (collection) {
				const registry = new TItemContextRegistry(collection.getCore())
				facade.setContext(registry.get(context.instance))
			}

			this._register(context, elevator)

			if (itemDescriptor && collection?.extensions?.meta) {
				const meta = collectItemProps(itemDescriptor.props, context.props)
				collection.extensions.meta.apply(context.instance, meta)
			}

			return
		}

		this._register(context, elevator)
	}

	private _register(context: IAdapterContext, elevator: TElevatorFactory): void {
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const register = itemElevator.up() as
			| ((item: any, bundle: any) => () => void)
			| undefined

		if (register) {
			const cleanup = register(context.instance, context.bundle)

			context.events.on('destroy', cleanup)
		}
	}
}
