/**
 * TSvelteElevator — реализация IContextElevator через setContext/getContext.
 *
 * Наследует TElevator из @soldy/setup (кэширование ключей в уникальные символы).
 *
 * Ключевое ограничение Svelte: setContext/getContext вызываются только во время
 * инициализации компонента — то же ограничение, что у provide/inject во Vue,
 * поэтому расширения подключаются прямо в setup-слое.
 */

import { getContext, setContext } from 'svelte'
import { TElevator } from '@soldy/setup'

export class TSvelteElevator<T = any> extends TElevator<T> {
	down(value: T): void {
		setContext(this._key, value)
	}

	up(): T | undefined {
		return getContext<T | undefined>(this._key)
	}
}
