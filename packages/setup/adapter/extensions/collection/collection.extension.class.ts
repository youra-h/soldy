/**
 * TCollectionExtension — настраивает родительскую коллекцию:
 * предоставляет детям функцию регистрации через elevator.
 *
 * Ребёнок вызывает register({ instance, bundle }) → получает cleanup-функцию.
 * При destroy ребёнок вызывает cleanup → remove из коллекции + unregister плагинов.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: vueElevatorFactory })
 */

import { TCollectionPlugin, TCollectionItemPlugins } from '@soldy/plugins'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	static readonly key = Symbol('TCollectionExtension')

	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const { bundle } = context

		const collectionPlugin = bundle.get(TCollectionPlugin)
		const itemPlugins = bundle.get(TCollectionItemPlugins)

		itemElevator.down(
			({ instance, bundle: itemBundle }: { instance: any; bundle: any }) => {
				// Регистрация в коллекции
				if (collectionPlugin && instance) {
					collectionPlugin.insert(instance)
				}

				// Регистрация плагинов элемента
				if (itemPlugins && instance) {
					itemPlugins.register(instance.uid, itemBundle, instance)
				}

				// Возвращаем cleanup
				return () => {
					if (collectionPlugin && instance) {
						collectionPlugin.remove(instance)
					}

					if (itemPlugins && instance) {
						itemPlugins.unregister(instance.uid)
					}
				}
			},
		)
	}
}
