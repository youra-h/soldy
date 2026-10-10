import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
import { createEngineTableColumns } from '../../../column/collection'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import type { ITable, TTableReorderPreview } from '../../../types'
import type { TTableEngineOptions } from '../table'
import { TTableColumnsItemExtension } from './item'
import { layoutColumns } from './layout'
import type {
	ITableColumnsExtension,
	ITableColumnsItemExtension,
	TTableColumnShift,
	TTableColumnsEvents,
} from './types'

/**
 * Обработчики показанной колонки: её ячейки, раскладка — от ширины и границ —
 * и законченная правка ширины.
 */
type TColumnWatchers = {
	cells: () => void
	layout: () => void
	resize: () => void
	commit: (width: number) => void
}

/** Жест перестановки: какую колонку тащат, куда она встанет и на ком метки. */
type TColumnDrag = {
	column: ITableColumn
	/** Место среди показанных, куда колонка встанет, если её отпустить */
	to: number
	/** Колонка под меткой — та, что сейчас стоит на месте `to`; на своём месте метки нет */
	target: ITableColumn | undefined
	/**
	 * Колонки, которые уступают место взятой, — от её места до `to`
	 * включительно, — и куда каждая уступает. На своём месте их нет
	 */
	shifted: ReadonlyMap<ITableColumn, TTableColumnShift>
	/** Колонку отпустили: заголовок приземляется, место заморожено */
	dropped: boolean
	/**
	 * Что идёт за жестом — значение таблицы, когда колонку взяли: смена
	 * посреди жеста действует со следующего
	 */
	mode: TTableReorderPreview
	/**
	 * Таблица, которой жест поставил признак `data-reorder-preview` — она была в
	 * `column`, когда колонку взяли. С неё признак и снимается: таблица может
	 * смениться посреди жеста
	 */
	preview: ITable | undefined
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
 * **Раскладка** — ширины гибких показанных колонок, колонок без своей ширины:
 * из места таблицы (`notifySpace` — его мерит плагин) и её `columnFit`, по
 * правилам `layoutColumns`. Ширину раскладки расширение пишет колонке
 * (`layoutWidth`), а таблице — `data-overflow`, колонки шире места: по нему
 * тема включает прокрутку окна таблицы. Пока места нет, признака нет. Без
 * таблицы раскладки нет: гибкие колонки без ширины, и их ширину решает тема.
 * Пересчёт — на смену показанных колонок, места, `columnFit` и своей ширины
 * или границ показанной колонки; своя запись ширин пересчёта не будит. Запись
 * состава сводит всё, что задела, в один пересчёт — в её конце.
 *
 * **Колонки перед тянутой держат ширину.** Ручка показанной колонки начала
 * менять ширину (`resize:start` колонки) — гибким показанным колонкам перед
 * ней расширение пишет своё значение, равное ширине раскладки, в `auto` и
 * `contain`: итог от этого не меняется, событий нет. Место отдают и берут
 * гибкие колонки после неё, и край идёт за указателем, а не вполовину. Так
 * делает AG Grid. В `none` гибкие колонки места не делят, держать нечего;
 * `column:resize` о закреплённых не приходит: их пользователь не правил.
 *
 * **Что идёт за протяжкой ручки** — `resizePreview` таблицы: расширение
 * пишет его показанным колонкам — пришедшим и на смену у таблицы, — а
 * колонка читает его на нажатии. Без таблицы — `live`.
 *
 * **Ширина, которую задал пользователь**, — `column:resize`: законченная правка
 * ручкой показанной колонки (`commit` колонки), одна на действие. Скрытую
 * колонку пользователь не видит и ручкой не правит, и её расширение не
 * слушает.
 *
 * **Перестановка пользователем** — команда `moveColumn` и жест `dragStart` →
 * `dragOver` → `dragDrop` → `dragEnd`. Место — среди показанных: скрытые
 * колонки пользователь не видит и остаются на своих местах между соседями.
 * Строк в таблице бывают тысячи, и перестановка на каждом шаге указателя
 * перерисовывала бы их все, поэтому коллекцию жест не трогает до конца:
 * перестановка одна, одним `column:move`. Фазы жеста — метки колонок для
 * темы:
 *
 * - несут (`dragStart`, `dragOver`) — взятой колонке `data-dragging`, колонке
 *   на месте, куда её принесли, — `data-drop` со стороной, а колонкам от
 *   места взятой до места `to` включительно — `data-shift`: куда каждая
 *   уступает место. Пишется только то, что сменилось;
 * - отпустили (`dragDrop`) — взятой `data-landing`: заголовок едет на место,
 *   а место заморожено — `dragOver` его больше не меняет;
 * - встала (`dragEnd`) — метки сняты, колонка переставлена, одной операцией:
 *   тема видит шапку и тело уже в новом порядке и без меток жеста.
 *
 * **Шапка стоит** — у таблицы в `none` (`reorderPreview`): взятой колонке
 * на весь жест ещё и `data-still`, а `data-shift` не пишется никому, — соседи
 * стоят, место показывает линия (`data-drop`). Признак — на взятом
 * заголовке, а не на корне: по нему тема решает только за шапку, и ячейкам
 * тела его смена ничего не стоит. Приземления в `none` нет: плагин зовёт
 * `dragEnd` на отпускании (`dragPreview`).
 *
 * **Тело за жестом** — у таблицы в `column` (`reorderPreview`): на весь жест,
 * от `dragStart` до `dragEnd` или `dragCancel`, расширение ставит её корню
 * признак `data-reorder-preview`, и по нему тема ведёт за заголовками ячейки
 * строк. Признак живёт ровно жест, потому что его имя — условие правил тела,
 * которые умножаются на каждую нарисованную ячейку: пока имени нет ни у
 * одного предка ячейки — на покое и в `head`, — стиль ячеек за эти правила не
 * платит. Значение таблицы расширение читает, когда колонку берут: смена
 * посреди жеста действует со следующего. Снимается признак той же операцией,
 * что перестановка, — подписчик `column:move` его уже не видит, — а с
 * таблицы, которая ушла посреди жеста, — когда она ушла.
 *
 * Сколько ждать между отпусканием и концом, решает плагин — пока заголовок
 * доезжает переходом темы. Где указатель и какая колонка под ним, тоже знает
 * он, а не расширение. Пользователь берёт только колонку `reorderable` и не
 * выключенную; код переставляет любые — перемещением в коллекции колонок, без
 * `column:move`. Состав показанных сменился посреди жеста, и пока заголовок
 * приземляется тоже, — жест прерван: место, куда несли колонку, считалось от
 * прежнего состава.
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

	/** Раскладка устарела во время записи: пересчёт — в её конце. */
	private _staleLayout = false

	/** Расширение само пишет колонкам ширины раскладки: их смена пересчёт не будит. */
	private _laying = false

	/** Место под колонки, px; ноль — неизвестно. */
	private _space = 0

	/**
	 * Обработчики показанной колонки — поля, выравнивания и признака заголовка
	 * строки (ячейки), ширины и границ (раскладка) и её законченной правки
	 * ширины. Скрытая и удалённая колонки ячеек не дают, в раскладке не стоят и
	 * ручкой не правятся, и их расширение не слушает: подписка удерживала бы
	 * коллекцию, пока жива сама колонка.
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
			// Раскладка — по таблице: пришла — колонкам её ширины, ушла — раскладки нет
			this._notifyLayout()

			if (!owner) return

			// Догон: колонки, пришедшие до таблицы
			this.columns.forEach((column) => this._inheritOwner(column))

			// Смена у таблицы — всем колонкам, как у `<fieldset>`
			scope.on(owner.events, 'change:disabled', (value: boolean) =>
				this.columns.forEach((column) => {
					column.disabled = value
				}),
			)

			scope.on(owner.events, 'change:columnFit', () => this._notifyLayout())

			// Что идёт за протяжкой ручки — показанным колонкам: пришла таблица и
			// сменилось у неё; ушла — снова `live`
			this._sharePreview()
			scope.on(owner.events, 'change:resizePreview', () => this._sharePreview())
			scope.add(() => {
				for (const column of this.shownColumns) column.resizePreview = 'live'
			})

			// Признак места — этой таблицы: она ушла, и признак уходит с неё
			scope.add(() => owner.dataset.add('overflow', null))

			// Признак жеста — тоже: таблица ушла посреди жеста
			scope.add(() => owner.dataset.add('reorder-preview', null))
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

	get dragPreview(): TTableReorderPreview | undefined {
		return this._drag?.mode
	}

	notifySpace(width: number): void {
		const space = width > 0 ? Math.floor(width) : 0

		if (this._space === space) return

		this._space = space
		this._notifyLayout()
	}

	moveColumn(column: ITableColumn, to: number): boolean {
		if (!this._canMove(column)) return false

		return this._move(column, to)
	}

	dragStart(column: ITableColumn): boolean {
		if (!this._canMove(column)) return false

		// Указатель у шапки один: новый жест закрывает незаконченный
		this.dragCancel()

		const owner = this._ctx?.options.get('owner')
		// Без таблицы — её умолчание
		const mode = owner?.reorderPreview ?? 'head'
		const preview = mode === 'column' ? owner : undefined

		this._drag = {
			column,
			to: this.shownColumns.indexOf(column),
			target: undefined,
			shifted: new Map(),
			dropped: false,
			mode,
			preview,
		}
		column.dataset.add('dragging', true)

		// Шапка стоит: соседи без сдвигов, место — линия
		if (mode === 'none') column.dataset.add('still', true)

		// Тело идёт за жестом — признак на время жеста, а не на покое
		preview?.dataset.add('reorder-preview', 'column')

		return true
	}

	dragOver(to: number): void {
		const drag = this._drag

		// Отпущенную колонку больше не несут: место заморожено
		if (!drag || drag.dropped) return

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

		// В `none` соседи стоят — уступать место им нечем
		if (drag.mode !== 'none') this._shift(drag, shown, from, place)
	}

	dragDrop(): void {
		const drag = this._drag

		if (!drag) return

		drag.dropped = true
		drag.column.dataset.add('landing', true)
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
		drag.column.dataset.add('landing', null)
		drag.column.dataset.add('still', null)
		drag.target?.dataset.add('drop', null)
		drag.preview?.dataset.add('reorder-preview', null)

		for (const column of drag.shifted.keys()) column.dataset.add('shift', null)
	}

	/**
	 * Колонки от места взятой до `place` включительно уступают ей место: несут
	 * к концу строки — они встают к началу, к началу — к концу. Метка
	 * пишется только тем, у кого она сменилась, и снимается только с тех, кто
	 * перестал уступать: на каждом шаге указателя остальные колонки не
	 * трогаются.
	 */
	private _shift(
		drag: TColumnDrag,
		shown: ReadonlyArray<ITableColumn>,
		from: number,
		place: number,
	): void {
		const side: TTableColumnShift = place > from ? 'start' : 'end'
		const shifted = new Map<ITableColumn, TTableColumnShift>()

		for (let index = Math.min(from, place); index <= Math.max(from, place); index++) {
			if (index !== from) shifted.set(shown[index], side)
		}

		for (const column of drag.shifted.keys()) {
			if (!shifted.has(column)) column.dataset.add('shift', null)
		}

		for (const [column, value] of shifted) {
			if (drag.shifted.get(column) !== value) column.dataset.add('shift', value)
		}

		drag.shifted = shifted
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

	/** Место, `columnFit`, таблица или ширина и границы показанной колонки сменились — пересчёт. */
	private _notifyLayout(): void {
		this._staleLayout = true
		this._flush()
	}

	/**
	 * Отдать накопленное: вне записи — сразу, в записи — в её конце. Раскладка
	 * — раньше события показанных: кто его слушает, видит колонки уже в своих
	 * ширинах.
	 */
	private _flush(): void {
		if (this._writing > 0) return

		const shown = this._staleShown
		const layout = shown || this._staleLayout
		const cells = shown || this._staleCells

		this._staleShown = false
		this._staleLayout = false
		this._staleCells = false

		if (shown) {
			// Место, куда несли колонку, считалось от прежнего состава
			this.dragCancel()
			this._watchShown()
		}

		if (layout) this._layout()
		if (shown) this.events.emit('change:shownColumns')
		if (cells) this.events.emit('change:cells')
	}

	/**
	 * Раскладка показанных колонок: гибким — ширина раскладки или её снятие,
	 * таблице — `data-overflow`. Колонкам со своей шириной ширина раскладки
	 * снимается: её у них нет. Своя запись ширин пересчёта не будит.
	 */
	private _layout(): void {
		const owner = this._ctx?.options.get('owner')
		const shown = this.shownColumns

		this._laying = true

		try {
			if (!owner) {
				for (const column of shown) column.layoutWidth = undefined

				return
			}

			const { widths, overflow } = layoutColumns(
				this._space > 0 ? this._space : undefined,
				owner.columnFit,
				shown.map((column) => {
					const { width, minWidth, maxWidth } = column.getProps()

					return { width, minWidth, maxWidth }
				}),
			)

			shown.forEach((column, index) => {
				column.layoutWidth = widths[index]
			})
			owner.dataset.add('overflow', overflow)
		} finally {
			this._laying = false
		}
	}

	/**
	 * Слушать показанные колонки — поле, выравнивание, признак заголовка
	 * строки, ширину и границы и законченную правку ширины, — а ушедшие из
	 * показанных больше не слушать: в раскладке они не стоят, и ширина
	 * раскладки с них снимается.
	 */
	private _watchShown(): void {
		const shown = new Set(this.shownColumns)

		for (const [column, watchers] of this._watchers) {
			if (shown.has(column)) continue

			column.events.off('change:field', watchers.cells)
			column.events.off('change:align', watchers.cells)
			column.events.off('change:rowHeader', watchers.cells)
			column.events.off('change:width', watchers.layout)
			column.events.off('change:minWidth', watchers.layout)
			column.events.off('change:maxWidth', watchers.layout)
			column.events.off('resize:start', watchers.resize)
			column.events.off('commit', watchers.commit)
			this._watchers.delete(column)

			column.layoutWidth = undefined
		}

		for (const column of shown) {
			if (this._watchers.has(column)) continue

			const watchers: TColumnWatchers = {
				cells: () => this._notifyCells(),
				layout: () => {
					if (!this._laying) this._notifyLayout()
				},
				resize: () => this._holdBefore(column),
				commit: (width) => this.events.emit('column:resize', { column, width }),
			}

			this._watchers.set(column, watchers)
			column.events.on('change:field', watchers.cells)
			column.events.on('change:align', watchers.cells)
			column.events.on('change:rowHeader', watchers.cells)
			column.events.on('change:width', watchers.layout)
			column.events.on('change:minWidth', watchers.layout)
			column.events.on('change:maxWidth', watchers.layout)
			column.events.on('resize:start', watchers.resize)
			column.events.on('commit', watchers.commit)
			column.resizePreview = this._ctx?.options.get('owner')?.resizePreview ?? 'live'
		}
	}

	/** `resizePreview` таблицы — показанным колонкам; без таблицы — `live`. */
	private _sharePreview(): void {
		const preview = this._ctx?.options.get('owner')?.resizePreview ?? 'live'

		for (const column of this.shownColumns) column.resizePreview = preview
	}

	/**
	 * Гибким показанным колонкам перед `column` — своё значение, равное итогу:
	 * пока ручка меняет ширину, место отдают и берут колонки после неё. В
	 * `none` гибкие места не делят, и держать нечего. Итог не меняется,
	 * поэтому ни `change:width`, ни пересчёта.
	 */
	private _holdBefore(column: ITableColumn): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner || owner.columnFit === 'none') return

		const shown = this.shownColumns

		for (const each of shown.slice(0, shown.indexOf(column))) {
			if (each.getProps().width === undefined && each.width !== undefined)
				each.width = each.width
		}
	}
}

/** Место в отрезке показанных. */
function within(value: number, low: number, high: number): number {
	return Math.min(Math.max(Math.round(value), low), high)
}
