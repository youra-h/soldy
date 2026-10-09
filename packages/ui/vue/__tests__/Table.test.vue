<script setup lang="ts">
/**
 * Тестовая обёртка: слот `cell` таблицы — из скомпилированного шаблона.
 *
 * Перерисовку ячеек со слотом проверяют только так: слоты из `mount(…, {
 * slots })` и из `h()` метки стабильности не несут, и Vue считает их
 * динамическими — ячейки с ними перерисовывались бы с каждой строкой.
 */
import { Table } from '@soldy-ui/vue'
import type { TTableCollection } from '@soldy-ui/core'

defineProps<{
	engine: TTableCollection
	/** Имя таблицы — проп, смена которого перерисовывает саму таблицу */
	label?: string
	/** Приписка к значению — состояние приложения, которое читает слот */
	mark?: string
	/** Слот зовёт его на каждую нарисованную ячейку: так тест считает их рендеры */
	count?: (field: string) => void
}>()
</script>

<template>
	<Table :engine="engine" :aria_label="label">
		<template #cell="{ column, value }">
			<span>{{ count?.(column.field) }}{{ value }}{{ mark }}</span>
		</template>
	</Table>
</template>
