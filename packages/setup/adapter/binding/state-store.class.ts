/**
 * TStateStore — ядро → фреймворк: состояние компонента хранилищем, на которое фреймворк подписывается.
 *
 * Путь у значения из ядра один. Сработал триггер — хранилище перечитывает
 * свойство и отдаёт его подписчикам. Подписался фреймворк при монтировании —
 * хранилище делает то же самое для каждого свойства: перечитывает и отдаёт.
 * Отдельного «стартового состояния» у адаптера нет, и порядок — сначала
 * подписка на триггеры, потом чтение — держит хранилище, а не цикл фреймворка.
 * Раньше адаптер сам брал снимок и сам выбирал, когда подписаться: React и
 * Svelte подписывались в эффекте, и изменение ядра между рендером и эффектом
 * до них не доходило.
 *
 * В состоянии — свойства с триггерами. Без триггеров свойство pass-through
 * (`ctrl`): следить за ним нечем.
 */

import type { TProperty } from '@soldy/accessor'
import type { ISurfaceProp, TBindingSnapshot, TOutputWriter } from './types'

/** Простой объект или массив — снимок составного свойства (`valueOf()`), а не инстанс. */
function isPlain(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false

	const proto: unknown = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === Array.prototype || proto === null
}

/**
 * То же значение для фреймворка. Составные свойства отдают новый снимок на
 * каждое чтение (`TClasses`, наборы `aria`/`attrs`/`dataset`, состав
 * коллекции), поэтому их сверяем поверхностно: иначе каждое чтение выглядело
 * бы изменением, и монтирование перерисовывало бы компонент впустую.
 */
function sameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true
	if (!isPlain(a) || !isPlain(b) || Array.isArray(a) !== Array.isArray(b)) return false

	const keys = Object.keys(a)

	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
	)
}

export class TStateStore {
	private readonly _state = new Map<ISurfaceProp, TProperty>()
	private readonly _listeners = new Set<TOutputWriter>()
	private _snapshot: TBindingSnapshot
	/** Отписка от триггеров ядра; есть, пока есть подписчики. */
	private _disconnect: (() => void) | null = null

	constructor(properties: ReadonlyMap<ISurfaceProp, TProperty>) {
		// Снимок до подписки нужен тем, кто рисует раньше, чем подписывается:
		// React рендерит по нему, а подписка сверит его с ядром
		const snapshot: Record<string, unknown> = {}

		for (const [prop, property] of properties) {
			if (prop.triggers.length === 0) continue

			this._state.set(prop, property)
			snapshot[prop.exportName] = property.value
		}

		this._snapshot = snapshot
	}

	/** Стрелка, а не метод: фреймворк передаёт её дальше без `this` (`useSyncExternalStore`). */
	readonly getSnapshot = (): TBindingSnapshot => this._snapshot

	/** Стрелка, а не метод — по той же причине, что `getSnapshot`. */
	readonly subscribe = (listener: TOutputWriter): (() => void) => {
		// Сначала подписка на триггеры, потом чтение: изменение между ними не теряется
		this._disconnect ??= this._connect()
		this._listeners.add(listener)

		// Монтирование — то же, что срабатывание триггера у каждого свойства
		for (const prop of this._state.keys()) this._refresh(prop, listener)

		return () => {
			this._listeners.delete(listener)

			if (this._listeners.size > 0) return

			this._disconnect?.()
			this._disconnect = null
		}
	}

	/** Подписка на триггеры состояния: на каждый — перечитать своё свойство. */
	private _connect(): () => void {
		const offs = [...this._state].map(([prop, property]) =>
			property.watch(() => this._refresh(prop)),
		)

		return () => offs.forEach((off) => off())
	}

	/**
	 * Перечитать свойство из ядра и отдать подписчикам — один путь на триггер и
	 * на монтирование.
	 *
	 * Свежесть значения — ответственность ядра: составные свойства отдают
	 * снимок через valueOf() (TClasses, драйвер коллекции) либо заменяются
	 * целиком (layout-плагины). Хранилище не угадывает.
	 *
	 * Сменилось значение — снимок заменяется новым объектом и узнают все
	 * подписчики. `mounting` — новый подписчик: он получает значение в любом
	 * случае, это его начальное состояние.
	 */
	private _refresh(prop: ISurfaceProp, mounting?: TOutputWriter): void {
		const property = this._state.get(prop)

		if (!property) return

		const name = prop.exportName
		const value = property.value
		const changed = !sameValue(this._snapshot[name], value)

		if (changed) this._snapshot = { ...this._snapshot, [name]: value }

		const current = this._snapshot[name]

		if (changed) {
			for (const listener of this._listeners) listener(prop, current)
		} else {
			mounting?.(prop, current)
		}
	}
}
