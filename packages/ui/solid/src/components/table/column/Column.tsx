import type { JSX } from 'solid-js'
import {
	Root,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupTableColumn } from './setup.component'
import type { TableColumnProps } from './base.component'

/** Стрелка сортировки — иконка по роли, компонент на роль один на модуль. */
const SortIcon = roleIcon('arrowUpward')

/**
 * Заголовок колонки — ячейка шапки, её рисует таблица. Кнопка сортировки — соседка
 * подписи, а не в слоте: в подписи она дописала бы своё имя к имени заголовка.
 */
export function TableColumn(props: TableColumnProps): JSX.Element {
	const binding = setupTableColumn(props)
	const state = binding.state
	const column = binding.column
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.widthStyle,
	}))
	const textAria = createPartProps(() => state.textAria)
	const resizerAria = createPartProps(() => state.resizerAria)
	const caption = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '', sortable: state.sortable ?? false }),
	)
	const width = fieldText(() => (state.resizer ? String(state.resizer.value) : undefined))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<span class="so-table-column__content">
					<span class="so-table-column__text" {...textAria()}>
						{caption() ?? state.text}
					</span>
					<Show when={state.sortable}>
						<Button
							embedded="table.sort"
							type="button"
							class="so-table-column__sort"
							disabled={state.disabled}
							{...state.sortAria}
							onActionPress={() => column.toggleSort()}
						>
							<span class="so-table-column__sort-icon" aria-hidden="true">
								<Icon embedded="table.sort-icon" tag={SortIcon} />
							</span>
						</Button>
					</Show>
				</span>
				<Show when={state.resizerRendered && state.resizer}>
					{(resizer) => (
						<span class="so-table-column__resizer">
							<input
								class="so-table-column__input"
								type="range"
								min={resizer().min}
								max={resizer().max}
								{...resizerAria()}
								{...width}
							/>
						</span>
					)}
				</Show>
			</Root>
		</Show>
	)
}
