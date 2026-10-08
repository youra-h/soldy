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
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			`dataset` — рядом с `aria`: режим переполнения уезжает в тему через
			`data-overflow`, и раскладка ряда (перенос, прокрутка) целиком её
			дело.

			Слот `default` получает показанные теги (`shown`): своя разметка
			раскладывает их, как ей нужно, — в ленту, в ряд с хвостом в панели.
			Каждый тег рисуется в ней ровно один раз, как и здесь: вторая
			отрисовка перетёрла бы его запись в реестре bundles.
		-->
		<slot :shown="shown">
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
