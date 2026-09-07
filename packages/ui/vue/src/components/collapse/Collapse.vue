<script lang="ts">
import { CollapseItem } from './item'
import SetupCollapse from './setup.component'

export default { ...SetupCollapse, components: { CollapseItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" :dir="dir ?? undefined">
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. Tabs.vue).

				`item-content` — содержимое раскрывающейся панели. Отдельного
				компонента `Collapse.Content` нет: панель лежит внутри элемента и
				отдельно от него не существует, поэтому она остаётся слотом.
			-->
			<CollapseItem v-for="item in items" :key="item.uid" :ctrl="item">
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
			</CollapseItem>
		</slot>
	</div>
</template>
