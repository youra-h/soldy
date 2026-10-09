<script lang="ts">
import { CheckBox } from '../../check-box'
import TableRowCells from './Cells.vue'
import SetupTableRow from './setup.component'

export default { ...SetupTableRow, components: { CheckBox, TableRowCells } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Строка таблицы — Table.Row. Корень — `tr`, рисуется по `tag` строки. На
			нём модификаторы размера и варианта (их строке диктует таблица) и набор
			`dataset`: `data-selected` (пишет выбор коллекции — всем строкам) и
			`data-disabled`, а в сетке — `aria-selected`. Нажатие по строке ловит
			плагин сетки таблицы: в сетке оно выбирает строку, в роли `table` не
			делает ничего — выбирают чекбоксом.
		-->

		<!--
			Ячейка колонки выбора — только пока выбор строк включён (`selecting`:
			режим не `none`), как её заголовок в шапке. Чекбокс строки — CheckBox
			(`embedded: 'table.select'`) над экземпляром, который держит таблица:
			отметку, «выключен», размер и вариант она пишет ему от выбора и
			строки, а клик по нему — просьба, которую она выполняет выбором строки.
			Поэтому ни значения, ни обработчиков здесь нет: отменённый выбор
			отметку не меняет. Имя — ссылка на заголовок строки (`aria-labelledby`
			на `id` ячейки колонки `rowHeader`, `rowHeaderId`); заголовка нет —
			нет и ссылки.

			Набор ячеек строки (`cellAria`) — у этой ячейки и у ячеек колонок:
			экземпляра у ячейки нет, и его держит строка. В сетке ячейка принимает
			фокус.
		-->
		<td v-if="selecting" class="s-table-row__select" v-bind="cellAria">
			<CheckBox
				embedded="table.select"
				:ctrl="context?.adapters.table.checkBox"
				:aria_labelledBy="rowHeaderId"
			/>
		</td>

		<!--
			Ячейки — по одной на ячейку строки (`cells`), своим внутренним
			компонентом (`_TableRowCells`): его Vue перерисовывает отдельно от
			строки. Выбор пишет строке `data-selected`, и строка рисуется заново,
			а ячейки — нет: их входы, ячейки и их набор, выбор не меняет.

			Содержимое ячейки — слот `cell` со scope `{ row, column, value }`; строку
			в него кладут ячейки, таблица отдаёт свой слот как есть. Слот есть —
			ячейкам он уходит пробросом, нет — ячейкам слотов не передают вовсе:
			проброс у строки без слотов Vue считает динамическим и перерисовывал
			бы ячейки с каждой перерисовкой строки (AGENTS.md, Pitfalls).
		-->
		<TableRowCells v-if="$slots.cell" :row="ctrl" :cells="cells" :cellAria="cellAria">
			<template #cell="{ row, column, value }">
				<slot name="cell" :row="row" :column="column" :value="value">{{ value }}</slot>
			</template>
		</TableRowCells>
		<TableRowCells v-else :row="ctrl" :cells="cells" :cellAria="cellAria" />
	</component>
</template>
