import type { TRec } from '../data'

/**
 * Строки разметкой, сверенные по `id`, — как ключ строки у Vue и React: строка
 * с тем же `id` остаётся своим узлом и только обновляется, новые узлы строятся,
 * лишние снимаются, порядок узлов — порядок записей. Таблицам Web Components,
 * у которых строки задаёт разметка приложения (Carbon, Spectrum, UI5), и
 * голому DOM.
 */
export class TKeyedRows<TRow extends Element> {
	private readonly _nodes = new Map<TRec['id'], TRow>()

	constructor(
		private readonly _body: Element,
		private readonly _make: (rec: TRec) => TRow,
		private readonly _update: (row: TRow, rec: TRec) => void,
	) {}

	/** Узел строки записи. */
	node(id: TRec['id']): TRow | undefined {
		return this._nodes.get(id)
	}

	write(records: TRec[]) {
		const live = new Set<TRec['id']>()
		const ordered: TRow[] = []

		for (const rec of records) {
			let row = this._nodes.get(rec.id)

			if (row) this._update(row, rec)
			else this._nodes.set(rec.id, (row = this._make(rec)))
			live.add(rec.id)
			ordered.push(row)
		}

		for (const [id, row] of this._nodes) {
			if (live.has(id)) continue
			row.remove()
			this._nodes.delete(id)
		}

		this.order(ordered)
	}

	/** Расставить узлы в данном порядке: стоящий на месте не трогается. */
	order(rows: TRow[]) {
		let at = this._body.firstElementChild

		for (const row of rows) {
			if (row === at) at = at.nextElementSibling
			else this._body.insertBefore(row, at)
		}
	}
}

/** Текст ячеек строки — запись по колонкам; совпавший не пишется. */
export function writeCells(cells: ArrayLike<Element>, values: string[]) {
	for (let i = 0; i < values.length; i++) {
		if (cells[i].textContent !== values[i]) cells[i].textContent = values[i]
	}
}
