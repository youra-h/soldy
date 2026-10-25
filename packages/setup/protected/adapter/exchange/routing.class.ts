/**
 * TRouting — таблица маршрутов обмена: одна на поверхность и состав участников, а не на монтирование.
 *
 * Всё, что обмен делает с событием участника, известно до монтирования: какие
 * свойства перечитать в состоянии, какое событие поверхности отдать наружу и
 * какие модели (`update:<проп>`) послать следом. Это знание типа — описаний
 * участников (`IMemberSpec`) и поверхности, — поэтому таблица строится один
 * раз и её делят все монтирования. Линии (`TLine`) — тоже её строки: свойство
 * участника в составе знает тип, а владельца линия берёт из списка
 * монтирования по месту участника. На монтирование остаются владельцы
 * участников, значения состояния и входов и по слушателю на шину участника
 * (`TTap`); объекта на свойство, а на событие — объекта, массива и замыкания у
 * монтирования нет. Раньше маршрут события — объект, обработчик, отписка и
 * подписка на шину — строился на каждое событие поверхности каждого
 * монтирования, слушают его или нет: у строки таблицы с чекбоксом их было около
 * восьмидесяти.
 *
 * Состав — описания участников по порядку: у своего набора он один на
 * дескриптор, у чужого — плагины, которые в наборе нашлись. Таблица ищется по
 * поверхности и описаниям, как `TSurface.of` — по описанию и профилю, и живёт,
 * пока живут они.
 *
 * Строки таблицы:
 *
 * - **линии** — свойства участников, у которых есть запись поверхности, по
 *   порядку участников и их пропсов. Свойство без записи линии не получает:
 *   описание плагина, которого нет в чужом наборе, молча пропускается;
 * - **состояние** — линии с триггерами, **входы** — записываемые линии;
 * - **маршруты** участника — по сырому имени события на его шине: значения
 *   состояния, для чьих свойств событие — триггер (у `change:visible` это и
 *   `visible`, и `present`: синхронизацию состояния не дедуплицируют), и
 *   событие поверхности с моделями, если участник его публикует.
 *
 * Повторов наружу нет по построению: поверхность держит события без повторов
 * по полному имени (`TSurface.events`), и у события один публикатор — первый
 * участник, который его объявил. Полное имя одно в составе компонента; если
 * его всё же публикуют двое, остаётся первый — порядок участников задаёт
 * сборка.
 */

import type { TName } from '../../define'
import type { TSurface } from '../surface'
import { TLine } from './line.class'
import type { TMember } from './member.class'
import type { IMemberSpec, IModelRoute, IRoute } from './types'

/** Маршрут, пока таблица строится. */
interface IRouteDraft {
	readonly cells: number[]
	event?: string
	models: readonly IModelRoute[]
}

/** Узел дерева таблиц поверхности: путь к нему — описания участников по порядку. */
interface INode {
	routing?: TRouting
	readonly next: WeakMap<IMemberSpec, INode>
}

const roots = new WeakMap<TSurface, INode>()

/** Имена событий, которые участник публикует: явные, затем триггеры пропсов. */
function* publishedBy(spec: IMemberSpec): Generator<TName> {
	yield* spec.events

	for (const prop of spec.props) yield* prop.triggers
}

export class TRouting {
	/** Линии состава: свойства участников в поверхности. */
	readonly lines: readonly TLine[]
	/** Линии с триггерами: значение состояния `i` — линия `readable[i]`. */
	readonly readable: readonly TLine[]
	/** Записываемые линии: значение входа `i` — линия `writable[i]`. */
	readonly writable: readonly TLine[]
	/**
	 * Маршруты участников по порядку состава: сырое имя на шине участника →
	 * маршрут. У участника, с событиями которого обмену делать нечего, —
	 * `undefined`: его шину обмен не слушает.
	 */
	readonly routes: readonly (ReadonlyMap<string, IRoute> | undefined)[]

	/** Таблица поверхности для состава участников монтирования; строится один раз на пару. */
	static of(surface: TSurface, members: readonly TMember[]): TRouting {
		let node: INode | undefined = roots.get(surface)

		if (!node) {
			node = { next: new WeakMap() }
			roots.set(surface, node)
		}

		for (const { spec } of members) {
			let next: INode | undefined = node.next.get(spec)

			if (!next) {
				next = { next: new WeakMap() }
				node.next.set(spec, next)
			}

			node = next
		}

		node.routing ??= new TRouting(
			surface,
			members.map((member) => member.spec),
		)

		return node.routing
	}

	private constructor(surface: TSurface, specs: readonly IMemberSpec[]) {
		const lines: TLine[] = []
		const readable: TLine[] = []
		const writable: TLine[] = []
		const lineOf = new Map<TName, TLine>()
		const drafts = specs.map(() => new Map<string, IRouteDraft>())

		const draftOf = (member: number, raw: string): IRouteDraft => {
			const routes = drafts[member]
			let draft = routes.get(raw)

			if (!draft) {
				draft = { cells: [], models: [] }
				routes.set(raw, draft)
			}

			return draft
		}

		specs.forEach((spec, member) => {
			for (const prop of spec.props) {
				const entry = surface.entryOf(prop)

				if (!entry) continue

				const line = new TLine(prop, member, entry.exportName)

				lines.push(line)
				lineOf.set(prop.name, line)

				if (!prop.protected) writable.push(line)
				if (prop.triggers.length === 0) continue

				const cell = readable.length

				readable.push(line)

				for (const trigger of prop.triggers) {
					const { cells } = draftOf(member, trigger.name)

					if (!cells.includes(cell)) cells.push(cell)
				}
			}
		})

		const publishers = new Map<string, number>()

		specs.forEach((spec, member) => {
			for (const name of publishedBy(spec)) {
				if (!publishers.has(name.getName())) publishers.set(name.getName(), member)
			}
		})

		for (const event of surface.events) {
			const member = publishers.get(event.name.getName())

			// Событие, у которого нет участника (плагина нет в чужом наборе), маршрута не получает
			if (member === undefined) continue

			const draft = draftOf(member, event.name.name)

			draft.event = event.exportName
			draft.models = event.models.flatMap((prop): IModelRoute[] => {
				const line = lineOf.get(prop.spec.name)

				return line !== undefined && prop.model !== undefined
					? [{ line, name: prop.model }]
					: []
			})
		}

		this.lines = Object.freeze(lines)
		this.readable = Object.freeze(readable)
		this.writable = Object.freeze(writable)
		this.routes = Object.freeze(
			drafts.map((routes) =>
				routes.size === 0
					? undefined
					: new Map(
							[...routes].map(([raw, { cells, event, models }]): [string, IRoute] => [
								raw,
								Object.freeze({
									cells: Object.freeze(cells),
									...(event === undefined ? {} : { event }),
									models: Object.freeze(models),
								}),
							]),
						),
			),
		)
	}
}
