import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { TAriaAttributes, TDatasetAttributes } from '../../../../../../common'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection/types'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'

/**
 * Ширина, которую пользователь задал колонке ручкой, — то, что приложению
 * сохранить: колонка и итог её ширины в px.
 */
export type TTableColumnResize = {
	column: ITableColumn
	width: number
}

/**
 * Колонку переставил пользователь — то, что приложению сохранить: колонка и
 * новый порядок полей всех колонок, скрытых тоже.
 */
export type TTableColumnMove = {
	column: ITableColumn
	order: string[]
}

/**
 * Где встанет колонка, которую тащат, относительно колонки под меткой: перед
 * ней или после неё — по тому, с какой стороны колонку принесли. Тема рисует
 * метку у этого края заголовка (`data-drop`).
 */
export type TTableColumnDropSide = 'before' | 'after'

export type TTableColumnsEvents = {
	/**
	 * Показанные колонки надо перечитать: сменились состав, порядок или
	 * видимость колонки. Без аргумента — читатель берёт `shownColumns`. Одна
	 * операция — одно событие, сколько бы колонок она ни задела
	 */
	'change:shownColumns': () => void
	/**
	 * Ячейки строк надо перечитать: сменились показанные колонки или поле,
	 * выравнивание и признак заголовка строки у показанной колонки. Без
	 * аргумента — читатель берёт `cells` строки. Одна операция — одно событие
	 */
	'change:cells': () => void
	/**
	 * Пользователь задал ширину показанной колонки ручкой: отпустил её, если за
	 * жест ширина сменилась, или сдвинул клавишей. Одно событие на действие —
	 * по нему приложение сохраняет настройку. Протяжку видно по `change:width`
	 * колонки
	 */
	'column:resize': (payload: TTableColumnResize) => void
	/**
	 * Пользователь переставил колонку: отпустил заголовок на новом месте или
	 * сдвинул клавишами. Одно событие на действие — по нему приложение
	 * сохраняет порядок. Код, переставивший колонки перемещением в коллекции
	 * колонок, его не получает
	 */
	'column:move': (payload: TTableColumnMove) => void
}

/**
 * Ячейка — пересечение записи строки и показанной колонки.
 *
 * Ячейка не хранится и элементом коллекции не бывает: потребитель её не
 * адресует. Это выход строки, который item-адаптер колонок собирает на каждое
 * чтение — так вид календаря раскладывает дни в сетки.
 */
export type TTableCell = {
	/** Колонка ячейки — по её `field` разметка выбирает содержимое */
	column: ITableColumn
	/** Поле записи строки под ключом колонки — `data[field]` */
	value: unknown
	/**
	 * Ячейка — заголовок строки: колонка `rowHeader`. Разметка рисует её
	 * `th scope="row"`, остальные — `td`
	 */
	rowHeader: boolean
	/**
	 * ARIA ячейки — набор заголовка строки (`headerAria`) у первой показанной
	 * колонки `rowHeader`: на её `id` ссылается имя чекбокса выбора строки. У
	 * остальных пусто — `id` в документе один
	 */
	aria: TAriaAttributes
	/** Набор ячейки для темы — выравнивание колонки, `data-align` */
	dataset: TDatasetAttributes
}

export type TTableColumnsItemEvents = TBaseItemEventsExtension & {
	/**
	 * Ячейки строки надо перечитать: сменились показанные колонки, поле,
	 * выравнивание или признак заголовка строки у показанной колонки, запись
	 * строки или набор её заголовка. Без аргумента — читатель берёт `cells` и
	 * `rowHeaderId`
	 */
	'change:cells': () => void
}

/**
 * Item-адаптер колонок — ячейки строки.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие (см.
 * `IItemExtension`).
 */
export interface ITableColumnsItemExtension<
	TRow extends ITableRow = ITableRow,
	TEvents extends TTableColumnsItemEvents = TTableColumnsItemEvents,
> extends IItemExtension<TRow, TEvents> {
	/** Ячейки строки — по одной на показанную колонку, в порядке колонок */
	readonly cells: TTableCell[]
	/**
	 * `id` заголовка строки — ячейки первой показанной колонки `rowHeader`, —
	 * пока она показана. Ей называют чекбокс выбора строки. Колонки
	 * заголовка нет или она скрыта — `undefined`: ссылка в пустоту имени не
	 * дала бы
	 */
	readonly rowHeaderId: string | undefined
}

/**
 * Контракт расширения колонок коллекции строк.
 *
 * Колонки — своя коллекция: её движок расширение создаёт и держит, поэтому
 * движок строк, переданный снаружи, переносит и состав колонок, и их порядок
 * и ширины. Ячейки строки отдаёт его item-адаптер.
 */
export interface ITableColumnsExtension<
	TRow extends ITableRow = ITableRow,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends ITableColumnsItemExtension<TRow, any> = ITableColumnsItemExtension<TRow>,
>
	extends IExtension<TRow, TTableColumnsEvents>, IExtensionItems<TRow, TItemExt> {
	/** Движок колонок: порядок, состав, жизнь колонок — его стандартные детали */
	readonly engine: TTableColumnsCollection

	/** Колонки — все, и скрытые тоже, в порядке коллекции */
	get columns(): ReadonlyArray<ITableColumn>
	/**
	 * Задать колонки данными. Сверка по `field`: колонка с тем же `field` та же
	 * и обновляется на месте, новая встаёт в конец, пропавшая удаляется
	 */
	set columns(sources: readonly TTableColumnSource[])

	/** Показанные колонки — видимые, в порядке коллекции */
	readonly shownColumns: ReadonlyArray<ITableColumn>

	/** Колонка, которую тащат за заголовок, — пока идёт жест перестановки */
	readonly dragged: ITableColumn | undefined

	/**
	 * Переставить колонку на место `to` среди показанных — команда
	 * пользователя: только колонку `reorderable`, не выключенную и показанную.
	 * Скрытые колонки остаются на своих местах между соседями. Переставили —
	 * `column:move`.
	 *
	 * @returns переставлена ли колонка: отказ, то же место и отменённое в
	 * `item:move:before` перемещение — `false`
	 */
	moveColumn(column: ITableColumn, to: number): boolean

	/**
	 * Колонку взяли за заголовок: жест перестановки. Колонка пока стоит на
	 * месте, тема рисует её взятой (`data-dragging`). Новый жест закрывает
	 * незаконченный без перестановки.
	 *
	 * @returns начался ли жест — колонку без `reorderable`, выключенную и
	 * скрытую не взять
	 */
	dragStart(column: ITableColumn): boolean

	/**
	 * Взятую колонку принесли на место `to` среди показанных: метка
	 * (`data-drop`) встаёт на колонку, которая сейчас там, — у края, к которому
	 * колонка встанет. На своём месте метки нет. Вне жеста ничего не делает
	 */
	dragOver(to: number): void

	/**
	 * Колонку отпустили: она встаёт на место, куда её принесли, — одной
	 * перестановкой и одним `column:move`; на своём месте — не встаёт никуда
	 */
	dragEnd(): void

	/** Жест прерван: колонка остаётся на месте, метки сняты */
	dragCancel(): void
}
