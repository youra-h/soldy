/**
 * Декоратор родительской коллекции.
 *
 * Принимает готовый adapter { instance, bundle } и настраивает
 * связь родитель-ребёнок через IContextElevator:
 *   - спускает коллекцию детям (COLLECTION_ELEVATOR)
 *   - спускает регистратор плагинов детям (COLLECTION_PLUGINS_ELEVATOR)
 *   - проверяет drag-and-drop контекст от родителя (DRAG_CONTEXT_ELEVATOR)
 *
 * Не зависит от конкретного фреймворка. Не создаёт adapter — только расширяет.
 */

import type { TElevatorFactory } from '../elevator'
import type { IAdapter } from '../types'
import {
    COLLECTION_ELEVATOR,
    COLLECTION_PLUGINS_ELEVATOR,
    DRAG_CONTEXT_ELEVATOR,
} from '../elevator'
import { TCollectionItemPlugins, TDragPlugin } from '@soldy/plugins'

export function decorateCollection(
    adapter: IAdapter,
    elevatorFactory: TElevatorFactory,
): void {
    const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
    const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)
    const dragElevator = elevatorFactory(DRAG_CONTEXT_ELEVATOR)

    const { instance, bundle } = adapter

    // Спускаем инстанс коллекции вниз детям
    collectionElevator.down(instance)

    // Если у коллекции есть плагин элементов — спускаем регистратор плагинов вниз
    const collectionItemPlugins = bundle.get(TCollectionItemPlugins)

    if (collectionItemPlugins) {
        pluginsElevator.down((uid: string | number, itemBundle: any) => {
            collectionItemPlugins.register(uid, itemBundle)
        })
    }

    // Проверяем DragAndDrop контекст сверху
    const dragContext = dragElevator.up()

    if (dragContext) {
        bundle.get(TDragPlugin)?.activate(instance as any)
    }
}
