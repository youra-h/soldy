/**
 * TCollectionItemExtension — единая точка входа для настройки элемента коллекции.
 *
 * Композиция из трёх шагов:
 *   1. создание TItemContext (TCollectionItemContextExtension);
 *   2. регистрация элемента в родительской коллекции (COLLECTION_ELEVATOR);
 *   3. применение item-метаданных (TCollectionItemMetaExtension) — после вставки.
 *
 * `descriptor` опционален: если он не задан, шаги 1 и 3 пропускаются
 * (остаётся только регистрация элемента).
 *
 * Использование:
 *   adapter.use(TCollectionItemExtension, { descriptor, elevator })
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'
import { TCollectionItemContextExtension } from './collection-item-context.extension.class'
import { TCollectionItemMetaExtension } from './collection-item-meta.extension.class'
import type { ICollectionDescriptor } from '@soldy/setup'

export interface ICollectionItemExtensionOptions {
	/** Дескриптор коллекции. Если задан — создаётся контекст и применяется meta. */
	descriptor?: ICollectionDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemExtension {
	constructor(context: IAdapterContext, options: ICollectionItemExtensionOptions) {
		const { descriptor, elevator } = options

		// 1. TItemContext (item-адаптеры) — нужен useVueCollectionItem.
		if (descriptor) {
			context.use(TCollectionItemContextExtension, { descriptor, elevator })
		}

		// 2. Регистрация элемента в родительской коллекции.
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const register = itemElevator.up() as
			| ((item: any, bundle: any) => () => void)
			| undefined

		if (register) {
			const cleanup = register(context.instance, context.bundle)

			context.events.on('destroy', cleanup)
		}

		// 3. Item-метаданные — после вставки элемента.
		if (descriptor) {
			context.use(TCollectionItemMetaExtension, { descriptor, elevator })
		}
	}
}
