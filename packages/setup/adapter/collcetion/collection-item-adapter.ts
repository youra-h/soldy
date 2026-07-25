/**
 * Framework-agnostic адаптер элемента коллекции.
 *
 * Создаёт instance/bundle/accessor через createAdapter и настраивает
 * связь ребёнок-родитель через IContextElevator:
 *   - получает родительскую коллекцию (COLLECTION_ELEVATOR) и регистрируется в ней
 *   - получает регистратор плагинов (COLLECTION_PLUGINS_ELEVATOR) и регистрирует свой bundle
 *   - при размонтировании удаляется из родительской коллекции
 *
 * Не зависит от конкретного фреймворка. Принимает onUnmount — абстрактный
 * коллбэк жизненного цикла, который предоставляет конкретный фреймворк.
 */

import { createAdapter } from '../createAdapter'
import type { IComponentDescriptor } from '../../descriptors'
import type { TElevatorFactory } from '../elevator/keys'
import {
    COLLECTION_ELEVATOR,
    COLLECTION_PLUGINS_ELEVATOR,
} from '../elevator/keys'

export function createCollectionItemAdapter(
    descriptor: IComponentDescriptor,
    options: { ctrl?: any; plugins?: any; props?: any },
    elevatorFactory: TElevatorFactory,
    onUnmount: (callback: () => void) => void,
) {
    // 1. Ищем родительскую коллекцию и регистратор плагинов НАВЕРХУ
    const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
    const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)

    const parentCollection = collectionElevator.up() as
        | { insertAt(item: any, index?: number): boolean; deleteItem(item: any): boolean }
        | undefined

    const registerItemPlugins = pluginsElevator.up() as
        | ((uid: string | number, bundle: any) => void)
        | undefined

    // 2. Инициализируем базовый адаптер
    const adapterResult = createAdapter(descriptor, options)
    const { instance, bundle } = adapterResult

    // Item instance может быть подполем композиции
    const itemInstance = 'collectionItem' in instance ? instance.collectionItem : instance

    // 3. Автоматическая регистрация в родительской коллекции (если в декларативном режиме)
    if (parentCollection && itemInstance && itemInstance.collection === null) {
        parentCollection.insertAt(itemInstance)

        onUnmount(() => {
            parentCollection.deleteItem(itemInstance)
        })
    }

    // 4. Регистрация бандла плагинов элемента в плагине коллекции родителя
    if (registerItemPlugins && itemInstance?.uid) {
        registerItemPlugins(itemInstance.uid, bundle)
    }

    return adapterResult
}
