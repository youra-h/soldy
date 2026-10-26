<script setup lang="ts">
import { ref } from 'vue'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import { COLLECTION_ITEMS } from '../../../data'

/**
 * Select with typing and filtering — `AutoComplete` with the dropdown button,
 * as the soldy `editable` preview; the suggestions are filtered by the page,
 * as the PrimeVue docs do it.
 */
defineOptions({ name: 'PrimeSelectPage' })

const value = ref()
const suggestions = ref([...COLLECTION_ITEMS])

function complete({ query }: AutoCompleteCompleteEvent) {
	const text = query.trim().toLowerCase()

	suggestions.value = COLLECTION_ITEMS.filter((item) => item.text.toLowerCase().includes(text))
}
</script>

<template>
	<AutoComplete
		v-model="value"
		:suggestions="suggestions"
		option-label="text"
		dropdown
		placeholder="Выберите"
		@complete="complete"
	/>
</template>
