/**
 * Декоратор элемента коллекции.
 *
 * Принимает готовый adapter { instance, bundle } и настраивает
 * связь ребёнок-родитель через IContextElevator:
 *   - получает родительскую коллекцию (COLLECTION_ELEVATOR) и регистрируется в ней
 *   - получает регистратор плагинов (COLLECTION_PLUGINS_ELEVATOR) и регистрирует свой bundle
 *   - при размонтировании удаляется из родительской коллекции
 *
 * Не зависит от конкретного фреймворка. Принимает onUnmount — абстрактный
 * коллбэк жизненного цикла, который предоставляет конкретный фреймворк.
 */

import type { TElevatorFactory } from '../elevator'
import type { IAdapter } from '../types'
import {
    COLLECTION_ELEVATOR,
    COLLECTION_PLUGINS_ELEVATOR,
} from '../elevator'

export function decorateCollectionItem(
    adapter: IAdapter,
    elevatorFactory: TElevatorFactory,
    onUnmount: (callback: () => void) => void,
): void {
    const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
    const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)

    const parentCollection = collectionElevator.up() as
        | { insertAt(item: any, index?: number): boolean; deleteItem(item: any): boolean }
        | undefined

    const registerItemPlugins = pluginsElevator.up() as
        | ((uid: string | number, bundle: any) => void)
        | undefined

    const { instance, bundle } = adapter

    // Автоматическая регистрация в родительской коллекции (если в декларативном режиме)
    if (parentCollection && instance && instance.collection === null) {
        parentCollection.insertAt(instance)

        onUnmount(() => {
            parentCollection.deleteItem(instance)
        })
    }

    if (registerItemPlugins) {
        registerItemPlugins(instance.uid, bundle)
    }
}
