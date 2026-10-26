<script setup lang="ts">
import { VAutocomplete } from 'vuetify/components/VAutocomplete'
import { COLLECTION_ITEMS } from '../../../data'

/** Select with typing and filtering — `VAutocomplete`, as the soldy `editable` preview. */
defineOptions({ name: 'VuetifySelectPage' })
</script>

<template>
	<VAutocomplete
		:items="COLLECTION_ITEMS"
		item-title="text"
		item-value="value"
		placeholder="Выберите"
		style="width: 240px"
	/>
</template>
