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
 * Свойство, у которого нет участника, линии не получает: описание плагина,
 * которого нет в чужом наборе, молча пропускается.
 */

import type { TSurface } from '../surface'
import { TEventRelay } from './event-relay.class'
import { TInputPort } from './input-port.class'
import { TLine } from './line.class'
import type { TMember } from './member.class'
import { TStateStore } from './state-store.class'

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
		this.lines = members.flatMap((member) =>
			member.props.flatMap((spec): TLine[] => {
				const entry = surface.entryOf(spec)

				return entry ? [new TLine(spec, member.owner, entry.exportName)] : []
			}),
		)
		this.state = new TStateStore(this.lines)
		this.inputs = new TInputPort(this.lines, buildProps)
		this.events = new TEventRelay(members, this.lines, surface)
	}

	/** Пропсы, которые компонент не съел: уходят атрибутами в корневой узел. */
	forward<TProps extends object>(props: TProps): Partial<TProps> {
		return this.surface.forward(props)
	}
}
