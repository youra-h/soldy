/**
 * TUpdatePort — the exchange tells the framework where an update begins and ends.
 *
 * An update is the exchange's unit of work: one event of a participant (the
 * state rereads the event's properties, then the event and its models go to
 * the sinks) or one release of the queue after another mount's assembly
 * (`TExchange`). The port only reports the bounds — what the framework does
 * with them is the adapter's call. The exchange marks every update, nested
 * ones too: a sink that writes to a participant starts an update inside the
 * current one, and a listener that needs only the outermost counts them
 * itself. `end` comes even when a sink throws.
 *
 * No listener — nothing is called: an exchange of a plugin installed from
 * outside has no framework to tell.
 */

import type { IUpdateListener } from './types'

export class TUpdatePort {
	/** Listeners — while there is at least one. The list is not edited in place: a bound goes to the one it found. */
	private _listeners?: readonly IUpdateListener[]

	listen(listener: IUpdateListener): () => void {
		this._listeners = this._listeners ? [...this._listeners, listener] : [listener]

		return () => {
			const listeners = this._listeners
			const index = listeners?.indexOf(listener) ?? -1

			if (listeners === undefined || index === -1) return

			this._listeners =
				listeners.length === 1
					? undefined
					: [...listeners.slice(0, index), ...listeners.slice(index + 1)]
		}
	}

	/** An update begins. Called by the exchange, not by the adapter. */
	begin(): void {
		const listeners = this._listeners

		if (listeners) for (const listener of listeners) listener.begin()
	}

	/** The update ended — its state reread and its events handed over. Called by the exchange. */
	end(): void {
		const listeners = this._listeners

		if (listeners) for (const listener of listeners) listener.end()
	}
}
