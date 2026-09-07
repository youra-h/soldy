<script lang="ts">
import { ListBoxItem } from './item'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		:aria-disabled="disabled"
		tabindex="0"
	>
		<slot name="header" />
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. Tabs.vue).
			-->
			<ListBoxItem v-for="item in items" :key="item.uid" :ctrl="item">
				<template #leading>
					<slot name="item-leading" :item="item" />
				</template>
				<template #default>
					<slot name="item" :item="item" />
				</template>
				<template #trailing>
					<slot name="item-trailing" :item="item" />
				</template>
			</ListBoxItem>
		</slot>
		<slot name="footer" />
	</div>
</template>
