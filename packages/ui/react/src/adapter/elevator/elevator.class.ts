/**
 * TReactElevator — реализация IContextElevator через React Context.
 *
 * Наследует TElevator из @soldy/setup (кэширование ключей).
 *
 * В отличие от Vue (provide/inject), React-контекст нельзя прокинуть
 * императивно. Поэтому:
 * - `down(value)` кэширует значение в инстансе (императивный путь);
 * - `up()` читает значение через `useContext` и должен вызываться во время
 *   рендера React-компонента (падает на `_value`, если контекст не задан).
 */

import { createContext, useContext } from 'react'
import { TElevator } from '@soldy/setup'

const CONTEXT_CACHE = new Map<symbol, React.Context<any>>()

function resolveContext<T>(key: symbol): React.Context<T | undefined> {
	let ctx = CONTEXT_CACHE.get(key)

	if (!ctx) {
		ctx = createContext<T | undefined>(undefined)
		CONTEXT_CACHE.set(key, ctx)
	}

	return ctx
}

export class TReactElevator<T = any> extends TElevator<T> {
	/** Готовый Context, чтобы прокинуть значение через JSX: <el.Context.Provider value={...}>. */
	readonly Context: React.Context<T | undefined>

	private _value: T | undefined

	constructor(key: string | symbol) {
		super(key)

		this.Context = resolveContext<T>(this._key)
	}

	down(value: T): void {
		this._value = value
	}

	up(): T | undefined {
		const fromContext = useContext(this.Context)

		return fromContext ?? this._value
	}
}
