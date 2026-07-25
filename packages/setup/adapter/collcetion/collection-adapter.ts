/**
 * Framework-agnostic адаптер родительской коллекции.
 *
 * Создаёт instance/bundle/accessor через createAdapter и настраивает
 * связь родитель-ребёнок через IContextElevator:
 *   - спускает коллекцию детям (COLLECTION_ELEVATOR)
 *   - спускает регистратор плагинов детям (COLLECTION_PLUGINS_ELEVATOR)
 *   - проверяет drag-and-drop контекст от родителя (DRAG_CONTEXT_ELEVATOR)
 *
 * Не зависит от конкретного фреймворка. Используется как фундамент для
 * Vue-обертки useCollectionAdapter, React-обертки и т.д.
 */

import { createAdapter } from '../createAdapter'
import type { IComponentDescriptor } from '../../descriptors'
import type { TElevatorFactory } from '../elevator'
import {
    COLLECTION_ELEVATOR,
    COLLECTION_PLUGINS_ELEVATOR,
    DRAG_CONTEXT_ELEVATOR,
} from '../elevator/keys'
import { TCollectionItemPlugins, TDragPlugin } from '@soldy/plugins'

export function createCollectionAdapter(
    descriptor: IComponentDescriptor,
    options: { ctrl?: any; plugins?: any; props?: any },
    elevatorFactory: TElevatorFactory,
) {
    // 1. Создаём абстрактные элеваторы через переданную фабрику
    const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
    const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)
    const dragElevator = elevatorFactory(DRAG_CONTEXT_ELEVATOR)

    // 2. Инициализируем базовый адаптер
    const adapterResult = createAdapter(descriptor, options)
    const { instance, bundle } = adapterResult

    // Коллекция может быть как самим instance, так и его свойством (например, ctrl.collection в Tabs)
    const collectionInstance = 'collection' in instance ? instance.collection : instance

    // 3. Спускаем инстанс коллекции вниз детям
    collectionElevator.down(collectionInstance)

    // 4. Если у коллекции есть плагин элементов — спускаем регистратор плагинов вниз
    const collectionItemPlugins = bundle.get(TCollectionItemPlugins)

	if (collectionItemPlugins) {
        pluginsElevator.down((uid: string | number, itemBundle: any) => {
            collectionItemPlugins.register(uid, itemBundle)
        })
    }

    // 5. Проверяем DragAndDrop контекст сверху (если родитель дал drag context)
    const dragContext = dragElevator.up()
    if (dragContext) {
        bundle.get(TDragPlugin)?.activate(collectionInstance)
    }

    return adapterResult
}
