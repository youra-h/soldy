<script setup lang="ts">
/** Тестовая обёртка: точка резолвится только компилятором SFC. */
import { ListBox } from '@soldy/ui-vue'

defineProps<{
	mode?: 'single' | 'multiple'
	/** Списочное свойство `IList`: где стоит отметка выбранного. */
	indicator?: 'none' | 'start' | 'end'
	direction?: 'ltr' | 'rtl' | 'inherit'
}>()
</script>

<template>
	<ListBox :mode="mode ?? 'single'" :indicator="indicator" :direction="direction">
		<ListBox.Item value="msk" text="Москва" />
		<ListBox.Item value="tver" text="Тверь" />
		<ListBox.Item value="tula" text="Тула" />
	</ListBox>
</template>
