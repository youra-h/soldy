import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

export type EventLogEntry = {
	timestamp: string
	source: 'props' | 'instance' | 'core'
	name: string
	payload?: unknown
}

/**
 * EventLogService — общее хранилище событий демо.
 *
 * Компоненты вызывают log() при каждом событии (из @Output() или core-инстанса),
 * а EventLogComponent подписывается на events$ для отображения.
 */
@Injectable({ providedIn: 'root' })
export class EventLogService {
	private _events: EventLogEntry[] = []
	private readonly _events$ = new BehaviorSubject<EventLogEntry[]>([])

	readonly events$ = this._events$.asObservable()

	log(entry: EventLogEntry): void {
		this._events = [entry, ...this._events].slice(0, 200)
		this._events$.next(this._events)
	}

	clear(): void {
		this._events = []
		this._events$.next(this._events)
	}
}
