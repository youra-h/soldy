<script setup lang="ts">
import { computed, ref } from 'vue'
import { VTab, VTabs } from 'vuetify/components/VTabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
defineOptions({ name: 'VuetifyTabsPage' })

const value = ref<string>(COLLECTION_ITEMS[0].value)
const active = computed(() => COLLECTION_ITEMS.find((item) => item.value === value.value))
</script>

<template>
	<div>
		<VTabs v-model="value">
			<VTab v-for="item in COLLECTION_ITEMS" :key="item.value" :value="item.value">
				{{ item.text }}
			</VTab>
		</VTabs>
		<div role="tabpanel" style="padding: 12px">Панель «{{ active?.text }}»</div>
	</div>
</template>
