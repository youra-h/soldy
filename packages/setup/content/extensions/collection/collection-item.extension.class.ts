/**
 * TCollectionItemExtension — единая точка входа для настройки элемента коллекции.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 * Выполняется регистрация элемента в родительской коллекции.
 */

import { TItemContextRegistry } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'
import {
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
} from '../../../protected/adapter/elevator/keys'
import { collectItemProps } from './item-props'
import type { ICollectionItemExtensionOptions, TCollectionItemFacade } from './types'

export class TCollectionItemExtension {
	constructor(
		context: TInstanceContext<TCollectionItemFacade>,
		options: ICollectionItemExtensionOptions,
	) {
		const { item, elevator } = options

		// context.instance — item-фасад, созданный item-дескриптором.
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up()

		if (engine) {
			const registry = new TItemContextRegistry(engine.getCore())
			context.instance.setContext(registry.get(item))
		}

		this._register(context, item, elevator)

		if (engine?.extensions.meta) {
			const meta = collectItemProps(context.descriptor.props, context.props)
			engine.extensions.meta.apply(item, meta)
		}
	}

	private _register(
		context: TInstanceContext<TCollectionItemFacade>,
		item: object,
		elevator: TElevatorFactory,
	): void {
		const register = elevator(COLLECTION_ENGINE_ELEVATOR).up()

		if (register) {
			const cleanup = register(item, context.bundle)

			context.events.on('destroy', cleanup)
		}
	}
}
