/**
 * Contracts of the collection extensions: the instance each is installed on, and its options.
 */

import type { TCollectionEngine, TItemContext } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * The instance `TCollectionExtension` is installed on: the facade that owns
 * the collection. Acceptance binds the owner to the engine, destruction
 * releases it.
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
 * The instance `TCollectionItemExtension` is installed on: the item facade,
 * which takes the item context for the mount and lets it go at the end.
 */
export type TCollectionItemFacade = {
	setContext(context: TItemContext<any, any>): void
	clearContext(): void
}

/** A context the collection detaches with itself (`TCollectionMembers`). */
export interface IDetachable {
	detach(): void
}

export interface ICollectionItemExtensionOptions {
	/** The collection's item: the instance of the item's own descriptor. */
	item: object
	/** The item's own context: the collection detaches it with itself. */
	member: IDetachable
	elevator: TElevatorFactory
}
