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

/**
 * Один Context на ключ: провайдер и потребитель обязаны получить один и тот же
 * объект. Значения разных ключей разного типа, поэтому кэш хранит `unknown`, а
 * тип значения задаёт ключ elevator'а.
 */
const CONTEXT_CACHE = new Map<symbol, Context<unknown>>()

function resolveContext(key: symbol): Context<unknown> {
	let context = CONTEXT_CACHE.get(key)

	if (!context) {
		context = createContext<unknown>(undefined)
		CONTEXT_CACHE.set(key, context)
	}

	return context
}

export class TSolidElevator<T = unknown> extends TElevator<T> {
	/** Готовый Context — прокинуть значение можно через <el.Context.Provider>. */
	readonly Context: Context<unknown>

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
