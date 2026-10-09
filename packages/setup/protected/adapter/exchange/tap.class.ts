/**
 * TTap — слушатель участников: один на шину каждого участника, общий для состояния и событий обмена.
 *
 * Состояние (`TStateStore`) и события (`TEventRelay`) слушают одни и те же
 * шины и подписываются на них не порознь, а через этот объект: слушателей
 * ставит первый из `state.subscribe` и `events.listen`, снимает последний
 * ушедший. Слушатель — один на шину (`listen` шины, а не `on` на каждое
 * событие и каждый триггер), а что делать с событием, он берёт из таблицы
 * маршрутов типа (`TRouting`). Участник, с событиями которого делать нечего,
 * и владелец без шины слушателя не получают.
 *
 * **Порядок — одно правило на шесть адаптеров**, и задаёт его код, а не
 * очерёдность подписок:
 *
 * - шина отдаёт событие слушателю после всех своих обработчиков `on`, поэтому
 *   фреймворк узнаёт о событии после подписчиков ядра — и тех, что пришли
 *   после монтирования;
 * - внутри обмена сначала перечитывается состояние, потом уходят событие и
 *   модели: приёмник события видит уже новое состояние.
 *
 * Раньше порядок задавала очерёдность подписок: во Vue состояние обновлялось
 * раньше события, в React — позже, а плагин, поставленный в `bundle:create`,
 * слышал событие после фреймворка.
 *
 * Правило действует в пределах одной шины: событие, которое фасад получил
 * пробросом `relayAll` (на перехватчике источника), фреймворк слышит раньше
 * подписчиков самого источника.
 */

import type { TMember } from './member.class'
import type { IRoute } from './types'
import { busOf } from './value'

/** Что делать с событием участника: маршрут из таблицы и аргументы события. */
type TReceiver = (route: IRoute, args: readonly unknown[]) => void

export class TTap {
	/** Сколько портов обмена слушают шины: состояние и события. */
	private _holds = 0
	/** Отписки слушателей по участникам — пока шины слушают; у участника без слушателя пусто. */
	private _offs?: readonly ((() => void) | undefined)[]

	constructor(
		private readonly _members: readonly TMember[],
		private readonly _routes: readonly (ReadonlyMap<string, IRoute> | undefined)[],
		private readonly _receive: TReceiver,
	) {}

	/** Порт начали слушать: первый ставит слушателей на шины участников. */
	hold(): void {
		if (this._holds++ > 0) return

		this._offs = this._members.map((member, index) => {
			const routes = this._routes[index]
			const bus = routes && busOf(member.owner)

			return routes && bus
				? bus.listen((event, args) => {
						const route = routes.get(event)

						if (route) this._receive(route, args)
					})
				: undefined
		})
	}

	/** Порт перестали слушать: последний снимает слушателей. */
	release(): void {
		if (this._holds === 0 || --this._holds > 0) return

		const offs = this._offs ?? []

		this._offs = undefined

		for (const off of offs) off?.()
	}
}
