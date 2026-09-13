<script lang="ts">
import { TagsItem } from './item'
import SetupTags from './setup.component'

export default { ...SetupTags, components: { TagsItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		v-bind="aria"
	>
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. ListBox/Tabs).

				`shown`, а не `items`: это то, что осталось после отбора.
				Скрытый элемент размонтируется, но из коллекции не исчезает —
				составом владеют данные, а не разметка (см. `owned` в
				`TCollectionExtension`). Снятие фильтра возвращает его на место.
			-->
			<TagsItem v-for="item in shown" :key="item.uid" :ctrl="item">
				<template #leading>
					<slot name="item-leading" :item="item" />
				</template>
				<template #default>
					<slot name="item" :item="item" />
				</template>
				<template #trailing>
					<slot name="item-trailing" :item="item" />
				</template>
			</TagsItem>
		</slot>
	</div>
</template>
