/**
 * TCollectionExtension — предоставляет детям функцию регистрации через COLLECTION_ELEVATOR.
 *
 * Предполагает: TCollectionFactoryExtension должен быть зарегистрирован до вызова .use(TCollectionExtension).
 *
 * Использование:
 *   adapter.use(TCollectionFactoryExtension, { descriptor, elevator })
 *          .use(TCollectionExtension, { elevator })
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'
import { TCollectionFactoryExtension } from './collection-factory.extension.class'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	static readonly key = Symbol('TCollectionExtension')

	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const collection = context.get(TCollectionFactoryExtension)?.collection

		itemElevator.down((instance: any) => {
			collection?.extensions?.plain?.insert(instance)

			return () => {
				collection?.extensions?.plain?.remove(instance)
			}
		})
	}
}
