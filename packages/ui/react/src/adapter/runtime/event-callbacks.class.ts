/**
 * TEventCallbacks — the binding's event sink: an event goes to the callback
 * prop of the same name from the last render's props. A class, not a closure:
 * AGENTS.md (React), «Функции дольше рендера — в классах».
 */

import type { IAdapterContext, TEventSink, TExchange } from '@soldy-ui/setup'
import { isAccepting } from './accepting'

export class TEventCallbacks {
	private _props: object = {}

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
	 * Listen to the binding until the context's `detach` — from the teardown's
	 * first moment or from the collection the component is an item of: the
	 * consumer hears nothing from then on. Returns the unsubscription.
	 */
	listen(binding: TExchange): () => void {
		const stop = binding.events.listen(this.sink)

		this._adapter.events.on('detach', stop)

		return stop
	}
}
