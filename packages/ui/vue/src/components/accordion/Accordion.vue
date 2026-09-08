<script lang="ts">
import { AccordionItem } from './item'
import SetupAccordion from './setup.component'

export default { ...SetupAccordion, components: { AccordionItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
	>
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. Tabs.vue).

				`item-content` — содержимое раскрывающейся панели. Отдельного
				компонента `Accordion.Content` нет: панель лежит внутри элемента и
				отдельно от него не существует, поэтому она остаётся слотом.
			-->
			<AccordionItem v-for="item in items" :key="item.uid" :ctrl="item">
				<template #leading>
					<slot name="item-leading" :item="item" />
				</template>
				<template #header>
					<slot name="item" :item="item" />
				</template>
				<template #trailing>
					<slot name="item-trailing" :item="item" />
				</template>
				<slot name="item-content" :item="item" />
			</AccordionItem>
		</slot>
	</div>
</template>
