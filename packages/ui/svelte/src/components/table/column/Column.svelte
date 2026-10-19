<script lang="ts">
	import { Dynamic, fieldText, roleIcon, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupTableColumn } from './setup.component'
	import type { TableColumnProps } from './base.component'

	let { ref = $bindable(), ...props }: TableColumnProps = $props()
	const mountId = $props.id()

	const binding = setupTableColumn(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	// Инстанс колонки: кнопка сортировки зовёт его `toggleSort()`
	const column = binding.ctrl

	// Стрелка сортировки — иконка по роли: метка одна на роль
	const SORT = roleIcon('arrowUpward')

	// Ширина на поле ручки — свойством узла и только когда разошлась с узлом: в
	// спреде Svelte писал бы её на каждую смену (`fieldText`)
	const width = fieldText(() => (state.resizer ? String(state.resizer.value) : undefined))
</script>

<!--
	TableColumn — заголовок колонки (`Table.Column`). Корень — сама ячейка
	шапки, рисуется по `tag` колонки (по умолчанию `th`). На ней наборы колонки:
	`aria-sort` (только у первой по приоритету), `data-sort` и
	`data-sort-priority`, `data-align`, `data-sized`, `data-resizing`, — и
	ширина переменной `--so-table-column-width` (`widthStyle`, считает ядро) —
	стиль-выходом компонента, под стилем потребителя (`toRootProps`).

	Имя заголовка — ссылка на подпись (`aria-labelledby` в `aria`): своё имя
	браузер собрал бы из всей ячейки, а в ней и значение поля ручки («Имя 150»),
	и имя кнопки сортировки. Ссылку и `id` подписи пишет плагин связок.
	Обработчиков на ячейке нет: протяжку ловит плагин ручки на корне, клавиши и
	жест скринридера — он же на поле. Нажатие по ячейке не сортирует.

	Содержимое — ряд, как у Vue, React и Solid: подпись, а у сортируемой
	колонки за ней кнопка сортировки; где ряд стоит и с какой стороны подписи
	кнопка, решает тема. Подпись — у всех колонок: сниппет `children` со scope
	`{ text, sortable }`, без него — текст колонки; таблица отдаёт в него свой
	слот `header`, и своё действие по заголовку потребитель ставит туда
	контролом. Подписью названы заголовок и поле ручки (`textAria`).

	Кнопка сортировки — `Button` (`embedded: 'table.sort'`), только у
	`sortable`: её рисует колонка, а не таблица через слот — кнопка в подписи
	дописала бы своё имя к имени заголовка. Нажатие — просьба колонки
	(`toggleSort`), сортирует расширение коллекции строк; выключена вместе с
	таблицей. Текста у кнопки нет — имя ей с подписью колонки пишет плагин имён
	от локали (`sortAria`), а направление скринридер объявляет по `aria-sort`
	заголовка, поэтому обёртка стрелки скрыта от него. Вида и размера кнопке и
	стрелке разметка не передаёт: их даёт тема по контексту.

	Ручка ширины — полоса у края заголовка, только когда она есть
	(`resizerRendered`: колонка `resizable`, не выключена, и ширина известна).
	Поле в ней — нативный `range`, как поле ручки Slider: мобильные скринридеры
	двигают его своим жестом. Ход — значение ядра (`resizer`), имя — ссылка на
	подпись (`resizerAria`). Ширину ведёт ядро, и в узел её пишет attachment
	поля (`fieldText`), только когда она разошлась с узлом, — после `min` и
	`max`: attachment-ы Svelte ставит после атрибутов узла, и ширина не
	прижимается к ходу по умолчанию, 0–100.

	Подпись и кнопка, ряд и полоса стоят вплотную: пробел между ними Svelte
	оставил бы в заголовке текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			state.widthStyle,
		)}
		attach={binding.attachElement}
	>
		<span class="so-table-column__content">
			<span class="so-table-column__text" {...state.textAria}>
				{#if props.children}
					{@render props.children({
						text: state.text ?? '',
						sortable: state.sortable ?? false,
					})}
				{:else}
					{state.text}
				{/if}
			</span>{#if state.sortable}<Button
					embedded="table.sort"
					type="button"
					class="so-table-column__sort"
					disabled={state.disabled}
					{...state.sortAria}
					onActionPress={() => column.toggleSort()}
				>
					<span class="so-table-column__sort-icon" aria-hidden="true">
						<Icon embedded="table.sort-icon" tag={SORT} />
					</span>
				</Button>{/if}
		</span>{#if state.resizerRendered && state.resizer}<span class="so-table-column__resizer">
				<input
					class="so-table-column__input"
					type="range"
					min={state.resizer.min}
					max={state.resizer.max}
					{...state.resizerAria}
					{...width}
				/>
			</span>{/if}
	</Dynamic>
{/if}
