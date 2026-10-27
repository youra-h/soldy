/**
 * Ключ лифта реестра наборов коллекции: владелец опускает по нему детям
 * реестр наборов своих элементов (`TCollectionBundlesPlugin`), рядом с
 * движком.
 *
 * Лежит отдельно от проводки, как ключ группы (`ITEM_GROUP_ELEVATOR`): лифт
 * берёт любой ключ, поэтому ключ — в наполнении, а не в механике лифта.
 */

import type { TCollectionBundlesPlugin } from '@soldy-ui/plugins'
import type { IElevatorKey } from '../../../protected/adapter/elevator'
import type { TCollectionMembers } from './members.class'

/**
 * Реестр наборов элементов ближайшей коллекции — того же владельца, что
 * движок под `ITEM_CONTEXT_ELEVATOR`. Набор элемента в нём — нынешнего
 * монтирования. Пустое значение опускает владелец без реестра: реестр
 * коллекции выше до его поддерева не доходит.
 */
export const COLLECTION_BUNDLES_ELEVATOR: IElevatorKey<TCollectionBundlesPlugin | null> = {
	name: 'soldy:collection-bundles',
}

/**
 * The members of the nearest collection — of the same owner as the engine
 * under `ITEM_CONTEXT_ELEVATOR`: an item and a part bound to an item join it
 * on entering and leave it when their mount ends.
 */
export const COLLECTION_MEMBERS_ELEVATOR: IElevatorKey<TCollectionMembers> = {
	name: 'soldy:collection-members',
}
