import { For, Show, createMemo, type JSX } from 'solid-js'

export type EventLogEntry = {
	timestamp: string
	source: 'props' | 'instance' | 'core' | 'solid'
	name: string
	payload?: unknown
}

type EventLogProps = {
	events: EventLogEntry[]
	maxEntries?: number
	onClear: () => void
}

function formatTime(timestamp: string): string {
	const date = new Date(timestamp)
	const time = date.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})

	return `${time}.${date.getMilliseconds().toString().padStart(3, '0')}`
}

export default function EventLog(props: EventLogProps): JSX.Element {
	const displayed = createMemo(() => props.events.slice(0, props.maxEntries ?? 100))

	return (
		<div class="event-log">
			<Show when={displayed().length > 0} fallback={<div class="event-log__empty">No events yet</div>}>
				<div class="event-log__content">
					<div class="event-log__header">
						<span class="event-log__count">{displayed().length} events</span>
						<button class="event-log__clear-btn" onClick={() => props.onClear()}>
							Clear logs
						</button>
					</div>
					<div class="event-log__list">
						<For each={displayed()}>
							{(event) => (
								<div class="event-log__entry">
									<span class="event-log__timestamp">{formatTime(event.timestamp)}</span>
									<span class="event-log__separator">|</span>
									<span class={`event-log__source event-log__source--${event.source}`}>
										{event.source}
									</span>
									<span class="event-log__separator">→</span>
									<span class="event-log__name">{event.name}</span>
									<Show when={event.payload !== undefined}>
										<span class="event-log__payload">{JSON.stringify(event.payload)}</span>
									</Show>
								</div>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	)
}
