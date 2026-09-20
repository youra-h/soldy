/**
 * TStateStore — ядро → фреймворк: ячейка на каждое свойство с триггерами и снимок всего состояния.
 *
 * Путь у значения один: сработал триггер — свойство перечитано и положено в
 * ячейку; подписался фреймворк — то же самое для каждого свойства. «Сменилось
 * ли» решает правило равенства ячейки (`sameValue`), поэтому снимок остаётся
 * тем же объектом, пока ни одна ячейка не сменилась, — не проверкой, а по
 * построению.
 *
 * `subscribe` и `getSnapshot` — стрелки: их отдают `useSyncExternalStore` без `this`.
 */

import { TCell } from './cell.class'
import type { TLine } from './line.class'
import type { TStateListener, TStateSnapshot } from './types'
import { sameValue } from './value'

interface IOutput {
	readonly line: TLine
	readonly cell: TCell<unknown>
}

export class TStateStore {
	private readonly _outputs: readonly IOutput[]
	private readonly _listeners = new Set<TStateListener>()
	private _snapshot: TStateSnapshot | null = null
	private _offs: Array<() => void> = []
	private _primed = false

	constructor(lines: readonly TLine[]) {
		this._outputs = lines
			.filter((line) => line.readable)
			// Значения читаются при первом обращении, а не при создании: сборке, которая
			// заводит обмен ради начальных значений, состояние не нужно
			.map((line) => ({ line, cell: new TCell<unknown>(undefined, sameValue) }))

		for (const { line, cell } of this._outputs) {
			cell.listen((value) => {
				this._snapshot = null

				for (const listener of [...this._listeners]) listener(line.name, value)
			})
		}
	}

	readonly subscribe = (listener: TStateListener): (() => void) => {
		// Сначала подписка на триггеры, потом чтение: иначе изменение между ними теряется
		if (this._listeners.size === 0) this._activate()

		this._refresh()
		this._listeners.add(listener)

		for (const { line, cell } of this._outputs) listener(line.name, cell.value)

		return () => {
			this._listeners.delete(listener)

			if (this._listeners.size === 0) this._deactivate()
		}
	}

	readonly getSnapshot = (): TStateSnapshot => {
		// Первое обращение читает значения; дальше снимок меняют только триггеры и
		// подписка. Рендер React зовёт снимок без подписки и обязан получать тот же
		// объект — изменение ядра между рендером и подпиской подхватит `subscribe`
		if (!this._primed) this._refresh()

		this._snapshot ??= Object.freeze(
			Object.fromEntries(this._outputs.map(({ line, cell }) => [line.name, cell.value])),
		)

		return this._snapshot
	}

	/** Подписка на шину владельца живёт, пока есть хоть один подписчик. */
	private _activate(): void {
		this._offs = this._outputs.map(({ line, cell }) => line.watch(() => cell.set(line.read())))
	}

	private _deactivate(): void {
		for (const off of this._offs) off()

		this._offs = []
	}

	private _refresh(): void {
		this._primed = true

		for (const { line, cell } of this._outputs) cell.set(line.read())
	}
}
