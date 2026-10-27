/**
 * TExchange — values exchanged for the time of a mount: the participants' owners and three ports over them.
 *
 * This is all the adapter sees: `state` (where to put a value is its call),
 * `inputs` (which way of delivery to use is its call) and `events` (how to
 * hand an event over is its call). When and in what order is decided here
 * and below.
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
 * go to the sinks) or one release of the queue (below). The framework's
 * profile may say how its framework applies one group of writes (`batch`),
 * and then every update runs inside it: a framework that renders on a state
 * write renders after the event, as the others do, and still before the
 * update returns. The sink sees the new state either way: the state is
 * reread and handed to the framework, and the group holds back only the
 * framework's reaction to it. When an update comes and in what order its
 * steps go stays here. An exception of a sink is caught inside the group and
 * thrown after it: a group broken off halfway would leave the framework's
 * writes unapplied. An exchange of a plugin installed from outside has no
 * framework, and so no group.
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
import type { IAdapterProfile } from '../../naming'
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

/** How the framework applies one group of writes — the profile's `batch`. */
type TBatch = NonNullable<IAdapterProfile['batch']>

/** Отменяемое событие: аргумент — `TActionEvent`, приёмник отвечает на него `preventDefault`. */
function isCancelable(args: readonly unknown[]): boolean {
	return args[0] instanceof TActionEvent
}

/**
 * An update inside the framework's group of writes. The update's exception
 * is caught inside the group and thrown after it: the group completes, and
 * no write of the framework stays unapplied behind it.
 */
function inBatch(batch: TBatch, update: () => void): void {
	let failed = false
	let failure: unknown

	batch(() => {
		try {
			update()
		} catch (error) {
			failed = true
			failure = error
		}
	})

	if (failed) throw failure
}

export class TExchange {
	/** Линии состава — общие у всех монтирований типа, владельцев берут из `owners`. */
	readonly lines: readonly TLine[]
	/** Владельцы участников по порядку состава: инстанс, плагины, связка. */
	readonly owners: readonly object[]
	readonly state: TStateStore
	readonly inputs: TInputPort
	readonly events: TEventRelay

	/** Доставки уведомлений, отложенных до конца чужой сборки, — пока очередь не выпущена. */
	private _queue?: Array<() => void>

	/**
	 * @param buildProps the props of the assembly: the inputs' memory starts with them
	 * @param _batch how the framework applies one update's writes, from its profile; not set — one by one
	 */
	constructor(
		members: readonly TMember[],
		readonly surface: TSurface,
		buildProps: object = {},
		private readonly _batch?: TBatch,
	) {
		const routing = TRouting.of(surface, members)
		const owners = members.map((member) => member.owner)
		// The order is the exchange's rule, not the order of subscriptions: the
		// state first, then the event and its models
		const receive = (route: IRoute, args: readonly unknown[]): void => {
			if (this._queue === undefined && !assembling.covers(owners)) {
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
		// Without a group the update runs as it is, with no closure per event
		const tap = new TTap(
			owners,
			routing.routes,
			_batch ? (route, args) => inBatch(_batch, () => receive(route, args)) : receive,
		)

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

	/** The release after the assembly is one update: the whole state first, then the notifications in order. */
	private _release(): void {
		const batch = this._batch

		if (batch) inBatch(batch, () => this._flush())
		else this._flush()
	}

	/** Hand over what piled up: the queue is closed before the state is reread. */
	private _flush(): void {
		const queue = this._queue ?? []

		this._queue = undefined
		this.state.refreshAll()

		for (const deliver of queue) deliver()
	}
}
