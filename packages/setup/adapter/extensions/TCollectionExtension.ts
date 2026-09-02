/**
 * TCollectionExtension — настраивает родительскую коллекцию и Drag&Drop.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: vueElevatorFactory })
 */

import { TCollectionItemPlugins, TDragPlugin } from '@soldy/plugins'
import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import {
	COLLECTION_ELEVATOR,
	COLLECTION_PLUGINS_ELEVATOR,
	DRAG_CONTEXT_ELEVATOR,
} from '../elevator/keys'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	static readonly key = Symbol('TCollectionExtension')

	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options
		const collectionElevator = elevator(COLLECTION_ELEVATOR)
		const pluginsElevator = elevator(COLLECTION_PLUGINS_ELEVATOR)
		const dragElevator = elevator(DRAG_CONTEXT_ELEVATOR)

		const { instance, bundle } = context

		// 1. Спускаем инстанс коллекции вниз детям
		collectionElevator.down(instance)

		// 2. Если есть плагин элементов — спускаем регистратор
		const collectionItemPlugins = bundle.get(TCollectionItemPlugins)
		if (collectionItemPlugins) {
			pluginsElevator.down((uid: string | number, itemBundle: any) => {
				collectionItemPlugins.register(uid, itemBundle)
			})
		}

		// 3. Проверяем DragAndDrop контекст
		const dragContext = dragElevator.up()
		if (dragContext) {
			bundle.get(TDragPlugin)?.activate(instance)
		}
	}
}
