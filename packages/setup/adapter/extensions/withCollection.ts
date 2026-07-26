/**
 * Framework-Agnostic декораторы для коллекций.
 *
 * Декораторы НЕ зависят от конкретного фреймворка (Vue, React, Solid...).
 * Они используют adapter.onDispose() для регистрации очистки — контекст сам
 * знает, когда вызвать коллбэки (в useVue это происходит на onUnmounted).
 */

import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import {
	COLLECTION_ELEVATOR,
	COLLECTION_PLUGINS_ELEVATOR,
	DRAG_CONTEXT_ELEVATOR,
} from '../elevator/keys'
import { TCollectionItemPlugins, TDragPlugin } from '@soldy/plugins'

/** Декоратор коллекции-родителя (Tabs, Collapse, ListBox) */
export function withCollection(elevatorFactory: TElevatorFactory) {
	return (adapter: IAdapterContext) => {
		const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
		const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)
		const dragElevator = elevatorFactory(DRAG_CONTEXT_ELEVATOR)

		const { instance, bundle } = adapter

		// 1. Спускаем инстанс коллекции вниз детям
		collectionElevator.down(instance)

		// 2. Если есть плагин элементов — спускаем регистратор
		const collectionItemPlugins = bundle.get(TCollectionItemPlugins)
		if (collectionItemPlugins) {
			pluginsElevator.down((uid: string | number, itemBundle: any) => {
				collectionItemPlugins.register(uid, itemBundle)
			})
		}

		// 3. Проверяем DragAndDrop контекст сверху
		const dragContext = dragElevator.up()
		if (dragContext) {
			bundle.get(TDragPlugin)?.activate(instance)
		}
	}
}
