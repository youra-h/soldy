/**
 * TCollectionItemExtension — единая точка входа для настройки элемента коллекции.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 * Выполняется регистрация элемента в родительской коллекции.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { TItemContext } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ENGINE_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import { collectItemProps } from '../../../descriptors/base/collect-props'

/** Инстанс, к которому подключается расширение: item-фасад, принимающий контекст элемента. */
export type TCollectionItemFacade = {
	setContext(context: TItemContext<any, any>): void
}

export interface ICollectionItemExtensionOptions {
	/** Реальный элемент коллекции (инстанс из owner-дескриптора). */
	item: object
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	constructor(
		context: IAdapterContext<TCollectionItemFacade>,
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
		context: IAdapterContext<TCollectionItemFacade>,
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
