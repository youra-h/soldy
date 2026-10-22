/**
 * Слой лифта владельца: свои значения поверх слоя предка. Токен один на слой —
 * провайдеры Angular статичны, и токен на ключ пришлось бы объявлять заранее.
 * `providers`, а не `viewProviders`: слой читают и элементы, которые написал
 * потребитель.
 */

import { InjectionToken, inject, type Provider } from '@angular/core'

export class TElevatorLayer {
	private readonly _own = new Map<symbol, unknown>()

	constructor(private readonly _parent: TElevatorLayer | null) {}

	/** Опущенный `null` — тоже значение: им окно `Virtual` отрезает вложенные списки. */
	read(key: symbol): unknown {
		return this._own.has(key) ? this._own.get(key) : this._parent?.read(key)
	}

	write(key: symbol, value: unknown): void {
		this._own.set(key, value)
	}
}

export const ELEVATOR_LAYER = new InjectionToken<TElevatorLayer>('soldy:elevator')

/** Строка `providers` в декораторе владельца. */
export function provideElevator(): Provider {
	return {
		provide: ELEVATOR_LAYER,
		useFactory: () =>
			new TElevatorLayer(inject(ELEVATOR_LAYER, { skipSelf: true, optional: true })),
	}
}
