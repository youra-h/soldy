/**
 * TExchange — обмен значениями на время монтирования: владельцы участников и три порта над ними.
 *
 * Это всё, что видит адаптер: `state` (куда положить значение — решает он),
 * `inputs` (каким способом доставки пользоваться — решает он) и `events` (как
 * отдать событие — решает он). Когда и в каком порядке — здесь и ниже.
 *
 * Один и тот же класс обслуживает и компонент (профиль фреймворка, пропсы
 * фреймворка), и плагин, поставленный снаружи (общий профиль, мешок
 * `pluginProps`): второй реализации тех же правил для внешних плагинов нет.
 *
 * Что делать с событием участника, решает таблица маршрутов типа
 * (`TRouting`), а шины участников слушает один слушатель на шину (`TTap`) —
 * его делят состояние и события. Линии свойств — тоже строки таблицы. На
 * монтирование у обмена — владельцы участников, значения состояния и входов и
 * эти слушатели; объектов на свойство, маршрутов, подписок и замыканий на
 * каждое событие нет. Участников (`TMember`) обмен не держит: они нужны,
 * чтобы найти таблицу и владельцев.
 *
 * Пока над кем-то из участников идёт сборка другого монтирования
 * (`TAssembling`), обмен отдаёт фреймворку итог сборки, а не каждый её шаг:
 * состояние и уведомления копятся и уходят одной микрозадачей после неё —
 * сначала состояние, потом уведомления в том порядке, в каком пришли.
 * Отменяемое событие (`TActionEvent`) — вопрос, ответ на который нужен
 * сейчас: оно уходит сразу, и `preventDefault` приёмника отменяет запись
 * сборки, как вне её. Пока очередь не выпущена, в неё встают и уведомления,
 * пришедшие после сборки, — иначе они обогнали бы накопленные. Уведомление
 * получают приёмники, слушавшие в момент события, даже если до выпуска они
 * отписались: прежнее монтирование снимается тем же проходом фреймворка, а
 * случилось событие при нём (`TEventRelay.later`).
 *
 * Свойство, у которого нет участника, линии не получает: описание плагина,
 * которого нет в чужом наборе, молча пропускается.
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

	/** Доставки уведомлений, отложенных до конца чужой сборки, — пока очередь не выпущена. */
	private _queue?: Array<() => void>

	constructor(
		members: readonly TMember[],
		readonly surface: TSurface,
		buildProps: object = {},
	) {
		const routing = TRouting.of(surface, members)
		const owners = members.map((member) => member.owner)
		// Порядок — правило обмена, а не очерёдность подписок: сначала состояние,
		// потом событие и его модели
		const tap = new TTap(owners, routing.routes, (route, args) => {
			if (this._queue === undefined && !assembling.covers(owners)) {
				this.state.refresh(route.cells)
				this.events.publish(route, args)
			} else if (isCancelable(args)) {
				// Вопрос — сейчас; состояние перечитает выпуск очереди
				this._defer()
				this.events.publish(route, args)
			} else {
				this._defer().push(this.events.later(route, args))
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

	/** Выпуск после сборки: сначала состояние целиком, потом уведомления по порядку. */
	private _release(): void {
		const queue = this._queue ?? []

		this._queue = undefined
		this.state.refreshAll()

		for (const deliver of queue) deliver()
	}
}
