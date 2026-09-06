import { h, replace } from './dom'

export type EventLogEntry = {
	timestamp: string
	source: 'props' | 'instance' | 'core' | 'webc'
	name: string
	payload?: unknown
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

export function createEventLog(onClear: () => void) {
	const el = h('div', { class: 'event-log' })

	function update(events: EventLogEntry[], maxEntries = 100): void {
		const displayed = events.slice(0, maxEntries)

		if (displayed.length === 0) {
			replace(el, h('div', { class: 'event-log__empty' }, 'No events yet'))

			return
		}

		replace(
			el,
			h(
				'div',
				{ class: 'event-log__content' },
				h(
					'div',
					{ class: 'event-log__header' },
					h('span', { class: 'event-log__count' }, `${displayed.length} events`),
					h('button', { class: 'event-log__clear-btn', on: { click: onClear } }, 'Clear logs'),
				),
				h(
					'div',
					{ class: 'event-log__list' },
					...displayed.map((event) =>
						h(
							'div',
							{ class: 'event-log__entry' },
							h('span', { class: 'event-log__timestamp' }, formatTime(event.timestamp)),
							h('span', { class: 'event-log__separator' }, '|'),
							h(
								'span',
								{ class: `event-log__source event-log__source--${event.source}` },
								event.source,
							),
							h('span', { class: 'event-log__separator' }, '→'),
							h('span', { class: 'event-log__name' }, event.name),
							event.payload !== undefined &&
								h('span', { class: 'event-log__payload' }, JSON.stringify(event.payload)),
						),
					),
				),
			),
		)
	}

	update([])

	return { el, update }
}
