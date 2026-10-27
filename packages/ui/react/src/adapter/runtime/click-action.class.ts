/**
 * TClickAction — the action of a part on a click, as a native listener on the
 * node: AGENTS.md (React), «Клик части». A class, not a closure:
 * AGENTS.md (React), «Функции дольше рендера — в классах».
 */

export class TClickAction {
	private _action: (event: Event) => void = () => {}
	private _node: Element | null = null

	/** The action of the last render. */
	update(action: (event: Event) => void): void {
		this._action = action
	}

	/** The ref of the node: the listener moves with the node. */
	readonly ref = (node: Element | null): void => {
		if (node === this._node) return

		this._node?.removeEventListener('click', this._listener)
		this._node = node
		node?.addEventListener('click', this._listener)
	}

	private readonly _listener = (event: Event): void => {
		this._action(event)
	}
}
