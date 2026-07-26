import type { IAdapterContext } from '../context'
import type { TElevatorFactory } from '../elevator'
import {
	COLLECTION_ELEVATOR,
	COLLECTION_PLUGINS_ELEVATOR,
} from '../elevator/keys'

/** Декоратор элемента коллекции (TabItem, ListItem) */
export function withCollectionItem(elevatorFactory: TElevatorFactory) {
	return (adapter: IAdapterContext) => {
		const collectionElevator = elevatorFactory(COLLECTION_ELEVATOR)
		const pluginsElevator = elevatorFactory(COLLECTION_PLUGINS_ELEVATOR)

		const parentCollection = collectionElevator.up() as
			| { insertAt(item: any, index?: number): boolean; deleteItem(item: any): boolean }
			| undefined

		const registerItemPlugins = pluginsElevator.up() as
			| ((uid: string | number, bundle: any) => void)
			| undefined

		const { instance, bundle } = adapter

		// Автоматическая регистрация в родительской коллекции
		if (parentCollection && instance && instance.collection === null) {
			parentCollection.insertAt(instance)

			// Контекст сам знает, как себя отписать при destroy!
			adapter.onDispose(() => {
				parentCollection.deleteItem(instance)
			})
		}

		if (registerItemPlugins) {
			registerItemPlugins(instance.uid, bundle)
		}
	}
}
