<script setup lang="ts">
import { computed } from 'vue'

export type EventLogEntry = {
	timestamp: string
	source: 'props' | 'instance' | 'core' | 'vue'
	name: string
	payload?: unknown
}

type Props = {
	events: EventLogEntry[]
	maxEntries?: number
}

const props = withDefaults(defineProps<Props>(), {
	maxEntries: 100,
})

const emit = defineEmits<{
	clear: []
}>()

const displayedEvents = computed(() => props.events.slice(0, props.maxEntries))

const formatTime = (timestamp: string) => {
	const date = new Date(timestamp)
	const time = date.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
	const ms = date.getMilliseconds().toString().padStart(3, '0')
	return `${time}.${ms}`
}
</script>

<template>
	<div class="event-log">
		<div v-if="displayedEvents.length === 0" class="event-log__empty">No events yet</div>
		<div v-else class="event-log__content">
			<div class="event-log__header">
				<span class="event-log__count">{{ displayedEvents.length }} events</span>
				<button class="event-log__clear-btn" @click="emit('clear')">Clear logs</button>
			</div>
			<div class="event-log__list">
				<div v-for="(event, idx) in displayedEvents" :key="idx" class="event-log__entry">
					<span class="event-log__timestamp">{{ formatTime(event.timestamp) }}</span>
					<span class="event-log__separator">|</span>
					<span :class="['event-log__source', `event-log__source--${event.source}`]">
						{{ event.source }}
					</span>
					<span class="event-log__separator">→</span>
					<span class="event-log__name">{{ event.name }}</span>
					<span v-if="event.payload !== undefined" class="event-log__payload">
						{{ JSON.stringify(event.payload) }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>
