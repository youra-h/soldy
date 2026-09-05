import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { EventLogService, type EventLogEntry } from './event-log.service'

@Component({
	selector: 'demo-event-log',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="event-log">
			@if (events.length === 0) {
				<div class="event-log__empty">No events yet</div>
			} @else {
				<div class="event-log__content">
					<div class="event-log__header">
						<span class="event-log__count">{{ events.length }} events</span>
						<button class="event-log__clear-btn" (click)="clear()">Clear logs</button>
					</div>
					<div class="event-log__list">
						@for (event of events; track $index) {
							<div class="event-log__entry">
								<span class="event-log__timestamp">{{ formatTime(event.timestamp) }}</span>
								<span class="event-log__separator">|</span>
								<span class="event-log__source event-log__source--{{ event.source }}">
									{{ event.source }}
								</span>
								<span class="event-log__separator">→</span>
								<span class="event-log__name">{{ event.name }}</span>
								@if (event.payload !== undefined) {
									<span class="event-log__payload">{{ stringify(event.payload) }}</span>
								}
							</div>
						}
					</div>
				</div>
			}
		</div>
	`,
})
export class EventLogComponent {
	private readonly service = inject(EventLogService)
	readonly events$ = this.service.events$

	protected events: EventLogEntry[] = []

	constructor() {
		this.events$.subscribe((events) => (this.events = events))
	}

	protected clear(): void {
		this.service.clear()
	}

	protected formatTime(timestamp: string): string {
		const date = new Date(timestamp)
		const time = date.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})
		const ms = date.getMilliseconds().toString().padStart(3, '0')

		return `${time}.${ms}`
	}

	protected stringify(payload: unknown): string {
		return JSON.stringify(payload)
	}
}
