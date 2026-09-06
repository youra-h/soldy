<script lang="ts" module>
	export type EventLogEntry = {
		timestamp: string
		source: 'props' | 'instance' | 'core' | 'svelte'
		name: string
		payload?: unknown
	}
</script>

<script lang="ts">
	type Props = {
		events: EventLogEntry[]
		maxEntries?: number
		onClear: () => void
	}

	const { events, maxEntries = 100, onClear }: Props = $props()

	const displayed = $derived(events.slice(0, maxEntries))

	function formatTime(timestamp: string): string {
		const date = new Date(timestamp)
		const time = date.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})

		return `${time}.${date.getMilliseconds().toString().padStart(3, '0')}`
	}
</script>

<div class="event-log">
	{#if displayed.length === 0}
		<div class="event-log__empty">No events yet</div>
	{:else}
		<div class="event-log__content">
			<div class="event-log__header">
				<span class="event-log__count">{displayed.length} events</span>
				<button class="event-log__clear-btn" onclick={onClear}>Clear logs</button>
			</div>
			<div class="event-log__list">
				{#each displayed as event, idx (idx)}
					<div class="event-log__entry">
						<span class="event-log__timestamp">{formatTime(event.timestamp)}</span>
						<span class="event-log__separator">|</span>
						<span class="event-log__source event-log__source--{event.source}">{event.source}</span>
						<span class="event-log__separator">→</span>
						<span class="event-log__name">{event.name}</span>
						{#if event.payload !== undefined}
							<span class="event-log__payload">{JSON.stringify(event.payload)}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
