import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { setupTableColumn } from './setup.component'
import type { TableColumnProps } from './base.component'

/** Стрелка сортировки — иконка по роли, компонент на роль один на модуль (`roleIcon`). */
const SortIcon = roleIcon('arrowUpward')

/**
 * TableColumn — заголовок колонки (`Table.Column`). Корень — сама ячейка
 * шапки, рисуется по `tag` колонки (по умолчанию `th`). На ней наборы колонки:
 * `aria-sort` (только у первой по приоритету), `data-sort` и
 * `data-sort-priority`, `data-align`, `data-sized`, `data-resizing`, — и
 * ширина переменной `--so-table-column-width` (`widthStyle`, считает ядро) —
 * стиль-выходом компонента, под стилем потребителя (`createRootProps`).
 *
 * Имя заголовка — ссылка на подпись (`aria-labelledby` в `aria`): своё имя
 * браузер собрал бы из всей ячейки, а в ней и значение поля ручки («Имя 150»),
 * и имя кнопки сортировки. Ссылку и `id` подписи пишет плагин связок.
 * Обработчиков на ячейке нет: протяжку ловит плагин ручки на корне, клавиши и
 * жест скринридера — он же на поле. Нажатие по ячейке не сортирует.
 *
 * Содержимое — ряд, как у Vue и React: подпись, а у сортируемой колонки за ней
 * кнопка сортировки; где ряд стоит и с какой стороны подписи кнопка, решает
 * тема. Подпись — у всех колонок: слот `children` со scope
 * `{ text, sortable }`, пустой — текст колонки; таблица отдаёт в него свой
 * слот `header`, и своё действие по заголовку потребитель ставит туда
 * контролом. По слоту разметка выбирает, что рисовать, поэтому его
 * разворачивает адаптер, один раз (`resolveSlot`). Подписью названы заголовок
 * и поле ручки (`textAria`).
 *
 * Кнопка сортировки — `Button` (`embedded: 'table.sort'`), только у
 * `sortable`: её рисует колонка, а не таблица через слот — кнопка в подписи
 * дописала бы своё имя к имени заголовка. Нажатие — просьба колонки
 * (`toggleSort`), сортирует расширение коллекции строк; выключена вместе с
 * таблицей. Текста у кнопки нет — имя ей с подписью колонки пишет плагин имён
 * от локали (`sortAria`), а направление скринридер объявляет по `aria-sort`
 * заголовка, поэтому обёртка стрелки скрыта от него. Вида и размера кнопке и
 * стрелке разметка не передаёт: их даёт тема по контексту.
 *
 * Ручка ширины — полоса у края заголовка, только когда она есть
 * (`resizerRendered`: колонка `resizable`, не выключена, и ширина известна).
 * Поле в ней — нативный `range`, как поле ручки Slider: мобильные скринридеры
 * двигают его своим жестом. Ход — значение ядра (`resizer`), имя — ссылка на
 * подпись (`resizerAria`). Ширину ведёт ядро, и в узел её пишет `ref` поля
 * (`fieldText`), только когда она разошлась с узлом, — как поле адаптера
 * `NativeInput` у React: привязку `value` Solid писал бы узлу на каждую смену.
 */
export function TableColumn(props: TableColumnProps): JSX.Element {
	const binding = setupTableColumn(props)
	const state = binding.state
	const column = binding.column
	// Наборы ядра, поверх — атрибуты снаружи; ширина — стиль-выходом под стилем
	// потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.widthStyle,
	}))
	// Подписи и полю ручки — их наборы: экземпляров у них нет
	const textAria = createPartProps(() => state.textAria)
	const resizerAria = createPartProps(() => state.resizerAria)
	const caption = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '', sortable: state.sortable ?? false }),
	)
	const width = fieldText(() => (state.resizer ? String(state.resizer.value) : undefined))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
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
			</Dynamic>
		</Show>
	)
}
