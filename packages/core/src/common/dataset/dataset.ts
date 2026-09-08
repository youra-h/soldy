import { TAttributes } from '../attributes'
import type { TDatasetValue } from './types'

/**
 * Набор `data-*` атрибутов компонента — контракт с темой.
 *
 * Парный к `TAria` и по той же причине: состояние читает не только
 * скринридер, но и CSS, а смешивать эти два контракта нельзя. ARIA правится
 * ради доступности, `data-*` — ради вида; связав тему с `aria-*`, однажды
 * чинишь одно и молча ломаешь другое (так и случилось с панелями Accordion).
 *
 * Своего у набора два обстоятельства, ради которых он отдельный класс:
 *
 * **Префикс.** Пишется `dataset.add('selected', …)`, в разметку уходит
 * `data-selected`. Имя с префиксом тоже принимается — чтобы не появилось
 * `data-data-selected`.
 *
 * **Приведение типов.** Состояние в ядре булево, а атрибут строковый, и это
 * преобразование раньше жило в разметке: `:data-selected="String(selected)"`.
 * Шесть таких мест в шаблонах Vue уже разъехались — ListBox отдавал
 * `data-highlighted` сырым, Select тот же признак через `String(!!value)`.
 * Работало по случайности, а при портировании на остальные пять адаптеров
 * копий стало бы тридцать.
 *
 * `false` даёт `"false"`, а не снимает атрибут: тема смотрит `[data-x='true']`,
 * и «выключено» надо отличать от «неприменимо». Снимает только `null`
 * и `undefined` — как в базовом классе.
 */
export class TDataset extends TAttributes {
	protected override resolve(name: string): string {
		return name.startsWith('data-') ? name : `data-${name}`
	}

	override add(name: string, value: TDatasetValue): this {
		if (value === null || value === undefined) return this.remove(name)

		return super.add(name, String(value))
	}
}
