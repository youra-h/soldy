import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IBaseOwnerItemExtensionOptions } from '../../../../../base/collection'
import { createEngineTableColumns } from '../../../column/collection'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import { TTableColumnsItemExtension } from './item'
import type {
	ITableColumnsExtension,
	ITableColumnsItemExtension,
	TTableColumnsEvents,
} from './types'

/**
 * Колонки таблицы — расширение коллекции строк.
 *
 * Таблица — не двумерное хранилище, а две одномерные коллекции: строки и
 * колонки. Коллекцию колонок расширение создаёт и держит само, как панели
 * календаря держат свои списки: состав, порядок и жизнь колонок дают её
 * стандартные детали, своего массива колонок нет. Движок колонок лежит в
 * движке строк, поэтому движок строк, переданный снаружи, переносит и
 * колонки — их состав, порядок и ширины.
 *
 * Расширение — не расширение коллекции колонок: в её хранилище оно не ходит,
 * а работает с её стандартными деталями — составом (`batch`), порядком
 * (`order`) и событиями хранилища (`plain`).
 *
 * **Показанные колонки** — выборка коллекции колонок: видимые, в её порядке.
 * Что они устарели, расширение узнаёт из двух фактов коллекции: сменилась
 * последовательность колонок (`order` — состав и порядок) или условие
 * выборки (видимость колонки). На каждый — одно событие `change:shownColumns`,
 * а запись состава сводит всё, что задела, в одно — в её конце.
 *
 * **Ячейки** — пересечение записи строки и показанных колонок — отдаёт
 * item-адаптер строки. Устаревают они от показанных колонок и ещё от поля и
 * выравнивания показанной колонки: их расширение слушает только у показанных.
 * Об этом всём — одно событие `change:cells` на операцию; о записи строки
 * адаптеру сообщает сама строка.
 */
export class TTableColumnsExtension<TRow extends ITableRow = ITableRow>
	extends TBaseOwnerItemExtension<TRow, ITableColumnsItemExtension<TRow>, TTableColumnsEvents>
	implements ITableColumnsExtension<TRow>
{
	readonly name = 'columns' as const

	private readonly _engine: TTableColumnsCollection = createEngineTableColumns()

	/** Сколько записей состава идёт сейчас: запись может прийти и изнутри другой. */
	private _writing = 0

	/** Показанные устарели во время записи: событие уйдёт в её конце. */
	private _staleShown = false

	/** Ячейки устарели во время записи: событие уйдёт в её конце. */
	private _staleCells = false

	/**
	 * Обработчики поля и выравнивания — по показанной колонке. Скрытая и
	 * удалённая колонки ячеек не дают, и их расширение не слушает: подписка
	 * удерживала бы коллекцию, пока жива сама колонка.
	 */
	private readonly _watchers = new Map<ITableColumn, () => void>()

	constructor(options?: IBaseOwnerItemExtensionOptions<TRow, ITableColumnsItemExtension<TRow>>) {
		super(TTableColumnsItemExtension, options)

		const { order, plain } = this._engine.extensions

		// Состав и порядок: `order` выводит смену последовательности из
		// вставок, удалений и перемещений и сообщает её один раз на операцию.
		// Обновление колонки последовательность не меняет — события нет
		order.events.on('change:order', () => this._notifyShown())

		// Видимость колонки: выборка устарела
		plain.events.on('items:query:invalidated', () => this._notifyShown())
	}

	get engine(): TTableColumnsCollection {
		return this._engine
	}

	get columns(): ReadonlyArray<ITableColumn> {
		return this._engine.extensions.batch.items
	}

	/**
	 * Сверка по `field` — ключу коллекции колонок: колонка с тем же `field`
	 * та же и обновляется на месте, новая встаёт в конец в порядке данных,
	 * пропавшая удаляется. Место колонки, которая уже есть, данные не меняют:
	 * переставляет колонки перемещение в коллекции.
	 *
	 * Запись — одна операция: если она сменила и состав, и видимость колонок,
	 * `change:shownColumns` всё равно приходит один раз — в её конце, как и
	 * `change:cells`.
	 */
	set columns(sources: readonly TTableColumnSource[]) {
		this._writing++

		try {
			this._engine.extensions.batch.items = [...sources]
		} finally {
			this._writing--
			this._flush()
		}
	}

	get shownColumns(): ReadonlyArray<ITableColumn> {
		return this._engine.extensions.batch.shown
	}

	/** Показанные устарели — а с ними и ячейки. */
	private _notifyShown(): void {
		this._staleShown = true
		this._flush()
	}

	/** Поле или выравнивание показанной колонки сменилось — устарели ячейки. */
	private _notifyCells(): void {
		this._staleCells = true
		this._flush()
	}

	/** Отдать накопленное: вне записи — сразу, в записи — в её конце. */
	private _flush(): void {
		if (this._writing > 0) return

		const shown = this._staleShown
		const cells = shown || this._staleCells

		this._staleShown = false
		this._staleCells = false

		if (shown) {
			this._watchShown()
			this.events.emit('change:shownColumns')
		}

		if (cells) this.events.emit('change:cells')
	}

	/** Слушать поле и выравнивание показанных колонок, а ушедших — больше не слушать. */
	private _watchShown(): void {
		const shown = new Set(this.shownColumns)

		for (const [column, watcher] of this._watchers) {
			if (shown.has(column)) continue

			column.events.off('change:field', watcher)
			column.events.off('change:align', watcher)
			this._watchers.delete(column)
		}

		for (const column of shown) {
			if (this._watchers.has(column)) continue

			const watcher = (): void => this._notifyCells()

			this._watchers.set(column, watcher)
			column.events.on('change:field', watcher)
			column.events.on('change:align', watcher)
		}
	}
}
