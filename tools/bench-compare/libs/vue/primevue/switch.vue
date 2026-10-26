<script setup lang="ts">
import { useId } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'

/** A switch and its label by `for`, as the PrimeVue docs pair them. */
defineOptions({ name: 'PrimeSwitchPage' })

const id = useId()
</script>

<template>
	<span style="display: inline-flex; gap: 8px; align-items: center">
		<ToggleSwitch :input-id="id" />
		<label :for="id">Включено</label>
	</span>
</template>
