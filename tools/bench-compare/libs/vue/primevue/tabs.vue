<script setup lang="ts">
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { COLLECTION_ITEMS } from '../../../data'

defineOptions({ name: 'PrimeTabsPage' })
</script>

<template>
	<Tabs :value="COLLECTION_ITEMS[0].value">
		<TabList>
			<Tab v-for="item in COLLECTION_ITEMS" :key="item.value" :value="item.value">
				{{ item.text }}
			</Tab>
		</TabList>
		<TabPanels>
			<TabPanel v-for="item in COLLECTION_ITEMS" :key="item.value" :value="item.value">
				<div style="padding: 12px">Панель «{{ item.text }}»</div>
			</TabPanel>
		</TabPanels>
	</Tabs>
</template>
