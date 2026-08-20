/**
 * TCollectionItemExtension — создает контекст для item в родительской коллекции.
 * Контекст позволяет получить доступ к адаптерам коллекции и синхронизировать состояние item с коллекцией.
 *
 * Использование:
 *   adapter.use(TCollectionItemContextExtension<ITabItem, TTabsCollectionExtensions>)
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'

export class TCollectionItemContextExtension<TItem, TCollectionExtensions> {
	static readonly key = Symbol('TCollectionItemExtension')

	constructor(context: IAdapterContext) {}
}
