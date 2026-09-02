export type EventLogEntry = {
	timestamp: string
	source: 'props' | 'instance' | 'core' | 'react'
	name: string
	payload?: unknown
}

type EventLogProps = {
	events: EventLogEntry[]
	maxEntries?: number
	onClear: () => void
}

const formatTime = (timestamp: string): string => {
	const date = new Date(timestamp)
	const time = date.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
	const ms = date.getMilliseconds().toString().padStart(3, '0')

	return `${time}.${ms}`
}

export default function EventLog({ events, maxEntries = 100, onClear }: EventLogProps) {
	const displayedEvents = events.slice(0, maxEntries)

	return (
		<div className="event-log">
			{displayedEvents.length === 0 ? (
				<div className="event-log__empty">No events yet</div>
			) : (
				<div className="event-log__content">
					<div className="event-log__header">
						<span className="event-log__count">{displayedEvents.length} events</span>
						<button className="event-log__clear-btn" onClick={onClear}>
							Clear logs
						</button>
					</div>
					<div className="event-log__list">
						{displayedEvents.map((event, idx) => (
							<div key={idx} className="event-log__entry">
								<span className="event-log__timestamp">{formatTime(event.timestamp)}</span>
								<span className="event-log__separator">|</span>
								<span className={`event-log__source event-log__source--${event.source}`}>
									{event.source}
								</span>
								<span className="event-log__separator">→</span>
								<span className="event-log__name">{event.name}</span>
								{event.payload !== undefined && (
									<span className="event-log__payload">{JSON.stringify(event.payload)}</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
