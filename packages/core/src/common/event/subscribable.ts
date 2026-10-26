/** A listener of {@link TSubscribable}: the object has changed, read it anew. */
export type TSubscriber = () => void

/**
 * A plain object that reports its change — the base of the attribute and
 * class sets (`TAttributes`, `TClasses`).
 *
 * It is not a bus: there are no event names, no arguments, no middlewares or
 * relays. There is one fact — "changed" — and whoever listens reads the object
 * itself. That is all a set needs, and a bus per set (`TEvented`) cost every
 * collection item four emitters with a subscription each, even an item that is
 * never drawn.
 *
 * **It pays for a subscription, not for being created.** The only listener
 * lives in a field as is, the list appears with the second one and goes back
 * to a field when one is left. Usually a set is listened to by its owner alone,
 * who re-emits the change as its own `change:<set>`.
 *
 * The list is not edited in place but replaced: a notification iterates the
 * one it found, so a listener added during it is called from the next one, and
 * a removed one is still called in the current one.
 */
export class TSubscribable {
	/** Listeners — one as is, a list from the second. */
	private _subscribers?: TSubscriber | readonly TSubscriber[]

	/**
	 * Listens to the changes of the object. The same listener twice is one
	 * subscription.
	 *
	 * @returns the unsubscription; calling it again does nothing
	 */
	subscribe(subscriber: TSubscriber): () => void {
		const current = this._subscribers

		if (current === undefined) this._subscribers = subscriber
		else if (typeof current === 'function') {
			if (current !== subscriber) this._subscribers = [current, subscriber]
		} else if (!current.includes(subscriber)) this._subscribers = [...current, subscriber]

		return () => this._unsubscribe(subscriber)
	}

	private _unsubscribe(subscriber: TSubscriber): void {
		const current = this._subscribers

		if (current === subscriber) {
			this._subscribers = undefined

			return
		}

		if (current === undefined || typeof current === 'function') return

		const rest = current.filter((s) => s !== subscriber)

		this._subscribers = rest.length === 1 ? rest[0] : rest
	}

	/** Reports the change to every listener. */
	protected _notify(): void {
		const current = this._subscribers

		if (current === undefined) return

		if (typeof current === 'function') {
			current()

			return
		}

		for (const subscriber of current) subscriber()
	}
}
