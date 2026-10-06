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
			`data-align`, `data-sized` (своя ширина) и `data-resizing` (тянут
			ручку), — и ширина переменной `--s-table-column-width` (`widthStyle`,
			считает ядро): тема кладёт её в ширину ячейки шапки, и по ней раскладка
			таблицы режет колонку.

			Имя заголовка — ссылка на обёртку содержимого (`aria-labelledby` в
			`aria`): своё имя браузер собрал бы из всей ячейки, а значение поля
			ручки в ней вошло бы в имя заголовка («Имя 150»). Ссылку и `id`
			обёртки пишет плагин связок.

			Обработчиков здесь нет: протяжку ловит плагин ручки на корне, клавиши
			и жест скринридера — он же на поле.
		-->

		<!--
			Содержимое — слот по умолчанию со scope `{ text, sortable }`, пустой —
			текст колонки. Наполняет его таблица: у сортируемой колонки — кнопкой
			сортировки, у остальных — текстом. Здесь их нет: кнопке нужны размер и
			«выключена» таблицы и её команда, а у колонки их нет. Обёртка — блок во
			всю ячейку: по ней тема раскладывает кнопку и текст, и ею названы
			заголовок и поле ручки (`contentAria`).
		-->
		<span class="s-table-column__content" v-bind="contentAria">
			<slot :text="text" :sortable="sortable">{{ text }}</slot>
		</span>

		<!--
			Ручка ширины — полоса у края заголовка, только когда она есть
			(`resizerRendered`: колонка `resizable`, не выключена, и ширина
			известна). Разметка, а не часть: потребитель её не адресует. Где
			полоса стоит и как видна, решает тема.

			Нативное поле — как поле ручки Slider: мобильные скринридеры двигают
			его своим жестом. Ход и ширина — значение ядра (`resizer`), имя —
			ссылка на обёртку содержимого (`resizerAria`): ровно текст колонки.
			Тема делает поле прозрачным во всю полосу и не пускает к нему
			указатель: тянет плагин, а не браузер.
		-->
		<span v-if="resizerRendered" class="s-table-column__resizer">
			<input
				class="s-table-column__input"
				type="range"
				:min="resizer.min"
				:max="resizer.max"
				:value="resizer.value"
				v-bind="resizerAria"
			/>
		</span>
	</component>
</template>
