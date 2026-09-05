/**
 * TAngularElevator — реализация IContextElevator для Angular.
 *
 * Наследует TElevator из @soldy/setup (кэширование ключей).
 *
 * В Angular передача контекста от родителя к потомку реализуется через DI
 * (provide/inject). Каждый elevator создаёт уникальный InjectionToken,
 * который можно использовать в providers (down) и inject() (up).
 *
 * Для collections: родительский компонент делает provide(elevator.token, value),
 * дочерний — inject(elevator.token).
 */

import { InjectionToken } from '@angular/core'
import { TElevator } from '@soldy/setup'

export class TAngularElevator<T = any> extends TElevator<T> {
	/** Angular InjectionToken для передачи значения через provide/inject. */
	readonly token: InjectionToken<T>

	private _value?: T

	constructor(key: string | symbol) {
		super(key)

		const desc = typeof key === 'string' ? key : (key.description ?? String(key))

		this.token = new InjectionToken<T>(desc)
	}

	/** Кэширует значение для передачи потомку. */
	down(value: T): void {
		this._value = value
	}

	/** Возвращает закэшированное значение (для случаев без DI, напр. в тестах). */
	up(): T | undefined {
		return this._value
	}
}
