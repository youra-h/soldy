/**
 * TEventCallbacks — the binding's event sink: an event goes to the callback
 * prop of the same name from the last render's props. A class, not a closure:
 * AGENTS.md (React), «Функции дольше рендера — в классах».
 */

import type { IAdapterContext, TEventSink, TExchange } from '@soldy-ui/setup'
import { isAccepting } from './accepting'

export class TEventCallbacks {
	private _props: object = {}
	/** The subscription of the last `listen`. */
	private _stop?: () => void

	/** @param _adapter the context whose events the sink takes */
	constructor(private readonly _adapter: IAdapterContext) {}

	update(props: object): void {
		this._props = props
	}

	readonly sink: TEventSink = (name, args) => {
		// What the acceptance writes is the starting state (`TBuilt.accept`)
		if (isAccepting(this._adapter)) return

		const callback: unknown = Reflect.get(this._props, name)

		if (typeof callback === 'function') callback(...args)
	}

	/**
	 * Listen to the binding until the context's `detach`, which comes from the
	 * teardown's first moment or, for a collection item, from its collection.
	 * Returns the layout effect's cleanup (`release`).
	 */
	listen(binding: TExchange): () => void {
		const stop = binding.events.listen(this.sink)

		this._stop = stop
		this._adapter.events.on('detach', stop)

		return this.release
	}

	/**
	 * The layout effect's cleanup is the teardown's first moment: React runs
	 * every layout cleanup of a removed subtree before any passive one, and the
	 * destruction is a passive cleanup (`useAdapterContext`). So it ends the
	 * subscription and detaches the context.
	 */
	readonly release = (): void => {
		this._stop?.()
		this._stop = undefined
		this._adapter.detach()
	}
}
