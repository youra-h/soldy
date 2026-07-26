/**
 * TCollectionItemExtension — авто-регистрация элемента в родительской коллекции.
 *
 * Использование:
 *   adapter.use(TCollectionItemExtension, { elevator: vueElevatorFactory })
 */

import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import {
    COLLECTION_ELEVATOR,
    COLLECTION_PLUGINS_ELEVATOR,
} from '../elevator/keys'

export interface ICollectionItemExtensionOptions {
    elevator: TElevatorFactory
}

export class TCollectionItemExtension {
    static readonly key = Symbol('TCollectionItemExtension')

    constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
        const { elevator } = options
        const collectionElevator = elevator(COLLECTION_ELEVATOR)
        const pluginsElevator = elevator(COLLECTION_PLUGINS_ELEVATOR)

        const parentCollection = collectionElevator.up() as
            | { insertAt(item: any, index?: number): boolean; deleteItem(item: any): boolean }
            | undefined

        const registerItemPlugins = pluginsElevator.up() as
            | ((uid: string | number, bundle: any) => void)
            | undefined

        const { instance, bundle } = context

        // Автоматическая регистрация в родителе
        if (parentCollection && instance && instance.collection === null) {
            parentCollection.insertAt(instance)

            // Удаляем себя из родительской коллекции при destroy
            context.events.on('destroy', () => {
                parentCollection.deleteItem(instance)
            })
        }

        if (registerItemPlugins) {
            registerItemPlugins(instance.uid, bundle)
        }
    }
}
