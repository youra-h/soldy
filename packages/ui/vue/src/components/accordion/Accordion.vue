<script lang="ts">
import { AccordionItem } from './item'
import SetupAccordion from './setup.component'

export default { ...SetupAccordion, components: { AccordionItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" v-bind="attrs">
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. Tabs.vue). Проброс
				целиком: у каждого слота секции есть `item-<слот>`, и его scope —
				scope слота секции плюс сама секция. Заголовок секции (`header`) —
				`item`.

				`item-content` — содержимое раскрывающейся панели. Отдельного
				компонента `Accordion.Content` нет: панель лежит внутри элемента и
				отдельно от него не существует, поэтому она остаётся слотом.

				Стрелки секция рисует сама и по наличию слота решает, стоять ли
				обёртке стрелки на этой стороне, — поэтому их слоты отдаются ей,
				только когда заданы аккордеону.
			-->
			<AccordionItem v-for="item in shown" :key="item.uid" :ctrl="item">
				<template v-if="$slots['item-leading-icon']" #leading-icon>
					<slot name="item-leading-icon" :item="item" />
				</template>
				<template #leading>
					<slot name="item-leading" :item="item" />
				</template>
				<template #header="{ text, selected }">
					<slot name="item" :item="item" :text="text" :selected="selected" />
				</template>
				<template #trailing>
					<slot name="item-trailing" :item="item" />
				</template>
				<template v-if="$slots['item-trailing-icon']" #trailing-icon>
					<slot name="item-trailing-icon" :item="item" />
				</template>
				<slot name="item-content" :item="item" />
			</AccordionItem>
		</slot>
	</div>
</template>
