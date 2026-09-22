<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListBox } from '@soldy-ui/vue'
import { componentsOf, testsPath } from '../catalog'
import { useScenarios } from '../composables/useScenarios'

const route = useRoute()
const router = useRouter()

const { scenarios, topics } = useScenarios()

/** Тема и компонент — из маршрута, как и пункт меню страницы свойств. */
const topic = computed(() => (route.params.topic as string) ?? '')
const component = computed(() => (route.params.component as string) ?? '')

const components = computed(() => componentsOf(scenarios, topic.value))

function go(path: string | undefined): void {
	if (path && path !== route.path) router.push(path)
}

/** Смена темы оставляет компонент, если в новой теме у него есть сценарии. */
function openTopic(id: unknown): void {
	go(testsPath(scenarios, String(id ?? ''), component.value))
}

function openComponent(id: unknown): void {
	go(testsPath(scenarios, topic.value, String(id ?? '')))
}
</script>

<template>
	<!--
		Два меню рядом: темы и компоненты темы. Компонент — отдельная страница:
		сценариев у него десятки, и тема целиком на одной странице читалась бы
		хуже, чем по компоненту.
	-->
	<nav class="pg__sidebar pg__sidebar--tests">
		<div class="pg__sidebar-column">
			<div class="pg__sidebar-title">Темы</div>
			<ListBox mode="single" class="pg__menu" :value="topic" @update:value="openTopic">
				<ListBox.Item
					v-for="item in topics"
					:key="item.id"
					:value="item.id"
					:text="item.label"
				/>
			</ListBox>
		</div>

		<div class="pg__sidebar-column">
			<div class="pg__sidebar-title">Компоненты</div>
			<ListBox
				mode="single"
				class="pg__menu pg__menu--components"
				:value="component"
				@update:value="openComponent"
			>
				<ListBox.Item
					v-for="entry in components"
					:key="entry.id"
					:value="entry.id"
					:text="entry.label"
				/>
			</ListBox>
		</div>
	</nav>
</template>
