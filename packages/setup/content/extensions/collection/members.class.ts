/**
 * TCollectionMembers — the contexts of a collection's members mounted now:
 * its items and the parts bound to them (a panel of Tabs). The collection
 * detaches them with itself.
 *
 * A framework that removes a subtree in one pass (Svelte, Solid, Angular)
 * destroys the members one by one: the first to go leaves the collection, and
 * the others — still mounted — hear their order and the activation move. Two
 * passes (Vue, React) end every subscription before anything is destroyed.
 * The owner's `detach` is the first moment of its teardown in every adapter,
 * before its children go, so the collection reports it to its members as
 * their own (`IAdapterContext.detach`), and what follows is up to the
 * adapter: the consumer hears nothing from then on.
 */

import type { IDetachable } from './types'

export class TCollectionMembers {
	private readonly _contexts = new Set<IDetachable>()

	/** A member joined the collection: its contexts. */
	add(...contexts: readonly IDetachable[]): void {
		for (const context of contexts) this._contexts.add(context)
	}

	/** A member's mount ended. */
	delete(...contexts: readonly IDetachable[]): void {
		for (const context of contexts) this._contexts.delete(context)
	}

	/** The collection began coming down: its members did too. */
	detach(): void {
		for (const context of this._contexts) context.detach()
	}
}
