<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListBox } from '@soldy/ui-vue'
import { useScenarios } from '../composables/useScenarios'

const route = useRoute()
const router = useRouter()

const { topics } = useScenarios()

/** Текущая тема — из маршрута, как и пункт меню страницы свойств. */
const current = computed(() => (route.params.topic as string) ?? '')

function open(id: unknown): void {
	const next = String(id ?? '')

	if (next && next !== current.value) router.push(`/tests/${next}`)
}
</script>

<template>
	<nav class="pg__sidebar">
		<div class="pg__sidebar-title">Темы</div>
		<ListBox mode="single" class="pg__menu" :value="current" @update:value="open">
			<ListBox.Item
				v-for="topic in topics"
				:key="topic.id"
				:value="topic.id"
				:text="topic.label"
			/>
		</ListBox>
	</nav>
</template>
