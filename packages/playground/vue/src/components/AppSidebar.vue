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
 * У `ListBox` своё состояние выбора есть, но источником истины остаётся адрес:
 * иначе прямая ссылка или «назад» в браузере рассинхронизировали бы подсветку.
 */
const current = computed(() => (route.params.id as string) ?? '')

function open(id: unknown): void {
	const next = String(id ?? '')

	if (next && next !== current.value) router.push(`/component/${next}`)
}
</script>

<template>
	<nav class="pg__sidebar">
		<RouterLink to="/">
			<div class="pg__sidebar-title">Витрина</div>
		</RouterLink>

		<!--
			Меню на `value` списка, а не на `selected` каждого элемента.

			Первая версия ходила через элементы, потому что у `ListBox` не было
			значения: выбор отдавался наружу списком объектов — внутренней
			моделью коллекции. Теперь `TListBox` растёт от `TValueControl`, и на
			вопрос «что выбрано» отвечает само поле, одним пропом.

			Два списка делят один `current`: он совпадёт ровно с одним, поэтому
			выбор в одном автоматически снимает подсветку в другом.
		-->
		<div class="pg__sidebar-title">Компоненты</div>
		<ListBox mode="single" class="pg__menu" :value="current" @update:value="open">
			<ListBox.Item
				v-for="entry in showcase"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
			/>
		</ListBox>

		<div class="pg__sidebar-title">Слои</div>
		<ListBox mode="single" class="pg__menu" :value="current" @update:value="open">
			<ListBox.Item
				v-for="entry in layers"
				:key="entry.id"
				:value="entry.id"
				:text="entry.label"
			/>
		</ListBox>
	</nav>
</template>
