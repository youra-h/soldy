/**
 * TCollectionExtension — настраивает родительскую коллекцию:
 * спускает инстанс коллекции и регистратор плагинов вниз детям.
 *
 * Drag&Drop вынесен в отдельный TDragAndDropCollectionExtension.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: vueElevatorFactory })
 */

import { TCollectionItemPlugins } from '@soldy/plugins'
import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import { COLLECTION_ELEVATOR, COLLECTION_PLUGINS_ELEVATOR } from '../elevator/keys'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	static readonly key = Symbol('TCollectionExtension')

	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options

		const collectionElevator = elevator(COLLECTION_ELEVATOR)
		const pluginsElevator = elevator(COLLECTION_PLUGINS_ELEVATOR)

		const { instance, bundle } = context

		// 1. Спускаем инстанс коллекции вниз детям
		collectionElevator.down(instance.collection)

		// 2. Если есть плагин элементов — спускаем регистратор
		const collectionItemPlugins = bundle.get(TCollectionItemPlugins)

		if (collectionItemPlugins) {
			pluginsElevator.down((uid: string | number, itemBundle: any) => {
				collectionItemPlugins.register(uid, itemBundle)
			})
		}
	}
}
