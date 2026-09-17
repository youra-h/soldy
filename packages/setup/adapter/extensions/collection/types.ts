/**
 * Контракты расширений коллекции: инстанс, к которому они подключаются, и их опции.
 */

import type { TCollectionEngine, TItemContext } from '@soldy/core'
import type { TElevatorFactory } from '../../elevator'

/** Инстанс, к которому подключается расширение: фасад, владеющий коллекцией. */
export type TCollectionOwner = {
	readonly engine: TCollectionEngine<any, any>
}

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

/** Инстанс, к которому подключается расширение: item-фасад, принимающий контекст элемента. */
export type TCollectionItemFacade = {
	setContext(context: TItemContext<any, any>): void
}

export interface ICollectionItemExtensionOptions {
	/** Реальный элемент коллекции (инстанс из owner-дескриптора). */
	item: object
	elevator: TElevatorFactory
}
