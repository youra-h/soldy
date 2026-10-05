<script lang="ts">
import SetupTableColumn from './setup.component'

export default { ...SetupTableColumn }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="widthStyle"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Заголовок колонки — Table.Column. Корень — сама ячейка шапки, рисуется
			по `tag` колонки (по умолчанию `th`). На ней наборы колонки: `aria-sort`
			(только у первой по приоритету — по ARIA его ставят одному заголовку),
			`data-sort` и `data-sort-priority` (пишет расширение сортировки),
			`data-align`, — и ширина переменной `--s-table-column-width`
			(`widthStyle`, считает ядро): тема кладёт её в ширину ячейки шапки, и по
			ней раскладка таблицы режет колонку.

			Содержимое — слот по умолчанию со scope `{ text, sortable }`, пустой —
			текст колонки. Наполняет его таблица: у сортируемой колонки — кнопкой
			сортировки, у остальных — текстом. Здесь их нет: кнопке нужны размер и
			«выключена» таблицы и её команда, а у колонки их нет.
		-->
		<slot :text="text" :sortable="sortable">{{ text }}</slot>
	</component>
</template>
