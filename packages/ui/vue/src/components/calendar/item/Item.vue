<script lang="ts">
import SetupCalendarItem from './setup.component'

export default { ...SetupCalendarItem }
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
			День календаря — Calendar.Item. Корень — сама ячейка сетки, рисуется
			по `tag` (по умолчанию `td`): по APG (Date Picker Dialog) фокус стоит на
			ячейке, и на ней же набор `aria` (имя — полная дата, `aria-selected`,
			`aria-current`, `aria-disabled`, `tabindex` остановки Tab) и набор
			`dataset` — отметки выбора, «сегодня», «недоступен», «выключен».
			Кнопки внутри ячейки нет: фокус на ней развёл бы ячейку и то, что
			фокусируют. Нажатия и клавиши ловят плагины календаря на его корне.

			Полосу диапазона тема рисует псевдоэлементом ячейки — своего узла у
			неё нет.
		-->

		<!--
			Плитка дня — то, что видно выбранным: заливка, наведение, кольцо
			фокуса, рамка «сегодня». Стоит поверх полосы диапазона. `div`, а не
			`span`: в слот кладут и блочное содержимое.
		-->
		<div class="s-calendar-item__day">
			<!-- Слот по умолчанию со scope `{ text }`; пустой — номер дня `text`. -->
			<slot :text="text">{{ text }}</slot>
		</div>
	</component>
</template>
