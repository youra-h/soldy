/**
 * TCollectionItemElevatorExtension — предоставляет дочерним элементам
 * функцию регистрации через elevator (паттерн slot: <tabs><tab-item/></tabs>).
 *
 * Родитель (Tabs) вызывает down(registerFn).
 * Ребёнок (TabItem) вызывает up() → registerFn({ instance, bundle }) → cleanup.
 *
 * Замена старого TCollectionExtension — теперь работает напрямую с TCollection.plain.
 */

import type { ICollectionAdapterContext } from '../types'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'

export interface ICollectionItemElevatorOptions {
	elevator: TElevatorFactory
}

export class TCollectionItemElevatorExtension {
	static readonly key = Symbol('TCollectionItemElevatorExtension')

	constructor(context: ICollectionAdapterContext, options: ICollectionItemElevatorOptions) {
		const { elevator } = options
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const { collection } = context
		const plain = collection.extensions.plain

		itemElevator.down((item: any) => {
			plain.insert(item, collection.engine.length)

			return () => plain.remove(item)
		})
	}
}
