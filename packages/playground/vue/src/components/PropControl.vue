<script setup lang="ts">
import { computed } from 'vue'
import { Input, Select, Switch } from '@soldy/ui-vue'
import type { TPropControl } from '@soldy/playground-shared'

/**
 * Редактор одного пропа.
 *
 * Тип контрола приходит из общего манифеста, а не выбирается здесь: логика
 * «есть список значений — значит Select, иначе по типу» одинакова для всех
 * шести адаптеров и потому живёт в `@soldy/playground-shared`. Здесь остаётся
 * только отрисовка — тем же набором компонентов, который стенд и проверяет.
 */
const props = defineProps<{ control: TPropControl; modelValue: unknown }>()

const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const asBoolean = computed(() => Boolean(props.modelValue))
const asText = computed(() => (props.modelValue == null ? '' : String(props.modelValue)))

/**
 * Пустая строка в числовом поле — это «не задано», а не ноль. `Number('')`
 * даёт `0` и молча подменил бы смысл.
 */
function onNumber(value: unknown): void {
	const text = String(value ?? '').trim()

	emit('update:modelValue', text === '' ? undefined : Number(text))
}
</script>

<template>
	<Switch
		v-if="control.kind === 'switch'"
		:value="asBoolean"
		size="sm"
		@update:value="emit('update:modelValue', $event)"
	/>

	<Select
		v-else-if="control.kind === 'select'"
		:value="asText"
		size="sm"
		placeholder="не задано"
		clearable
		@update:value="emit('update:modelValue', $event)"
	>
		<Select.Item
			v-for="option in control.options"
			:key="option"
			:value="option"
			:text="option"
		/>
	</Select>

	<Input
		v-else-if="control.kind === 'number'"
		:value="asText"
		size="sm"
		placeholder="не задано"
		@update:value="onNumber($event)"
	/>

	<Input
		v-else
		:value="asText"
		size="sm"
		placeholder="не задано"
		@update:value="emit('update:modelValue', $event)"
	/>
</template>
