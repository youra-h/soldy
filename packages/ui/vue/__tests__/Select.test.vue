<script setup lang="ts">
/** Тестовая обёртка: точка резолвится только компилятором SFC. */
import { Select } from '@soldy/ui-vue'

defineProps<{
	mode?: 'single' | 'multiple'
	clearable?: boolean
	required?: boolean
	id?: string
	editable?: boolean
	/** Списочные свойства — общий с ListBox контракт `IList`. */
	maxRows?: number
	contentFit?: 'truncate' | 'wrap' | 'expand'
	indicator?: 'none' | 'start' | 'end'
}>()
</script>

<template>
	<Select
		:mode="mode ?? 'single'"
		:clearable="clearable ?? false"
		:required="required ?? false"
		:id="id"
		:editable="editable ?? false"
		:max-rows="maxRows"
		:content-fit="contentFit"
		:indicator="indicator"
		name="Город"
	>
		<Select.Item value="msk" text="Москва" />
		<Select.Item value="tver" text="Тверь" />
		<Select.Item value="tula" text="Тула" disabled />
	</Select>
</template>
