import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
import { createEngineTableColumns } from '../../../column/collection'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import type { TTableEngineOptions } from '../table'
import { TTableColumnsItemExtension } from './item'
import type {
	ITableColumnsExtension,
	ITableColumnsItemExtension,
	TTableColumnsEvents,
} from './types'

/** Обработчики показанной колонки: её ячейки и законченная правка ширины. */
type TColumnWatchers = {
	cells: () => void
	commit: (width: number) => void
}

/** Жест перестановки: какую колонку тащат, куда она встанет и на ком метка. */
type TColumnDrag = {
	column: ITableColumn
	/** Место среди показанных, куда колонка встанет, если её отпустить */
	to: number
	/** Колонка под меткой — та, что сейчас стоит на месте `to`; на своём месте метки нет */
	target: ITableColumn | undefined
}

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
 * item-адаптер строки. Устаревают они от показанных колонок и ещё от поля,
 * выравнивания и признака заголовка строки у показанной колонки: их
 * расширение слушает только у показанных. Об этом всём — одно событие
 * `change:cells` на операцию; о записи строки и наборе её заголовка адаптеру
 * сообщает сама строка.
 *
 * **Таблица на колонках.** `disabled` таблицы распространяется на колонки, как
 * на строки: выключенная таблица выключает их ручки, включённая — включает.
 * Пишется он в обычное свойство колонки — при добавлении, на смену у таблицы
 * и поверх патча. Таблица — опция движка строк (`owner`): она приходит и
 * уходит после сборки, и расширение её наблюдает.
 *
 * **Ширина, которую задал пользователь**, — `column:resize`: законченная правка
 * ручкой показанной колонки (`commit` колонки), одна на действие. Скрытую
 * колонку пользователь не видит и ручкой не правит, и её расширение не
 * слушает.
 *
 * **Перестановка пользователем** — команда `moveColumn` и жест `dragStart` →
 * `dragOver` → `dragEnd`. Место — среди показанных: скрытые колонки
 * пользователь не видит и остаются на своих местах между соседями. Жест
 * перестановкой не является, пока колонку не отпустили: взятой колонке
 * расширение пишет `data-dragging`, колонке на месте, куда её принесли, —
 * `data-drop` со стороной, а коллекцию не трогает. Строк в таблице бывают
 * тысячи, и перестановка на каждом шаге указателя перерисовывала бы их все;
 * так она одна — на отпускании, одним `column:move`. Где указатель и какая
 * колонка под ним, знает плагин, а не расширение. Пользователь берёт только
 * колонку `reorderable` и не выключенную; код переставляет любые —
 * перемещением в коллекции колонок, без `column:move`. Состав показанных
 * сменился посреди жеста — жест прерван: место, куда несли колонку, считалось
 * от прежнего состава.
 */
export class TTableColumnsExtension<
	TRow extends ITableRow = ITableRow,
	TOwner extends ITable = ITable,
>
	extends TBaseOwnerItemExtension<
		TRow,
		ITableColumnsItemExtension<TRow>,
		TTableColumnsEvents,
		TTableEngineOptions<TOwner>
	>
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
	 * Обработчики показанной колонки — поля, выравнивания и признака заголовка
	 * строки (ячейки) и её законченной правки ширины. Скрытая и удалённая
	 * колонки ячеек не дают и ручкой не правятся, и их расширение не слушает:
	 * подписка удерживала бы коллекцию, пока жива сама колонка.
	 */
	private readonly _watchers = new Map<ITableColumn, TColumnWatchers>()

	/** Жест перестановки, пока колонку не отпустили. */
	private _drag: TColumnDrag | undefined = undefined

	constructor(options?: IBaseOwnerItemExtensionOptions<TRow, ITableColumnsItemExtension<TRow>>) {
		super(TTableColumnsItemExtension, options)

		const { order, plain } = this._engine.extensions

		// Состав и порядок: `order` выводит смену последовательности из
		// вставок, удалений и перемещений и сообщает её один раз на операцию.
		// Обновление колонки последовательность не меняет — события нет
		order.events.on('change:order', () => this._notifyShown())

		// Видимость колонки: выборка устарела
		plain.events.on('items:query:invalidated', () => this._notifyShown())

		// Колонке — `disabled` таблицы: пришедшей и поверх патча, который пишет
		// ей своё из данных
		plain.events.on('item:added', (e) => this._inheritOwner(e.item))
		plain.events.on('item:updated', (e) => this._inheritOwner(e.item))
	}

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Таблица — опция движка: приходит и уходит после сборки. Подписка на
		// неё живёт в области наблюдателя — сменилась таблица, прежняя снята
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: колонки, пришедшие до таблицы
			this.columns.forEach((column) => this._inheritOwner(column))

			// Смена у таблицы — всем колонкам, как у `<fieldset>`
			scope.on(owner.events, 'change:disabled', (value: boolean) =>
				this.columns.forEach((column) => {
					column.disabled = value
				}),
			)
		})
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

	get dragged(): ITableColumn | undefined {
		return this._drag?.column
	}

	moveColumn(column: ITableColumn, to: number): boolean {
		if (!this._canMove(column)) return false

		return this._move(column, to)
	}

	dragStart(column: ITableColumn): boolean {
		if (!this._canMove(column)) return false

		// Указатель у шапки один: новый жест закрывает незаконченный
		this.dragCancel()

		this._drag = { column, to: this.shownColumns.indexOf(column), target: undefined }
		column.dataset.add('dragging', true)

		return true
	}

	dragOver(to: number): void {
		const drag = this._drag

		if (!drag) return

		const shown = this.shownColumns
		const from = shown.indexOf(drag.column)
		const place = within(to, 0, shown.length - 1)
		const target = place === from ? undefined : shown[place]

		drag.to = place

		if (drag.target !== target) {
			drag.target?.dataset.add('drop', null)
			drag.target = target
		}

		target?.dataset.add('drop', place > from ? 'after' : 'before')
	}

	dragEnd(): void {
		const drag = this._drag

		if (!drag) return

		this.dragCancel()

		// Пока несли, колонку могли выключить вместе с таблицей
		if (this._canMove(drag.column)) this._move(drag.column, drag.to)
	}

	dragCancel(): void {
		const drag = this._drag

		if (!drag) return

		this._drag = undefined
		drag.column.dataset.add('dragging', null)
		drag.target?.dataset.add('drop', null)
	}

	/**
	 * `disabled` таблицы на колонке — когда таблица выключена. Таблицы нет —
	 * колонка со своим.
	 *
	 * Колонка или её источник: событие вставки несёт элемент типом источника, а
	 * пишется свойство, которое есть у обоих.
	 */
	private _inheritOwner(column: Partial<ITableColumn>): void {
		if (this._ctx?.options.get('owner')?.disabled) column.disabled = true
	}

	/** Пользователь вправе переставить колонку: она `reorderable`, не выключена и показана. */
	private _canMove(column: ITableColumn): boolean {
		return column.reorderable && !column.disabled && this.shownColumns.includes(column)
	}

	/**
	 * Колонку — на место `to` среди показанных: туда, где сейчас стоит колонка
	 * этого места. В коллекции это её индекс — и когда колонку несут вперёд
	 * (она встаёт после той колонки), и когда назад (перед ней). Скрытые
	 * колонки между ними остаются на своих местах относительно соседей.
	 */
	private _move(column: ITableColumn, to: number): boolean {
		const shown = this.shownColumns
		const from = shown.indexOf(column)
		const place = within(to, 0, shown.length - 1)

		if (from === -1 || place === from) return false

		const { batch, plain } = this._engine.extensions
		const before = batch.items.indexOf(column)

		plain.move(column, batch.items.indexOf(shown[place]), before)

		// Перемещение отменил подписчик `item:move:before`
		if (batch.items.indexOf(column) === before) return false

		this.events.emit('column:move', {
			column,
			order: this.columns.map((each) => each.field),
		})

		return true
	}

	/** Показанные устарели — а с ними и ячейки. */
	private _notifyShown(): void {
		this._staleShown = true
		this._flush()
	}

	/** Поле, выравнивание или признак заголовка показанной колонки сменились — устарели ячейки. */
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
			// Место, куда несли колонку, считалось от прежнего состава
			this.dragCancel()
			this._watchShown()
			this.events.emit('change:shownColumns')
		}

		if (cells) this.events.emit('change:cells')
	}

	/**
	 * Слушать показанные колонки — поле, выравнивание, признак заголовка строки
	 * и законченную правку ширины, — а ушедшие из показанных больше не слушать.
	 */
	private _watchShown(): void {
		const shown = new Set(this.shownColumns)

		for (const [column, watchers] of this._watchers) {
			if (shown.has(column)) continue

			column.events.off('change:field', watchers.cells)
			column.events.off('change:align', watchers.cells)
			column.events.off('change:rowHeader', watchers.cells)
			column.events.off('commit', watchers.commit)
			this._watchers.delete(column)
		}

		for (const column of shown) {
			if (this._watchers.has(column)) continue

			const watchers: TColumnWatchers = {
				cells: () => this._notifyCells(),
				commit: (width) => this.events.emit('column:resize', { column, width }),
			}

			this._watchers.set(column, watchers)
			column.events.on('change:field', watchers.cells)
			column.events.on('change:align', watchers.cells)
			column.events.on('change:rowHeader', watchers.cells)
			column.events.on('commit', watchers.commit)
		}
	}
}

/** Место в отрезке показанных. */
function within(value: number, low: number, high: number): number {
	return Math.min(Math.max(Math.round(value), low), high)
}
