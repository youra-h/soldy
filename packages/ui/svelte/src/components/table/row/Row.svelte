<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { CheckBox } from '../../check-box'
	import { setupTableRow } from './setup.component'
	import type { TableRowProps } from './base.component'

	let { ref = $bindable(), ...props }: TableRowProps = $props()
	const mountId = $props.id()

	const binding = setupTableRow(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка ячеек — в scope слота `cell` её кладут ячейки
	const row = binding.ctrl
</script>

<!--
	TableRow — строка таблицы (`Table.Row`). Корень — `tr`, рисуется по `tag`
	строки. На нём модификаторы размера и варианта (их строке диктует таблица)
	и набор `dataset`: `data-selected` (пишет выбор коллекции — всем строкам) и
	`data-disabled`, а в сетке — `aria-selected`. Нажатие по строке ловит
	плагин сетки таблицы: в сетке оно выбирает строку, в роли `table` не делает
	ничего — выбирают чекбоксом.

	Ячейка колонки выбора — только пока выбор строк включён (`selecting`: режим
	не `none`), как её заголовок в шапке. Чекбокс строки — CheckBox
	(`embedded: 'table.select'`) над экземпляром, который держит таблица:
	отметку, «выключен», размер и вариант она пишет ему от выбора и строки, а
	клик по нему — просьба, которую она выполняет выбором строки. Поэтому ни
	значения, ни обработчиков здесь нет: отменённый выбор отметку не меняет.
	Чекбокс берётся только в этой ветке: геттер item-адаптера таблицы его
	создаёт, и у таблицы без выбора чекбоксов строк нет. Имя — ссылка на
	заголовок строки (`aria-labelledby` на `rowHeaderId`); заголовка нет — нет
	и ссылки.

	Ячейки — по одной на ячейку строки (`cells`), петля по колонке ячейки:
	ячейки строки — новые записи на каждую смену, а узел ячейки держит её
	колонку и новую запись рисует на месте, с фокусом сетки на нём. Своей
	границы перерисовки, как `_TableRowCells` у Vue и `withRenderBoundary` у
	React, ячейкам не нужно: Svelte перерисовывает не компонент, а то, что
	прочло сменившееся. Выбор строки меняет её атрибуты, а содержимое ячейки
	читает только свою ячейку (`change:cells` — колонки, запись строки) и
	сниппет: «выбрать все» ни одной ячейки и сниппета не трогает.

	Ячейка — без обёртки: ячейки — дети `tr`. Набор ячейки — `data-align`
	колонки, набор ячеек строки (`cellAria`: в сетке ячейка принимает фокус) и,
	у заголовка строки, его `id`. Ячейка колонки `rowHeader` — заголовок строки:
	`th` с `scope="row"`, на её текст ссылается имя чекбокса строки. Остальные —
	`td`. Класс один: тема различает их тегом.

	Содержимое ячейки — сниппет `cell` со scope `{ row, column, value }`: строку
	в scope кладут ячейки, таблица отдаёт строке свой сниппет как есть. Без
	него — значение текстом (`text` ячейки): тип поля записи таблица не знает,
	и текст считает ядро по правилу, общему для всех адаптеров, — интерполяция
	Svelte нарисовала бы объект как `[object Object]`. Сниппет непрозрачен:
	заданный, он рисуется в каждой ячейке вместо значения — и там, где ничего не
	нарисовал. Тот же текст значения сниппет рисует сам — `toText(value)` из
	`@soldy-ui/core`.

	Ячейка выбора и ячейки колонок стоят вплотную: пробел между ними Svelte
	оставил бы в строке текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		{#if state.selecting}<td class="so-table-row__select" {...state.cellAria}>
				<CheckBox
					embedded="table.select"
					ctrl={context?.adapters.table.checkBox}
					aria_labelledBy={state.rowHeaderId}
				/>
			</td>{/if}{#each state.cells ?? [] as cell (cell.column.uid)}
			<svelte:element
				this={cell.rowHeader ? 'th' : 'td'}
				class="so-table-row__cell"
				scope={cell.rowHeader ? 'row' : undefined}
				{...cell.dataset}
				{...state.cellAria}
				{...cell.aria}
			>
				{#if props.cell}
					{@render props.cell({ row, column: cell.column, value: cell.value })}
				{:else}
					{cell.text}
				{/if}
			</svelte:element>
		{/each}
	</Dynamic>
{/if}
