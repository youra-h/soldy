<script setup lang="ts">
/** Тестовая обёртка: точка резолвится только компилятором SFC. */
import { Select } from '@soldy/ui-vue'

defineProps<{
	mode?: 'single' | 'multiple'
	clearable?: boolean
	id?: string
	/** Списочные свойства — общий с ListBox контракт `IList`. */
	maxRows?: number
	contentFit?: 'truncate' | 'wrap' | 'expand'
}>()
</script>

<template>
	<Select
		:mode="mode ?? 'single'"
		:clearable="clearable ?? false"
		:id="id"
		:max-rows="maxRows"
		:content-fit="contentFit"
		name="Город"
	>
		<Select.Item value="msk" text="Москва" />
		<Select.Item value="tver" text="Тверь" />
		<Select.Item value="tula" text="Тула" disabled />
	</Select>
</template>
