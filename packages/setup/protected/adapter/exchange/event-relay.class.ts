/**
 * TEventRelay — события наружу: событие поверхности и следом его модели — по маршруту из таблицы типа.
 *
 * Своих подписок на шины у порта нет. Шины участников слушает слушатель
 * участников обмена (`TTap`): порт держит его, пока у порта есть приёмники, а
 * слушатель отдаёт сюда маршрут сработавшего события из таблицы маршрутов
 * (`TRouting`) — уже после того, как состояние перечитано.
 *
 * Повторов нет по построению: у события поверхности один маршрут, а она
 * держит события без повторов (`TSurface.events`). `change:visible`, триггер
 * и у `visible`, и у `present`, уходит наружу один раз. Событие привязки
 * (`update:text`) уходит тем же вызовом сразу после события ядра, с новым
 * значением — порядок задан кодом, а не очерёдностью подписок на шине, и при
 * монтировании привязка не срабатывает: её вызывает только событие.
 *
 * Событие, у которого нет участника (плагина нет в чужом наборе), маршрута не
 * получает.
 */

import type { TLine } from './line.class'
import type { TTap } from './tap.class'
import type { IRoute, TEventSink } from './types'

export class TEventRelay {
	/** Приёмники — пока есть хоть один. Список не правится на месте: событие обходит тот, что застало. */
	private _sinks?: readonly TEventSink[]

	/**
	 * @param _lines линии обмена — из них модели читают новое значение
	 * @param _tap слушатель участников, общий с состоянием обмена
	 */
	constructor(
		private readonly _lines: readonly TLine[],
		private readonly _tap: TTap,
	) {}

	listen(sink: TEventSink): () => void {
		if (this._sinks === undefined) this._tap.hold()

		// Литерал, а не спред в пустой список: у массива, собранного по элементу,
		// запас под рост, а приёмник у обмена обычно один
		this._sinks = this._sinks ? [...this._sinks, sink] : [sink]

		let listening = true

		return () => {
			const sinks = this._sinks
			const index = sinks?.indexOf(sink) ?? -1

			if (!listening || sinks === undefined || index === -1) return

			listening = false
			this._sinks =
				sinks.length === 1
					? undefined
					: [...sinks.slice(0, index), ...sinks.slice(index + 1)]

			if (this._sinks === undefined) this._tap.release()
		}
	}

	/**
	 * Сработало событие участника: отдать приёмникам событие поверхности и
	 * следом его модели. Зовёт слушатель участников (`TTap`), а не адаптер.
	 * Маршрут без события поверхности наружу ничего не шлёт: им участник только
	 * перечитывает состояние.
	 */
	publish(route: IRoute, args: readonly unknown[]): void {
		const { event, models } = route
		const sinks = this._sinks

		if (event === undefined || sinks === undefined) return

		for (const sink of sinks) {
			sink(event, args)

			for (const model of models) sink(model.name, [this._lines[model.line].read()])
		}
	}
}
