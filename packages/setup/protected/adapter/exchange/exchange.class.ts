/**
 * TExchange — values exchanged for the time of a mount: the participants' owners and four ports over them.
 *
 * This is all the adapter sees: `state` (where to put a value is its call),
 * `inputs` (which way of delivery to use is its call), `events` (how to
 * hand an event over is its call) and `updates` (what to do at the bounds
 * of an update is its call). When and in what order is decided here and below.
 *
 * One class serves both a component (the framework's profile, the
 * framework's props) and a plugin installed from outside (the common
 * profile, the `pluginProps` bag): there is no second implementation of the
 * same rules for external plugins.
 *
 * What to do with a participant's event is decided by the type's routing
 * table (`TRouting`), and the participants' buses are listened to by one
 * listener per bus (`TTap`), shared by the state and the events. The
 * properties' lines are rows of the table too. Per mount the exchange holds
 * the participants' owners, the values of the state and of the inputs and
 * these listeners; there are no objects per property, no routes,
 * subscriptions or closures per event. The exchange does not keep the
 * participants (`TMember`): they are needed to find the table and the owners.
 *
 * **An update** is the exchange's unit of work: one event of a participant
 * (the state rereads the event's properties, then the event and its models
 * go to the sinks) or one release of the queue (below). The exchange reports
 * where each update begins and ends (`updates`, `TUpdatePort`), and nothing
 * more: what a framework does at the bounds is decided in its adapter.
 *
 * While an assembly of another mount runs over one of the participants
 * (`TAssembling`), the exchange gives the framework the outcome of the
 * assembly rather than each of its steps: the state and the notifications
 * pile up and go in one microtask after it — the whole state first, then the
 * notifications in the order they came. A cancelable event (`TActionEvent`)
 * is a question whose answer is needed now: it goes at once, and the sink's
 * `preventDefault` cancels the assembly's write, as outside it. Until the
 * queue is released, the notifications that come after the assembly join it
 * too — otherwise they would overtake those piled up. A notification reaches
 * the sinks that listened at the moment of the event, even if they stopped
 * before the release: the previous mount is taken down by the same pass of
 * the framework, and the event happened while it was there
 * (`TEventRelay.later`).
 *
 * A property with no participant gets no line: the description of a plugin
 * missing from a foreign bundle is skipped silently.
 */

import { TActionEvent } from '@soldy-ui/core'
import type { TSurface } from '../surface'
import { assembling } from './assembling.class'
import { TEventRelay } from './event-relay.class'
import { TInputPort } from './input-port.class'
import type { TLine } from './line.class'
import type { TMember } from './member.class'
import { TRouting } from './routing.class'
import { TStateStore } from './state-store.class'
import { TTap } from './tap.class'
import type { IRoute } from './types'
import { TUpdatePort } from './update-port.class'

/** Отменяемое событие: аргумент — `TActionEvent`, приёмник отвечает на него `preventDefault`. */
function isCancelable(args: readonly unknown[]): boolean {
	return args[0] instanceof TActionEvent
}

export class TExchange {
	/** Линии состава — общие у всех монтирований типа, владельцев берут из `owners`. */
	readonly lines: readonly TLine[]
	/** Владельцы участников по порядку состава: инстанс, плагины, связка. */
	readonly owners: readonly object[]
	readonly state: TStateStore
	readonly inputs: TInputPort
	readonly events: TEventRelay
	readonly updates = new TUpdatePort()

	/** Доставки уведомлений, отложенных до конца чужой сборки, — пока очередь не выпущена. */
	private _queue?: Array<() => void>

	constructor(
		members: readonly TMember[],
		readonly surface: TSurface,
		buildProps: object = {},
	) {
		const routing = TRouting.of(surface, members)
		const owners = members.map((member) => member.owner)
		const tap = new TTap(owners, routing.routes, (route, args) => {
			this.updates.begin()

			try {
				this._receive(route, args)
			} finally {
				this.updates.end()
			}
		})

		this.lines = routing.lines
		this.owners = owners
		this.state = new TStateStore(routing.readable, owners, tap)
		this.inputs = new TInputPort(routing.writable, owners, buildProps)
		this.events = new TEventRelay(owners, tap)
	}

	/** Пропсы, которые компонент не съел: уходят атрибутами в корневой узел. */
	forward<TProps extends object>(props: TProps): Partial<TProps> {
		return this.surface.forward(props)
	}

	/** Очередь до конца чужой сборки: первая запись планирует её выпуск. */
	private _defer(): Array<() => void> {
		if (this._queue === undefined) {
			this._queue = []
			assembling.defer(() => this._release())
		}

		return this._queue
	}

	/**
	 * A participant's event outside another mount's assembly: the state first,
	 * then the event and its models. The order is the exchange's rule, not the
	 * order of subscriptions.
	 */
	private _receive(route: IRoute, args: readonly unknown[]): void {
		if (this._queue === undefined && !assembling.covers(this.owners)) {
			this.state.refresh(route.cells)
			this.events.publish(route, args)
		} else if (isCancelable(args)) {
			// The question goes now; the queue's release rereads the state
			this._defer()
			this.events.publish(route, args)
		} else {
			this._defer().push(this.events.later(route, args))
		}
	}

	/** The release after the assembly is one update: the whole state first, then the notifications in order. */
	private _release(): void {
		const queue = this._queue ?? []

		this._queue = undefined
		this.updates.begin()

		try {
			this.state.refreshAll()

			for (const deliver of queue) deliver()
		} finally {
			this.updates.end()
		}
	}
}
