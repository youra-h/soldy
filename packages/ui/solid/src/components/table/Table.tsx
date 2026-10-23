import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ITableRow, TDrawnEntry } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	createPartProps,
	createWrappedRootProps,
	relaySlot,
	renderSlot,
	rootTag,
} from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
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
 * Таблица: окно `div.so-table__viewport` — внешний узел, корень — `table` внутри.
 * Колонки и строки задаются только данными, поэтому `children` нет; слот `cell`
 * уходит строке как есть — строку в его scope кладут её ячейки.
 */
export function Table(props: TableProps): JSX.Element {
	const binding = setupTable(props)
	const state = binding.state
	const facade = binding.facade
	const layout = createWrappedRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		wrapper: 'so-table__viewport',
	}))
	const headRowAria = createPartProps(() => state.headRowAria)
	const cellAria = createPartProps(() => state.cellAria)

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
							<tr class="so-table__head-row" {...headRowAria()}>
								<Show
									when={state.mode === 'multiple'}
									fallback={
										<Show when={state.mode === 'single'}>
											<td class="so-table__select" {...cellAria()} />
										</Show>
									}
								>
									<th class="so-table__select" {...cellAria()}>
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
