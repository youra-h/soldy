<script setup lang="ts">
import { computed } from 'vue'
import { Input, Select, Switch } from '@soldy-ui/vue'
import { parseNumberOrText, type TPropControl } from '@soldy-ui/playground-shared'

/**
 * Редактор одного пропа.
 *
 * Тип контрола приходит из общего манифеста, а не выбирается здесь: логика
 * «есть список значений — значит Select, иначе по типу» — данные стенда, а не
 * его отрисовка, и живёт в `@soldy-ui/playground-shared`. Здесь остаётся только
 * отрисовка — компонентами soldy на Vue, оболочкой стенда. Превью на
 * выбранном фреймворке строка получает от хоста, а редактор у неё один.
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

/**
 * Поле «число или текст»: `40` уходит числом (px), `10%` и `auto` — строкой
 * как набраны. Правило — `parseNumberOrText` в общем пакете.
 */
function onNumberOrText(value: unknown): void {
	emit('update:modelValue', parseNumberOrText(String(value ?? '')))
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

	<!-- Плейсхолдер называет обе формы: вопроса «px или проценты» не остаётся -->
	<Input
		v-else-if="control.kind === 'number-or-text'"
		:value="asText"
		size="sm"
		placeholder="число (px) или CSS-значение"
		@update:value="onNumberOrText($event)"
	/>

	<Input
		v-else
		:value="asText"
		size="sm"
		placeholder="не задано"
		@update:value="emit('update:modelValue', $event)"
	/>
</template>
