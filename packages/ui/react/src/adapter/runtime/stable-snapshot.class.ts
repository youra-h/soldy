/**
 * TStableSnapshot — снимок состояния связки, каким его видит React: значение,
 * не сменившееся по содержимому, остаётся прежним объектом.
 *
 * React узнаёт об изменении по идентичности — и снимка (`useSyncExternalStore`),
 * и пропа (граница перерисовки, `withRenderBoundary`). Ядро отдаёт значения, а
 * не ручки (AGENTS.md, «Контракт границы core → ui»), и составное значение
 * собирает заново на каждое чтение. Связка сверяет его поверхностно, а
 * вложенное — массив ячеек строки таблицы, где каждая ячейка — объект со своими
 * `aria` и `dataset`, — при каждом чтении выходит новым.
 *
 * Читает же React состояние дважды: снимок на рендере и снова при подписке после
 * коммита — так изменение ядра между ними не теряется. Второе чтение того же
 * давало новые объекты, и каждый компонент сразу после монтирования
 * перерисовывался, а строка таблицы — со всеми ячейками и слотом `cell` на каждую.
 *
 * Поэтому сменившееся по связке значение здесь сверяется с прежним по
 * содержимому, вглубь простых объектов и массивов; остальное — экземпляры
 * классов, функции — по идентичности. Совпало — остаётся прежний объект, и,
 * если совпало всё, прежний снимок: React перерисовывать нечего. Сверка идёт,
 * только когда связка отдала новый снимок, — не на каждый рендер, — и
 * несменившееся свойство связка отдаёт тем же объектом: на нём сверка кончается
 * сразу.
 */

import type { TStateSnapshot } from '@soldy-ui/setup'

function isPlain(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const proto: unknown = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === null
}

/** Одно и то же по содержимому: простые объекты и массивы — вглубь, остальное — по идентичности. */
function sameContent(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => sameContent(item, b[index]))
	}

	if (Array.isArray(a) || Array.isArray(b) || !isPlain(a) || !isPlain(b)) return false

	const keys = Object.keys(a)

	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => key in b && sameContent(Reflect.get(a, key), Reflect.get(b, key)))
	)
}

export class TStableSnapshot {
	/** Снимок связки, из которого собран `_snapshot`. */
	private _source: TStateSnapshot | null = null
	private _snapshot: TStateSnapshot | null = null

	/** @param _read снимок связки (`binding.state.getSnapshot`) */
	constructor(private readonly _read: () => TStateSnapshot) {}

	/** Стрелка: её отдают `useSyncExternalStore` без `this`. */
	readonly getSnapshot = (): TStateSnapshot => {
		const source = this._read()

		if (source === this._source && this._snapshot) return this._snapshot

		this._source = source
		this._snapshot = this._snapshot ? this._settle(this._snapshot, source) : source

		return this._snapshot
	}

	/** Новый снимок связки поверх прежнего: совпавшее по содержимому — прежним объектом. */
	private _settle(previous: TStateSnapshot, next: TStateSnapshot): TStateSnapshot {
		let changed = false

		const entries = Object.entries(next).map(([name, value]): [string, unknown] => {
			const kept: unknown = previous[name]

			if (name in previous && sameContent(kept, value)) return [name, kept]

			changed = true

			return [name, value]
		})

		return changed ? Object.freeze(Object.fromEntries(entries)) : previous
	}
}
