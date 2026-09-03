<script setup lang="ts">
defineProps<{
	label: string
}>()
</script>

<template>
	<div class="property-field">
		<label class="property-field__label">{{ label }}:</label>
		<div class="property-field__control">
			<slot />
		</div>
	</div>
</template>
