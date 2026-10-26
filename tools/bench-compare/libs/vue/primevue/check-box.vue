<script setup lang="ts">
import { useId } from 'vue'
import Checkbox from 'primevue/checkbox'

/** A checkbox and its label by `for`, as the PrimeVue docs pair them. */
defineOptions({ name: 'PrimeCheckBoxPage' })

const id = useId()
</script>

<template>
	<span style="display: inline-flex; gap: 8px; align-items: center">
		<Checkbox :input-id="id" binary />
		<label :for="id">Согласен</label>
	</span>
</template>
