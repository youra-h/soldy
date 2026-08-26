/**
 * TCollectionFactoryExtension — создаёт коллекцию через дескриптор и передаёт её вниз через ITEM_CONTEXT_ELEVATOR.
 *
 * Использование:
 *   adapter.use(TCollectionFactoryExtension, { descriptor: TabsCollectionDescriptor, elevator: VueElevatorFactory })
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import type { ICollectionDescriptor } from '@soldy/setup'

export interface ICollectionFactoryExtensionOptions {
	descriptor: ICollectionDescriptor
	elevator: TElevatorFactory
	/** Готовая коллекция (pass-through из props.engine). Если задана — используется вместо создания новой. */
	engine?: any
}

export class TCollectionFactoryExtension {
	static readonly key = Symbol('TCollectionFactoryExtension')

	readonly collection: any
	readonly descriptor: ICollectionDescriptor

	constructor(context: IAdapterContext, options: ICollectionFactoryExtensionOptions) {
		const { descriptor, elevator, engine } = options

		this.descriptor = descriptor
		this.collection = engine ?? descriptor.create(context.instance)

		// Передаём коллекцию дочерним элементам через элеватор
		elevator(ITEM_CONTEXT_ELEVATOR).down(this.collection)
	}
}
