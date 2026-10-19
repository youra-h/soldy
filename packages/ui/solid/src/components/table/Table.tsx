import { For, Show, type Accessor, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ITableRow, TDrawnEntry } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	createWrappedRootProps,
	relaySlot,
	renderSlot,
	rootTag,
} from '../../adapter'
import { CheckBox } from '../check-box'
import { TableColumn } from './column'
import { TableRow } from './row'
import { setupTable } from './setup.component'
import type { TableProps } from './base.component'

/** Строка записи; у распорки её нет. */
function rowOf(entry: TDrawnEntry<ITableRow>): ITableRow | undefined {
	return entry.kind === 'item' ? entry.item : undefined
}

/** Стиль распорки — высота пропущенных строк; у записи строки его нет. */
function fillerStyleOf(entry: TDrawnEntry<ITableRow>): JSX.CSSProperties | undefined {
	return entry.kind === 'filler' ? entry.style : undefined
}

/**
 * Table — таблица по паттернам APG Table и Sortable Table, как у Vue и React.
 * Корень — сама `table`, рисуется по `tag`: роль `table` даёт тег, своей
 * клавиатуры у таблицы нет. В режиме сетки (`grid`, APG Data Grid) роль
 * `grid`, `aria-multiselectable` и остановку Tab таблице пишет коллекция в её
 * `aria`, а клавиши и фокус ячеек ведёт плагин сетки на корне. Имя таблице —
 * `aria_label` или `aria_labelledBy`.
 *
 * Окно таблицы — разметка `div.so-table__viewport` вокруг корня: в окне
 * таблица прокручивается вбок, когда колонки шире места, — прокрутку включает
 * тема по `data-overflow` таблицы. Окно — внешний узел компонента, и класс,
 * стиль и `ref` потребителя (`consumerRef`) и скрытие достаются ему, а
 * классы, наборы, привязка корня к `TElementPlugin` (`bindRef`) и поверх
 * наборов остальные атрибуты потребителя — таблице (`createWrappedRootProps`),
 * как у Vue и React: `aria-label` и `id` потребителя называют таблицу, а не
 * окно без роли.
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
 * ячейка принимает фокус.
 *
 * Дальше — `Table.Column` на каждую показанную колонку: петля `<For>` —
 * колонки экземпляры, и ссылка на них устойчива. Подпись и кнопку сортировки
 * рядом с ней рисует сама колонка: кнопка — её, нажатие — её просьба, которую
 * выполняет коллекция. Таблица отдаёт колонке только подпись — слот `header`
 * пробросом (`relaySlot`): scope слота колонки (`text`, `sortable`) и сама
 * колонка; без него — текст колонки. Свой контрол в подписи — кнопка, триггер
 * Popover — и есть своё действие по заголовку: нажатие по ячейке не сортирует.
 *
 * Тело — одна петля по `drawn` по ключу записи (`KeyedFor`): записи `drawn`
 * новые на каждую смену, и `<For>`, сравнивая их по ссылке, пересоздавал бы
 * все строки вместе с узлами и фокусом сетки. Без окна это все показанные
 * строки. В окне обёртки `Virtual` — строки окна и распорки на месте
 * пропущенных: `tr` под `aria-hidden` с ячейкой во всю ширину таблицы
 * (`columnCount`), высоту которой тема берёт из её стиля, а стиль пишет ядро.
 * Строка — `Table.Row` над элементом коллекции строк; слот `cell` уходит ей
 * как есть: scope слотов таблицы и строки один, а строку в него кладут её
 * ячейки. Пока показанных строк нет — строка с одной ячейкой во всю ширину,
 * содержимое — слот `empty`.
 *
 * Шапка и тело — в слое лифта таблицы (`Elevate`): строка, смонтированная
 * внутри, прочтёт движок и регистратор таблицы при своей сборке и войдёт в её
 * коллекцию.
 */
export function Table(props: TableProps): JSX.Element {
	const binding = setupTable(props)
	const state = binding.state
	const facade = binding.facade
	// Окну — его класс, класс и стиль потребителя, таблице — классы и наборы
	// ядра, поверх — остальное от потребителя. `ref` — вне раскладки: окну
	// `ref` потребителя, таблице привязка корня
	const layout = createWrappedRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		wrapper: 'so-table__viewport',
	}))

	/** Запись `drawn`: строка или распорка на месте пропущенных. */
	const drawEntry = (entry: Accessor<TDrawnEntry<ITableRow>>) => (
		<Show
			when={rowOf(entry())}
			keyed
			fallback={
				<tr class="so-table__filler-row" aria-hidden="true" style={fillerStyleOf(entry())}>
					<td class="so-table__filler" colspan={state.columnCount} />
				</tr>
			}
		>
			{(row) => <TableRow ctrl={row} cell={props.cell} />}
		</Show>
	)

	return (
		<Show when={state.rendered}>
			<div {...layout().wrapper} ref={binding.consumerRef}>
				<Dynamic {...layout().root} component={rootTag(state.tag)} ref={binding.bindRef}>
					<Elevate layer={binding.layer}>
						<thead class="so-table__head">
							<tr class="so-table__head-row" {...state.headRowAria}>
								<Show
									when={state.mode === 'multiple'}
									fallback={
										<Show when={state.mode === 'single'}>
											<td class="so-table__select" {...state.cellAria} />
										</Show>
									}
								>
									<th class="so-table__select" {...state.cellAria}>
										<CheckBox
											embedded="table.select-all"
											ctrl={facade.selectAll}
											aria_label={state.names_selectAll}
										/>
									</th>
								</Show>
								<For each={state.shownColumns}>
									{(column) => (
										<TableColumn ctrl={column}>
											{relaySlot(props.header, { column })}
										</TableColumn>
									)}
								</For>
							</tr>
						</thead>
						<tbody class="so-table__body">
							<KeyedFor each={state.drawn} by={(entry) => entry.key}>
								{drawEntry}
							</KeyedFor>
							<Show when={state.shown?.length === 0}>
								<tr class="so-table__empty-row">
									<td class="so-table__empty" colspan={state.columnCount}>
										{renderSlot(props.empty)}
									</td>
								</tr>
							</Show>
						</tbody>
					</Elevate>
				</Dynamic>
			</div>
		</Show>
	)
}
