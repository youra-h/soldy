<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListBox } from '@soldy/ui-vue'
import { SHOWCASE, LAYERS } from '../catalog'

const route = useRoute()
const router = useRouter()

const showcase = SHOWCASE
const layers = LAYERS

/**
 * Текущий пункт — производная от маршрута, а не отдельное состояние.
 *
 * Меню — это `ListBox`, у которого выбор своё состояние и есть; но источником
 * истины остаётся адрес: иначе прямая ссылка или «назад» в браузере
 * рассинхронизировали бы подсветку.
 */
const current = computed(() => (route.params.id as string) ?? '')

function open(id: string): void {
	if (id && id !== current.value) router.push(`/component/${id}`)
}
</script>

<template>
	<nav class="pg__sidebar">
		<RouterLink to="/">
			<div class="pg__sidebar-title">Витрина</div>
		</RouterLink>

		<div class="pg__sidebar-title">Компоненты</div>
		<ListBox :value="current" auto-width @update:value="open(String($event))">
			<ListBox.Item
				v-for="entry in showcase"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
			/>
		</ListBox>

		<div class="pg__sidebar-title">Слои</div>
		<ListBox :value="current" auto-width @update:value="open(String($event))">
			<ListBox.Item
				v-for="entry in layers"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
			/>
		</ListBox>
	</nav>
</template>
