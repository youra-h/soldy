/**
 * TCell — ячейка: значение, правило «то же самое» и подписчики.
 *
 * Единственная изменяемая память слоя. Всё, что слой обязан помнить между
 * вызовами, лежит в ячейках: последнее отданное значение свойства, последнее
 * значение, которое задал фреймворк, мешок `pluginProps`. Отдельных «памятей»
 * с ручными флагами «задан / не задан» нет — их роль играет само значение
 * ячейки и её правило равенства.
 *
 * Контракт подписки — как у стора Svelte и атома nanostores: `subscribe` сразу
 * отдаёт текущее значение («инициализация — это и есть подписка»), `listen` —
 * только изменения.
 */

import type { TCellListener, TSame } from './types'

export class TCell<T> {
	private readonly _listeners = new Set<TCellListener<T>>()

	constructor(
		private _value: T,
		private readonly _same: TSame<T> = Object.is,
	) {}

	get value(): T {
		return this._value
	}

	/** Положить значение. «То же самое» не кладётся и подписчиков не будит — ответ `false`. */
	set(next: T): boolean {
		if (this._same(this._value, next)) return false

		this._value = next

		for (const listener of [...this._listeners]) listener(next)

		return true
	}

	/** Слушать только изменения. */
	listen(listener: TCellListener<T>): () => void {
		this._listeners.add(listener)

		return () => {
			this._listeners.delete(listener)
		}
	}

	/** Слушать изменения и сразу получить текущее значение. */
	subscribe(listener: TCellListener<T>): () => void {
		const off = this.listen(listener)

		listener(this._value)

		return off
	}
}
