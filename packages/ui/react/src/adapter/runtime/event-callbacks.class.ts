/**
 * TEventCallbacks — приёмник событий связки: событие уходит колбэку-пропу с
 * тем же именем из пропсов последнего рендера. Класс, а не замыкание:
 * AGENTS.md (React), «Функции дольше рендера — в классах».
 */

import type { TEventSink } from '@soldy-ui/setup'

export class TEventCallbacks {
	private _props: object = {}

	update(props: object): void {
		this._props = props
	}

	readonly sink: TEventSink = (name, args) => {
		const callback: unknown = Reflect.get(this._props, name)

		if (typeof callback === 'function') callback(...args)
	}
}
