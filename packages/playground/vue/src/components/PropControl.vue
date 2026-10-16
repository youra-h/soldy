<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Input, Select, Switch } from '@soldy-ui/vue'
import { parseNumber, parseNumberOrText, type TPropControl } from '@soldy-ui/playground-shared'

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

/** Текст поля по значению модели: не задано — пусто. */
const textOf = (value: unknown): string => (value == null ? '' : String(value))

const asBoolean = computed(() => Boolean(props.modelValue))
const asText = computed(() => textOf(props.modelValue))

/**
 * Текст числового поля — набранный, а не текст модели.
 *
 * Из модели поле перерисовывалось на каждое нажатие: всё, что числом ещё не
 * стало, — `-`, `.`, `0,`, — давало в нём `NaN`, и набирать дальше было не
 * во что, а законченное переписывалось под пальцем — `0,5` в `0.5`. Поэтому
 * набранное поле держит само, а текст модели берёт, только когда её сменил
 * не этот ввод: свой ввод ведёт модель ровно к тому числу, что набрано.
 */
const numberText = ref(asText.value)

watch(
	() => props.modelValue,
	(value) => {
		if (parseNumber(numberText.value) !== value) numberText.value = textOf(value)
	},
)

/**
 * В модель уходит только законченное число или «не задано» — правило
 * `parseNumber` в общем пакете. Незаконченная запись модель не трогает.
 */
function onNumber(value: unknown): void {
	const text = String(value ?? '')
	const number = parseNumber(text)

	numberText.value = text

	if (number !== null) emit('update:modelValue', number)
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
		:value="numberText"
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
