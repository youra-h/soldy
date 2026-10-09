/**
 * TExchange — обмен значениями на время монтирования: линии участников и три порта над ними.
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
 * его делят состояние и события. На монтирование у обмена — линии, ячейки и
 * эти слушатели; маршрутов, подписок и замыканий на каждое событие нет.
 *
 * Свойство, у которого нет участника, линии не получает: описание плагина,
 * которого нет в чужом наборе, молча пропускается.
 */

import type { TSurface } from '../surface'
import { TEventRelay } from './event-relay.class'
import { TInputPort } from './input-port.class'
import type { TLine } from './line.class'
import type { TMember } from './member.class'
import { TRouting } from './routing.class'
import { TStateStore } from './state-store.class'
import { TTap } from './tap.class'

export class TExchange {
	readonly lines: readonly TLine[]
	readonly state: TStateStore
	readonly inputs: TInputPort
	readonly events: TEventRelay

	constructor(
		members: readonly TMember[],
		readonly surface: TSurface,
		buildProps: object = {},
	) {
		const routing = TRouting.of(surface, members)
		const lines = routing.lines(members)
		// Порядок — правило обмена, а не очерёдность подписок: сначала состояние,
		// потом событие и его модели
		const tap = new TTap(members, routing.routes, (route, args) => {
			this.state.refresh(route.cells)
			this.events.publish(route, args)
		})

		this.lines = lines
		this.state = new TStateStore(
			routing.readable.map((index) => lines[index]),
			tap,
		)
		this.inputs = new TInputPort(
			routing.writable.map((index) => lines[index]),
			buildProps,
		)
		this.events = new TEventRelay(lines, tap)
	}

	/** Пропсы, которые компонент не съел: уходят атрибутами в корневой узел. */
	forward<TProps extends object>(props: TProps): Partial<TProps> {
		return this.surface.forward(props)
	}
}
