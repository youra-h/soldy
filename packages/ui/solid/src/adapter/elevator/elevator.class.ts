/**
 * TSolidElevator — реализация IContextElevator через Solid Context.
 *
 * Наследует TElevator из @soldy/setup (кэширование ключей в уникальные символы).
 *
 * Ограничение то же, что у React: контекст в Solid нельзя положить императивно —
 * значение отдаётся только через `<Context.Provider>` в JSX. Поэтому `down()`
 * кэширует значение локально, а готовый `Context` выставлен наружу, чтобы
 * компонент-владелец мог отрендерить Provider.
 *
 * Пока не подключён: коллекции в Solid не портированы. Когда дойдёт до них,
 * `down()` должен будет уйти в Provider, иначе значение не пересечёт границу
 * компонентов.
 */

import { createContext, useContext } from 'solid-js'
import type { Context } from 'solid-js'
import { TElevator } from '@soldy/setup'

const CONTEXT_CACHE = new Map<symbol, Context<any>>()

function resolveContext<T>(key: symbol): Context<T | undefined> {
	let context = CONTEXT_CACHE.get(key)

	if (!context) {
		context = createContext<T | undefined>(undefined)
		CONTEXT_CACHE.set(key, context)
	}

	return context
}

export class TSolidElevator<T = any> extends TElevator<T> {
	/** Готовый Context — прокинуть значение можно через <el.Context.Provider>. */
	readonly Context: Context<T | undefined>

	private _value: T | undefined

	constructor(key: string | symbol) {
		super(key)

		this.Context = resolveContext<T>(this._key)
	}

	down(value: T): void {
		this._value = value
	}

	up(): T | undefined {
		return useContext(this.Context) ?? this._value
	}
}
