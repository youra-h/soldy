<script setup lang="ts">
/**
 * Test harness: Accordion's `item-content` slot from a compiled template —
 * an `h()`/`mount(…, { slots })` slot carries no stability mark and is
 * always dynamic (AGENTS.md, Pitfalls), so this is the only way to test it.
 */
import { Accordion } from '@soldy-ui/vue'

defineProps<{
	items: ReadonlyArray<{ value: string; text: string }>
	/** Not an Accordion prop: falls into `$attrs`, redraws Accordion only */
	label?: string
	/** Called on each drawn section, so the test counts their renders */
	count?: (value: string) => void
}>()
</script>

<template>
	<Accordion :items="items" :data-test-label="label">
		<template #item-content="{ item }">
			<span>{{ count?.(item.value) }}</span>
		</template>
	</Accordion>
</template>
