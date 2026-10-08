<script lang="ts">
import { CheckBox } from '../../check-box'
import SetupTableRow from './setup.component'

export default { ...SetupTableRow, components: { CheckBox } }
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
			Ячейка — по одной на ячейку строки (`cells`), ключ — колонка. Набор
			ячейки — `data-align` колонки и, у заголовка строки, его `id`.

			Ячейка колонки `rowHeader` — заголовок строки: `th` с `scope="row"`, на
			её текст ссылается имя чекбокса строки. Остальные — `td`. Класс один:
			тема различает их тегом.

			Содержимое — слот `cell` со scope `{ column, value }`, пустой — `value`
			текстом; таблица отдаёт в него свой слот `cell`, добавив строку.
		-->
		<template v-for="cell in cells" :key="cell.column.uid">
			<th
				v-if="cell.rowHeader"
				class="s-table-row__cell"
				scope="row"
				v-bind="{ ...cell.dataset, ...cellAria, ...cell.aria }"
			>
				<slot name="cell" :column="cell.column" :value="cell.value">{{ cell.value }}</slot>
			</th>

			<td
				v-else
				class="s-table-row__cell"
				v-bind="{ ...cell.dataset, ...cellAria, ...cell.aria }"
			>
				<slot name="cell" :column="cell.column" :value="cell.value">{{ cell.value }}</slot>
			</td>
		</template>
	</component>
</template>
