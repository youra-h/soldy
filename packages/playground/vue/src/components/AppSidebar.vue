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

/**
 * Выбор читается с **элементов**, а не с самого списка.
 *
 * У `ListBox` нет пропа `value`: он коллекция, а не контрол значения. Выбор
 * живёт в `selected` каждого элемента, а одноимённый проп самой коллекции —
 * `protected`, то есть только на чтение (массив выбранных). Первая версия
 * этого меню вешала `@update:value` на список — событие, которого не
 * существует, поэтому клик молча ничего не делал.
 */
function onSelected(id: string, selected: unknown): void {
	if (selected && id !== current.value) router.push(`/component/${id}`)
}
</script>

<template>
	<nav class="pg__sidebar">
		<RouterLink to="/">
			<div class="pg__sidebar-title">Витрина</div>
		</RouterLink>

		<div class="pg__sidebar-title">Компоненты</div>
		<ListBox mode="single" class="pg__menu">
			<ListBox.Item
				v-for="entry in showcase"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
				:selected="entry.id === current"
				@update:selected="onSelected(entry.id, $event)"
			/>
		</ListBox>

		<div class="pg__sidebar-title">Слои</div>
		<ListBox mode="single" class="pg__menu">
			<ListBox.Item
				v-for="entry in layers"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
				:selected="entry.id === current"
				@update:selected="onSelected(entry.id, $event)"
			/>
		</ListBox>
	</nav>
</template>
