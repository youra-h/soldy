<script setup lang="ts">
/**
 * Тестовая обёртка: точка резолвится только компилятором SFC, который видит
 * импорт как биндинг области видимости. В строковом `template` с регистрацией
 * через `components: {}` рантайм-компилятор ищет «Tabs.Item» как имя в реестре
 * и не находит — поэтому проверка обязана идти через настоящий .vue-файл.
 */
import { Tabs, TabsItem } from '@soldy/ui-vue'

defineProps<{ mode: 'dotted' | 'flat' | 'mixed' }>()
</script>

<template>
	<Tabs v-if="mode === 'dotted'">
		<Tabs.Item value="a" text="First" />
	</Tabs>

	<Tabs v-else-if="mode === 'flat'">
		<TabsItem value="a" text="First" />
	</Tabs>

	<Tabs v-else>
		<Tabs.Item value="a" text="First" />
		<TabsItem value="b" text="Second" />
	</Tabs>
</template>
