/**
 * Контракты расширений коллекции: инстанс, к которому они подключаются, и их опции.
 */

import type { TCollectionEngine, TItemContext } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Инстанс, к которому подключается расширение: фасад, владеющий коллекцией.
 * Принятие компонента привязывает владельца к движку, уничтожение — снимает.
 */
export type TCollectionOwner = {
	readonly engine: TCollectionEngine<any, any>
	bindOwner(): void
	releaseOwner(): void
}

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

/**
 * Инстанс, к которому подключается расширение: item-фасад, принимающий контекст
 * элемента на монтирование и отпускающий его в конце.
 */
export type TCollectionItemFacade = {
	setContext(context: TItemContext<any, any>): void
	clearContext(): void
}

/** What the collection detaches with itself: a context of a member (`TCollectionMembers`). */
export interface IDetachable {
	detach(): void
}

/**
 * The own context of a component in a collection — of its own descriptor,
 * not of the facade: its instance is the collection's element, and the
 * collection detaches it with itself (`TCollectionMembers`).
 */
export type TCollectionMember<TInstance extends object = object> = {
	readonly instance: TInstance
	detach(): void
}

export interface ICollectionItemExtensionOptions {
	/** The item's own context: its instance is the collection's element. */
	item: TCollectionMember
	elevator: TElevatorFactory
}
