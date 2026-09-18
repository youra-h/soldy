<script lang="ts">
import { RadioGroupItem } from './item'
import SetupRadioGroup from './setup.component'

export default { ...SetupRadioGroup, components: { RadioGroupItem } }
</script>

<template>
	<!--
		Контейнер группы. Набор `aria` владельца — здесь: `role="radiogroup"`
		пишет ядро, имя из `aria_label` / `aria_labelledBy` — TAriaPlugin.

		В теме oren стилей у `.s-radio-group` нет (решение владельца): радио
		одной группы стоят где угодно внутри контейнера — в строках списка, в
		ячейках таблицы, — и раскладку задаёт потребитель.
	-->
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<slot>
			<!--
				Запасное содержимое — радио из пропа `items`, по одному на
				элемент (перебор `shown`, как в ListBox.vue). Слот подписи
				статический и получает радио через scope (`item`), как у
				остальных коллекций: динамические имена резолвит только Vue.
			-->
			<RadioGroupItem v-for="item in shown" :key="item.uid" :ctrl="item">
				<slot name="item" :item="item" />
			</RadioGroupItem>
		</slot>
	</component>
</template>
