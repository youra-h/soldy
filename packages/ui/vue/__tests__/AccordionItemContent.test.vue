<script setup lang="ts">
/**
 * Тестовая обёртка: слот `item-content` Accordion — из скомпилированного
 * шаблона.
 *
 * Перерисовку секций со слотом проверяют только так: слоты из `mount(…, {
 * slots })` и из `h()` метки стабильности не несут, и Vue считает их
 * динамическими — секции с ними перерисовывались бы с каждой перерисовкой
 * владельца (AGENTS.md, Pitfalls).
 */
import { Accordion } from '@soldy-ui/vue'

defineProps<{
	items: ReadonlyArray<{ value: string; text: string }>
	/**
	 * Метка — проп, которого у Accordion нет: он выпадает в `$attrs` и
	 * перерисовывает сам Accordion, не затрагивая секции
	 */
	label?: string
	/** Слот зовёт его на каждую нарисованную секцию: так тест считает их рендеры */
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
