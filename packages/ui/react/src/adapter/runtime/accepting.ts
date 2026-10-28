/**
 * The contexts being accepted right now, only while `TBuilt.accept` runs. The
 * consumer's sink of such a context drops its events (`TEventCallbacks`):
 * what the acceptance writes is the starting state.
 */

import type { IAdapterContext } from '@soldy-ui/setup'

const now = new Set<IAdapterContext>()

/** Run the acceptance of the contexts with their consumers silent. */
export function accepting(
	contexts: IAdapterContext | readonly IAdapterContext[],
	accept: () => void,
): void {
	const list = Array.isArray(contexts) ? contexts : [contexts]

	for (const context of list) now.add(context)

	try {
		accept()
	} finally {
		for (const context of list) now.delete(context)
	}
}

/** Whether the context is being accepted right now. */
export function isAccepting(context: IAdapterContext): boolean {
	return now.has(context)
}
