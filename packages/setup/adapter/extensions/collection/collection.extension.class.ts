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
import { TCollectionBundlesPlugin } from '@soldy/plugins'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	static readonly key = Symbol('TCollectionExtension')

	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const collection = context.get(TCollectionFactoryExtension)?.collection
		const bundles = context.bundle?.get(TCollectionBundlesPlugin)

		// Передаём ссылку на коллекцию в плагин — это единственный источник
		// состояния коллекции (активный элемент, порядок, элементы) для плагинов.
		if (bundles && collection) {
			bundles.bindCollection(collection)
		}

		itemElevator.down((instance: any, bundle: any) => {
			// 1. Вставляем элемент в коллекцию (эмитится item:added).
			collection?.extensions?.plain?.insert(instance)

			// 2. Регистрируем bundle элемента (ключ — uid элемента).
			bundles?.register(bundle, instance)

			return () => {
				// Удаление из коллекции эмитит item:removed — реестр bundles
				// очистит запись по этому событию.
				collection?.extensions?.plain?.remove(instance)
			}
		})
	}
}
