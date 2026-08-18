/**
 * TCollectionItemElevatorExtension — родительская сторона:
 * 1. Регистрирует slot-based элементы через COLLECTION_ELEVATOR (plain.push + unique guard)
 * 2. Предоставляет TItemContextRegistry дочерним элементам через ITEM_CONTEXT_ELEVATOR
 */

import { TItemContextRegistry } from '@soldy/core'
import type { ICollectionAdapterContext } from '../types'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'

export interface ICollectionItemElevatorOptions {
	elevator: TElevatorFactory
}

export class TCollectionItemElevatorExtension {
	static readonly key = Symbol('TCollectionItemElevatorExtension')

	constructor(context: ICollectionAdapterContext, options: ICollectionItemElevatorOptions) {
		const { elevator } = options
		const { collection } = context
		const { plain, unique } = collection.extensions

		// Slot-based: ребёнок поднимает instance наверх, родитель регистрирует его
		const itemElevator = elevator(COLLECTION_ELEVATOR)
		itemElevator.down((item: any) => {
			if (!unique?.has(item)) {
				plain.insert(item, collection.engine.length)
			}
			return () => plain.remove(item)
		})

		// Item-контекст: ребёнок получает registry для создания адаптеров
		const registry = new TItemContextRegistry(collection.getCore())
		elevator(ITEM_CONTEXT_ELEVATOR).down(registry)
	}
}
