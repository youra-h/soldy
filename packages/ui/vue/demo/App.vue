<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import EventLog from './common/EventLog.vue'
import type { EventLogEntry } from './common/EventLog.vue'
import ComponentView from './playgrounds/ComponentView.vue'
import Icon from './playgrounds/Icon.vue'
import Spinner from './playgrounds/Spinner.vue'
import Skeleton from './playgrounds/Skeleton.vue'
import Button from './playgrounds/Button.vue'
import CheckBox from './playgrounds/CheckBox.vue'
import Switch from './playgrounds/Switch.vue'
import Input from './playgrounds/Input.vue'
import Tabs from './playgrounds/Tabs.vue'
import Tabs1 from './playgrounds/Tabs1.vue'
import Collapse from './playgrounds/Collapse.vue'
import ListBox from './playgrounds/ListBox.vue'
// import ListBoxTest from './playgrounds/ListBoxTest.vue'
import DragAndDrop from './playgrounds/DragAndDrop.vue'
import Frame from './playgrounds/Frame.vue'

/**
 *  Manager
 *
 * Как добавить новый playground:
 * 1. Создайте <ComponentName>.vue в src/ui-vue/demo/playgrounds/
 * 2. Импортируйте его: import Collapse from './playgrounds/Collapse.vue'
 * 3. Добавьте в объект playgrounds с label
 */

// Маппинг доступных playground компонентов
const playgrounds = {
	'component-view': { component: markRaw(ComponentView), label: 'ComponentView' },
	icon: { component: markRaw(Icon), label: 'Icon' },
	spinner: { component: markRaw(Spinner), label: 'Spinner' },
	skeleton: { component: markRaw(Skeleton), label: 'Skeleton' },
	button: { component: markRaw(Button), label: 'Button' },
	'check-box': { component: markRaw(CheckBox), label: 'CheckBox' },
	switch: { component: markRaw(Switch), label: 'Switch' },
	input: { component: markRaw(Input), label: 'Input' },
	tabs: { component: markRaw(Tabs), label: 'Tabs' },
	tabs1: { component: markRaw(Tabs1), label: 'Tabs1' },
	collapse: { component: markRaw(Collapse), label: 'Collapse' },
	'list-box': { component: markRaw(ListBox), label: 'ListBox' },
	// 'list-box-test': { component: markRaw(ListBoxTest), label: 'ListBox test' },
	'drag-and-drop': { component: markRaw(DragAndDrop), label: 'DragAndDrop' },
	frame: { component: markRaw(Frame), label: 'Frame' },
} as const

// Активный playground (можно управлять через меню)
const active = ref<keyof typeof playgrounds>('collapse')

// View mode: 'sandbox' | 'logs'
const activeView = ref<'sandbox' | 'logs'>('sandbox')

// Централизованное хранилище логов
const eventLog = ref<EventLogEntry[]>([])

const handleLog = (entry: EventLogEntry) => {
	eventLog.value.unshift(entry)
	// Keep only last 200 events
	if (eventLog.value.length > 200) {
		eventLog.value = eventLog.value.slice(0, 200)
	}
}

const handleClearLogs = () => {
	eventLog.value = []
}

const Current = computed(() => {
	const playground = playgrounds[active.value]
	if (!playground) {
		console.error(` "${active.value}" not found`)
		return null
	}
	return playground.component
})

// Получить список доступных playground для меню
const playgroundList = computed(() => {
	return Object.entries(playgrounds).map(([key, value]) => ({
		key: key as keyof typeof playgrounds,
		label: value.label,
	}))
})
</script>

<template>
	<div class="pg-app">
		<!-- Navigation -->
		<div class="pg-app__nav">
			<button
				:class="[
					'pg-app__nav-btn',
					{ 'pg-app__nav-btn--active': activeView === 'sandbox' },
				]"
				@click="activeView = 'sandbox'"
			>
				Sandbox
			</button>
			<button
				:class="['pg-app__nav-btn', { 'pg-app__nav-btn--active': activeView === 'logs' }]"
				@click="activeView = 'logs'"
			>
				Logs ({{ eventLog.length }})
			</button>
		</div>

		<div class="pg-app__layout">
			<!-- Sidebar Menu -->
			<aside class="pg-app__sidebar">
				<h3 class="pg-app__sidebar-title">Components</h3>
				<nav class="pg-app__menu">
					<button
						v-for="item in playgroundList"
						:key="item.key"
						:class="[
							'pg-app__menu-item',
							{ 'pg-app__menu-item--active': active === item.key },
						]"
						@click="active = item.key"
					>
						{{ item.label }}
					</button>
				</nav>
			</aside>

			<!-- Main Content -->
			<main class="pg-app__main">
				<!-- Sandbox View -->
				<div v-if="activeView === 'sandbox'" class="pg-app__content">
					<div v-if="Current" class="pg-app__container">
						<component :is="Current" @log="handleLog" />
					</div>
					<div v-else class="pg-app__error">
						<div class="pg-app__error-content">
							<h1 class="pg-app__error-title">not found</h1>
							<p class="pg-app__error-text">Check the active variable</p>
						</div>
					</div>
				</div>

				<!-- Logs View -->
				<div v-else-if="activeView === 'logs'" class="pg-app__content">
					<div class="pg-app__logs">
						<EventLog :events="eventLog" @clear="handleClearLogs" />
					</div>
				</div>
			</main>
		</div>
	</div>
</template>
