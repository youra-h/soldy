/**
 * TEventRelay — события наружу: один обработчик на пару «источник, сырое имя».
 *
 * Повторов нет по построению: маршрут строится на событие поверхности, а она
 * держит их без повторов (`TSurface.events`). `change:visible`, триггер и у
 * `visible`, и у `present`, уходит наружу один раз. Событие привязки
 * (`update:text`) шлёт тот же обработчик сразу после события ядра, с новым
 * значением — порядок задан кодом, а не очерёдностью подписок на шине, и при
 * монтировании привязка не срабатывает: её вызывает только событие.
 *
 * Событие, у которого нет участника (плагина нет в чужом наборе), маршрута не
 * получает.
 */

import type { TSurface } from '../surface'
import type { TLine } from './line.class'
import type { TMember } from './member.class'
import type { TEventSink } from './types'
import { busOf } from './value'

interface IModelRoute {
	readonly line: TLine
	readonly name: string
}

interface IRoute {
	readonly owner: object
	readonly raw: string
	readonly name: string
	readonly models: readonly IModelRoute[]
}

export class TEventRelay {
	private readonly _routes: readonly IRoute[]

	constructor(members: readonly TMember[], lines: readonly TLine[], surface: TSurface) {
		const lineOf = new Map(lines.map((line) => [line.spec.name, line]))

		this._routes = surface.events.flatMap((event): IRoute[] => {
			const member = members.find((candidate) => candidate.publishes(event.name.getName()))

			if (!member) return []

			const models = event.models.flatMap((prop): IModelRoute[] => {
				const line = lineOf.get(prop.spec.name)

				return line && prop.model !== undefined ? [{ line, name: prop.model }] : []
			})

			return [{ owner: member.owner, raw: event.name.name, name: event.exportName, models }]
		})
	}

	listen(sink: TEventSink): () => void {
		const offs = this._routes.map((route) => {
			const bus = busOf(route.owner)

			if (!bus) return () => {}

			const handler = (...args: unknown[]): void => {
				sink(route.name, args)

				for (const model of route.models) sink(model.name, [model.line.read()])
			}

			bus.on(route.raw, handler)

			return () => bus.off(route.raw, handler)
		})

		return () => {
			for (const off of offs) off()
		}
	}
}
