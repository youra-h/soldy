import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootProps, toText } from '../../../adapter'
import { CheckBox } from '../../check-box'
import { useSetupTableRow } from './setup.component'
import type { TableRowProps } from './base.component'

/**
 * TableRow — строка таблицы (`Table.Row`). Корень — `tr`, рисуется по `tag`
 * строки. На нём модификаторы размера и варианта (их строке диктует таблица)
 * и набор `dataset`: `data-selected` (пишет выбор коллекции — всем строкам) и
 * `data-disabled`, а в сетке — `aria-selected`. Нажатие по строке ловит
 * плагин сетки таблицы: в сетке оно выбирает строку, в роли `table` не делает
 * ничего — выбирают чекбоксом.
 *
 * Ячейка колонки выбора — только пока выбор строк включён (`selecting`: режим
 * не `none`), как её заголовок в шапке. Чекбокс строки — CheckBox
 * (`embedded: 'table.select'`) над экземпляром, который держит таблица:
 * отметку, «выключен», размер и вариант она пишет ему от выбора и строки, а
 * клик по нему — просьба, которую она выполняет выбором строки. Поэтому ни
 * значения, ни обработчиков здесь нет: отменённый выбор отметку не меняет.
 * Имя — ссылка на заголовок строки (`aria-labelledby` на `rowHeaderId`);
 * заголовка нет — нет и ссылки.
 *
 * Ключ чекбокса — его экземпляр. Компонент собирается над `ctrl` один раз за
 * монтирование, а чекбокс строка берёт у таблицы на монтирование своего
 * контекста: пересобранная строка (StrictMode, `<Activity>`) отпускает
 * прежний и получает новый — и CheckBox над новым монтируется заново, а не
 * остаётся над отпущенным, которому таблица отметку больше не пишет.
 *
 * Ячейки — по одной на ячейку строки (`cells`), ключ — колонка, без обёртки:
 * ячейки — дети `tr`. Набор ячейки — `data-align` колонки, набор ячеек строки
 * (`cellAria`: в сетке ячейка принимает фокус) и, у заголовка строки, его
 * `id`. Ячейка колонки `rowHeader` — заголовок строки: `th` с `scope="row"`,
 * на её текст ссылается имя чекбокса строки. Остальные — `td`. Класс один:
 * тема различает их тегом.
 *
 * Содержимое ячейки — слот `cell` со scope `{ row, column, value }`: строку в
 * scope кладёт сама строка, таблица отдаёт ей свой слот как есть. Без слота —
 * значение текстом (`toText`): тип поля записи таблица не знает, и React его,
 * в отличие от интерполяции Vue, как есть не нарисует.
 */
export function TableRow(props: TableRowProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, context } = useSetupTableRow(props)

	const { rendered, tag, selecting, cells, cellAria, rowHeaderId, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	// Чекбокс берётся только для ячейки выбора: у таблицы без выбора их нет
	const checkBox = selecting ? context?.adapters.table.checkBox : undefined

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{selecting ? (
				<td className="s-table-row__select" {...toAriaProps(cellAria)}>
					<CheckBox
						key={checkBox?.uid}
						embedded="table.select"
						ctrl={checkBox}
						aria_labelledBy={rowHeaderId}
					/>
				</td>
			) : null}
			{cells?.map((cell) => {
				const Cell = cell.rowHeader ? 'th' : 'td'

				return (
					<Cell
						key={cell.column.uid}
						className="s-table-row__cell"
						scope={cell.rowHeader ? 'row' : undefined}
						{...toAriaProps(cell.dataset)}
						{...toAriaProps(cellAria)}
						{...toAriaProps(cell.aria)}
					>
						{renderSlot(props.cell, {
							row: ctrl,
							column: cell.column,
							value: cell.value,
						}) ?? toText(cell.value)}
					</Cell>
				)
			})}
		</Tag>
	)
}
