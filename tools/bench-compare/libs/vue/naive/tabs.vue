<script setup lang="ts">
import { NTabPane, NTabs } from 'naive-ui'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'NaiveTabsPage' })
</script>

<template>
	<NTabs :default-value="COLLECTION_ITEMS[0].value">
		<NTabPane
			v-for="item in COLLECTION_ITEMS"
			:key="item.value"
			:name="item.value"
			:tab="item.text"
		>
			<div style="padding: 12px">Панель «{{ item.text }}»</div>
		</NTabPane>
	</NTabs>
</template>
