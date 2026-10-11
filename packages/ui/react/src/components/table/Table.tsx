import type { ElementType, ReactElement } from 'react'
import {
	Elevate,
	renderSlot,
	roleIcon,
	toAriaProps,
	toReactStyle,
	toWrappedRootProps,
} from '../../adapter'
import { Button } from '../button'
import { CheckBox } from '../check-box'
import { Icon } from '../icon'
import { TableColumn } from './column'
import { TableRow } from './row'
import { useSetupTable } from './setup.component'
import type { TableProps } from './base.component'

/** Отметка направления сортировки — иконка по роли, компонент на роль один на модуль (`roleIcon`). */
const SortIcon = roleIcon('arrowUpward')

/**
 * Table — таблица по паттернам APG Table и Sortable Table, как у Vue. Корень —
 * сама `table`, рисуется по `tag`: роль `table` даёт тег, своей клавиатуры у
 * таблицы нет. В режиме сетки (`grid`, APG Data Grid) роль `grid`,
 * `aria-multiselectable` и остановку Tab таблице пишет коллекция в её `aria`,
 * а клавиши и фокус ячеек ведёт плагин сетки на корне. Имя таблице —
 * `aria_label` или `aria_labelledBy`.
 *
 * Окно таблицы — разметка `div.s-table__viewport` вокруг корня: в окне
 * таблица прокручивается вбок, когда колонки шире места, — прокрутку включает
 * тема по `data-overflow` таблицы. Окно — внешний узел компонента, и
 * атрибуты потребителя и скрытие достаются ему, а классы, наборы и `ref` —
 * таблице (`toWrappedRootProps`), как у Vue.
 *
 * Логики в разметке нет: заголовки — показанные колонки коллекции
 * (`shownColumns`), тело — то, что рисует коллекция строк (`drawn`), число
 * колонок и счёт выбора — выходы коллекции. Колонки и строки задаются только
 * данными (`columns`, `items`): частей разметкой у таблицы нет, поэтому и
 * слота `children` нет.
 *
 * Шапка: строка с набором `headRowAria` (у неё нет экземпляра — его держит
 * коллекция). Первая ячейка — колонка выбора, пока режим выбора не `none`: в
 * `multiple` — заголовок с чекбоксом «выбрать все» (`embedded:
 * 'table.select-all'`) над экземпляром, который держит таблица (`selectAll`),
 * имя — выход плагина имён; в `single` — пустая `td`: пустой заголовок
 * скринридеры считают ошибкой. Набор ячейки (`cellAria`) — коллекции: в сетке
 * ячейка принимает фокус. Ключ чекбокса — его экземпляр: пересобранная
 * таблица без движка снаружи (StrictMode, `<Activity>`) — новый движок с
 * новым «выбрать все», и CheckBox над ним монтируется заново, а не остаётся
 * над прежним.
 *
 * Дальше — `Table.Column` на каждую показанную колонку, ключ — колонка. Его
 * содержимое — по `sortable` колонки: сортируемая — кнопка в заголовке
 * (`embedded: 'table.sort'`), нажатие — команда коллекции `toggleSort(field)`,
 * размер и «выключена» — таблицы, вида нет: красит её тема по контексту.
 * Отметка направления — в слоте кнопки `trailing`, под `aria-hidden`:
 * направление скринридер объявляет по `aria-sort` заголовка. Стоит и у
 * неотсортированной колонки, невидимой: держит место. Несортируемая —
 * только текст в обёртке для темы. Текст — слот `header` со scope слота
 * колонки (`text`, `sortable`) и самой колонкой, без него — текст колонки.
 *
 * Тело — одна петля по `drawn`, ключ — ключ записи. Без окна это все
 * показанные строки. В окне обёртки `Virtual` — строки окна и распорки на
 * месте пропущенных: `tr` под `aria-hidden` с ячейкой во всю ширину таблицы
 * (`columnCount`), высоту которой тема берёт из её стиля, а стиль пишет ядро.
 * Строка — `Table.Row` над элементом коллекции строк; слот `cell` уходит ей
 * как есть: scope слотов таблицы и строки один, а строку в него кладёт сама
 * строка. Пока показанных строк нет — строка с одной ячейкой во всю ширину,
 * содержимое — слот `empty`.
 *
 * Шапка и тело — в слое лифта таблицы (`Elevate`): строка, смонтированная
 * внутри, прочтёт движок и регистратор таблицы и при коммите войдёт в её
 * коллекцию.
 */
export function Table(props: TableProps): ReactElement | null {
	const { ref, forwardProps, state, layer, facade } = useSetupTable(props)

	const {
		rendered,
		tag,
		size,
		disabled,
		mode,
		names_selectAll,
		headRowAria,
		cellAria,
		shownColumns,
		drawn,
		shown,
		columnCount,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { wrapper, root } = toWrappedRootProps(
		ref,
		state,
		[attrs, aria, dataset],
		forwardProps,
		's-table__viewport',
	)
	const { selectAll } = facade

	return (
		<div {...wrapper}>
			<Tag {...root}>
				<Elevate layer={layer}>
					<thead className="s-table__head">
						<tr className="s-table__head-row" {...toAriaProps(headRowAria)}>
							{mode === 'multiple' ? (
								<th className="s-table__select" {...toAriaProps(cellAria)}>
									<CheckBox
										key={selectAll.uid}
										embedded="table.select-all"
										ctrl={selectAll}
										aria_label={names_selectAll}
									/>
								</th>
							) : mode === 'single' ? (
								<td className="s-table__select" {...toAriaProps(cellAria)} />
							) : null}
							{shownColumns?.map((column) => (
								<TableColumn key={column.uid} ctrl={column}>
									{({ text, sortable }) => {
										const caption =
											renderSlot(props.header, { column, text, sortable }) ??
											text

										return sortable ? (
											<Button
												embedded="table.sort"
												className="s-table-column__sort"
												size={size}
												disabled={disabled}
												onActionPress={() =>
													facade.toggleSort(column.field)
												}
												trailing={
													<span
														className="s-table-column__sort-icon"
														aria-hidden="true"
													>
														<Icon
															embedded="table.sort-icon"
															tag={SortIcon}
															size={size}
														/>
													</span>
												}
											>
												{caption}
											</Button>
										) : (
											<span className="s-table-column__text">{caption}</span>
										)
									}}
								</TableColumn>
							))}
						</tr>
					</thead>
					<tbody className="s-table__body">
						{drawn?.map((entry) =>
							entry.kind === 'filler' ? (
								<tr
									key={entry.key}
									className="s-table__filler-row"
									aria-hidden="true"
									style={toReactStyle(entry.style)}
								>
									<td className="s-table__filler" colSpan={columnCount} />
								</tr>
							) : (
								<TableRow key={entry.key} ctrl={entry.item} cell={props.cell} />
							),
						)}
						{shown?.length === 0 ? (
							<tr className="s-table__empty-row">
								<td className="s-table__empty" colSpan={columnCount}>
									{renderSlot(props.empty)}
								</td>
							</tr>
						) : null}
					</tbody>
				</Elevate>
			</Tag>
		</div>
	)
}
