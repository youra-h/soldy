/**
 * TStateStore — ядро → фреймворк: ячейка на каждое свойство с триггерами и снимок всего состояния.
 *
 * Путь у значения один: сработал триггер — свойство перечитано и положено в
 * ячейку; подписался фреймворк — то же самое для каждого свойства. «Сменилось
 * ли» решает правило равенства ячейки (`sameValue`), поэтому снимок остаётся
 * тем же объектом, пока ни одна ячейка не сменилась, — не проверкой, а по
 * построению.
 *
 * За триггерами следит слушатель участников обмена (`TTap`): состояние держит
 * его, пока у него есть подписчики, а слушатель зовёт `refresh` с ячейками,
 * для чьих свойств событие — триггер. На свои ячейки состояние не
 * подписывается: что значение сменилось, оно узнаёт из ответа `set()`.
 *
 * `subscribe` и `getSnapshot` — стрелки: их отдают `useSyncExternalStore` без `this`.
 */

import { TCell } from './cell.class'
import type { TLine } from './line.class'
import type { TTap } from './tap.class'
import type { TStateListener, TStateSnapshot } from './types'
import { sameValue } from './value'

export class TStateStore {
	private readonly _cells: readonly TCell<unknown>[]
	/** Подписчики — пока есть хоть один. Список не правится на месте: уведомление обходит тот, что застало. */
	private _listeners?: readonly TStateListener[]
	private _snapshot: TStateSnapshot | null = null
	private _primed = false

	/**
	 * @param _lines линии с триггерами: ячейка `i` — линия `i`
	 * @param _tap слушатель участников, общий с событиями обмена
	 */
	constructor(
		private readonly _lines: readonly TLine[],
		private readonly _tap: TTap,
	) {
		// Значения читаются при первом обращении, а не при создании: обмену плагина,
		// поставленного снаружи, состояние не нужно — ему хватает входов и событий
		this._cells = _lines.map(() => new TCell<unknown>(undefined, sameValue))
	}

	readonly subscribe = (listener: TStateListener): (() => void) => {
		// Сначала подписка на триггеры, потом чтение: иначе изменение между ними теряется
		if (this._listeners === undefined) this._tap.hold()

		this._refresh()

		const listeners = this._listeners

		// Литерал, а не спред в пустой список: у массива, собранного по элементу,
		// запас под рост, а подписчик у состояния обычно один
		if (!listeners) this._listeners = [listener]
		else if (!listeners.includes(listener)) this._listeners = [...listeners, listener]

		this._lines.forEach((line, index) => listener(line.name, this._cells[index].value))

		return () => {
			const current = this._listeners
			const index = current?.indexOf(listener) ?? -1

			if (current === undefined || index === -1) return

			this._listeners =
				current.length === 1
					? undefined
					: [...current.slice(0, index), ...current.slice(index + 1)]

			if (this._listeners === undefined) this._tap.release()
		}
	}

	readonly getSnapshot = (): TStateSnapshot => {
		// Первое обращение читает значения; дальше снимок меняют только триггеры и
		// подписка. Рендер React зовёт снимок без подписки и обязан получать тот же
		// объект — изменение ядра между рендером и подпиской подхватит `subscribe`
		if (!this._primed) this._refresh()

		this._snapshot ??= Object.freeze(
			Object.fromEntries(
				this._lines.map((line, index) => [line.name, this._cells[index].value]),
			),
		)

		return this._snapshot
	}

	/**
	 * Сработал триггер: перечитать ячейки его свойств. Зовёт слушатель
	 * участников (`TTap`), а не адаптер. Пока состояние не слушают, ячейки не
	 * перечитываются — их перечитает подписка.
	 */
	refresh(cells: readonly number[]): void {
		if (this._listeners === undefined) return

		for (const index of cells) this._read(index)
	}

	private _refresh(): void {
		this._primed = true

		for (let index = 0; index < this._lines.length; index++) this._read(index)
	}

	/** Перечитать свойство: сменилось — снимок устарел, подписчики получают новое значение. */
	private _read(index: number): void {
		const line = this._lines[index]
		const value = line.read()

		if (!this._cells[index].set(value)) return

		this._snapshot = null

		const listeners = this._listeners

		if (listeners) for (const listener of listeners) listener(line.name, value)
	}
}
