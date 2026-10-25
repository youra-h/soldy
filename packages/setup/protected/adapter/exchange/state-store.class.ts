/**
 * TStateStore — ядро → фреймворк: значение каждого свойства с триггерами и снимок всего состояния.
 *
 * Путь у значения один: сработал триггер — свойство перечитано и положено на
 * своё место; подписался фреймворк — то же самое для каждого свойства.
 * «Сменилось ли» решает одно правило равенства (`sameValue`), поэтому снимок
 * остаётся тем же объектом, пока ни одно значение не сменилось, — не
 * проверкой, а по построению.
 *
 * Значения лежат одним списком по линиям (значение `i` — линии `i`), а не
 * ячейкой на свойство: подписчиков у отдельного свойства нет — уведомляет
 * состояние целиком, — и объект на свойство был бы только обёрткой над
 * значением. Список заводит первое чтение: обмену плагина, поставленного
 * снаружи, состояние не нужно — ему хватает входов и событий.
 *
 * За триггерами следит слушатель участников обмена (`TTap`): состояние держит
 * его, пока у него есть подписчики, а слушатель зовёт `refresh` со
 * значениями, для чьих свойств событие — триггер.
 *
 * `subscribe` и `getSnapshot` — методы: фреймворк, которому они нужны без
 * `this` (`useSyncExternalStore`), привязывает их у себя в адаптере.
 */

import type { TLine } from './line.class'
import type { TTap } from './tap.class'
import type { TStateListener, TStateSnapshot } from './types'
import { sameValue } from './value'

export class TStateStore {
	/** Значения по линиям — с первого чтения. */
	private _values?: unknown[]
	/** Подписчики — пока есть хоть один. Список не правится на месте: уведомление обходит тот, что застало. */
	private _listeners?: readonly TStateListener[]
	private _snapshot: TStateSnapshot | null = null

	/**
	 * @param _lines линии с триггерами: значение `i` — линии `i`
	 * @param _owners владельцы участников монтирования — по порядку состава
	 * @param _tap слушатель участников, общий с событиями обмена
	 */
	constructor(
		private readonly _lines: readonly TLine[],
		private readonly _owners: readonly object[],
		private readonly _tap: TTap,
	) {}

	subscribe(listener: TStateListener): () => void {
		// Сначала подписка на триггеры, потом чтение: иначе изменение между ними теряется
		if (this._listeners === undefined) this._tap.hold()

		const values = this._refresh()
		const listeners = this._listeners

		// Литерал, а не спред в пустой список: у массива, собранного по элементу,
		// запас под рост, а подписчик у состояния обычно один
		if (!listeners) this._listeners = [listener]
		else if (!listeners.includes(listener)) this._listeners = [...listeners, listener]

		this._lines.forEach((line, index) => listener(line.name, values[index]))

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

	getSnapshot(): TStateSnapshot {
		// Первое обращение читает значения; дальше снимок меняют только триггеры и
		// подписка. Рендер React зовёт снимок без подписки и обязан получать тот же
		// объект — изменение ядра между рендером и подпиской подхватит `subscribe`
		const values = this._values ?? this._refresh()

		this._snapshot ??= Object.freeze(
			Object.fromEntries(this._lines.map((line, index) => [line.name, values[index]])),
		)

		return this._snapshot
	}

	/**
	 * Сработал триггер: перечитать значения его свойств. Зовёт слушатель
	 * участников (`TTap`), а не адаптер. Пока состояние не слушают, значения не
	 * перечитываются — их перечитает подписка.
	 */
	refresh(cells: readonly number[]): void {
		const values = this._values

		if (this._listeners === undefined || values === undefined) return

		for (const index of cells) this._read(values, index)
	}

	/**
	 * Перечитать все значения: триггеры пришли во время чужой сборки, и обмен
	 * отложил их (`TExchange`). Пока состояние не слушают — как у `refresh`.
	 */
	refreshAll(): void {
		if (this._listeners !== undefined) this._refresh()
	}

	private _refresh(): unknown[] {
		// `map`, а не `new Array(n)`: список без дыр и ровно по числу линий
		const values = (this._values ??= this._lines.map(() => undefined))

		for (let index = 0; index < this._lines.length; index++) this._read(values, index)

		return values
	}

	/** Перечитать свойство: сменилось — снимок устарел, подписчики получают новое значение. */
	private _read(values: unknown[], index: number): void {
		const line = this._lines[index]
		const value = line.read(this._owners)

		if (sameValue(values[index], value)) return

		values[index] = value
		this._snapshot = null

		const listeners = this._listeners

		if (listeners) for (const listener of listeners) listener(line.name, value)
	}
}
