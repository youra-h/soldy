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

/**
 * Один Context на ключ: провайдер и потребитель обязаны получить один и тот же
 * объект. Значения разных ключей разного типа, поэтому кэш хранит `unknown`, а
 * тип значения задаёт ключ elevator'а.
 */
const CONTEXT_CACHE = new Map<symbol, React.Context<unknown>>()

function resolveContext(key: symbol): React.Context<unknown> {
	let ctx = CONTEXT_CACHE.get(key)

	if (!ctx) {
		ctx = createContext<unknown>(undefined)
		CONTEXT_CACHE.set(key, ctx)
	}

	return ctx
}

export class TReactElevator<T = unknown> extends TElevator<T> {
	/** Готовый Context, чтобы прокинуть значение через JSX: <el.Context.Provider value={...}>. */
	readonly Context: React.Context<unknown>

	private _value: T | undefined

	constructor(key: string | symbol) {
		super(key)

		this.Context = resolveContext(this._key)
	}

	down(value: T): void {
		this._value = value
	}

	up(): T | undefined {
		// Тип значения задаёт ключ elevator'а: под этим ключом кладут только `T`
		const fromContext = useContext(this.Context) as T | undefined

		return fromContext ?? this._value
	}
}
