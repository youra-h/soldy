<script setup lang="ts">
import { Tabs } from '@soldy-ui/vue'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'SoldyTabsPage' })
</script>

<template>
	<Tabs>
		<Tabs.Item
			v-for="(item, index) in COLLECTION_ITEMS"
			:key="item.value"
			:active="index === 0"
			v-bind="item"
		/>
		<template #content>
			<Tabs.Content
				v-for="item in COLLECTION_ITEMS"
				:key="`c-${item.value}`"
				:value="item.value"
			>
				<div style="padding: 12px">Панель «{{ item.text }}»</div>
			</Tabs.Content>
		</template>
	</Tabs>
</template>
