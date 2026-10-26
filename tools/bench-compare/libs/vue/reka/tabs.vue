<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'RekaTabsPage' })
</script>

<template>
	<TabsRoot :default-value="COLLECTION_ITEMS[0].value">
		<TabsList>
			<TabsTrigger v-for="item in COLLECTION_ITEMS" :key="item.value" :value="item.value">
				{{ item.text }}
			</TabsTrigger>
		</TabsList>
		<TabsContent v-for="item in COLLECTION_ITEMS" :key="item.value" :value="item.value">
			<div style="padding: 12px">Панель «{{ item.text }}»</div>
		</TabsContent>
	</TabsRoot>
</template>
