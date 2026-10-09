/**
 * TRouting — таблица маршрутов обмена: одна на поверхность и состав участников, а не на монтирование.
 *
 * Всё, что обмен делает с событием участника, известно до монтирования: какие
 * свойства перечитать в состоянии, какое событие поверхности отдать наружу и
 * какие модели (`update:<проп>`) послать следом. Это знание типа — описаний
 * участников (`IMemberSpec`) и поверхности, — поэтому таблица строится один
 * раз и её делят все монтирования. На монтирование остаются линии, ячейки и по
 * слушателю на шину участника (`TTap`); объекта, массива и замыкания на каждое
 * событие у монтирования нет. Раньше маршрут события — объект, обработчик,
 * отписка и подписка на шину — строился на каждое событие поверхности каждого
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
 * - **ячейки состояния** — линии с триггерами, **входы** — записываемые линии;
 * - **маршруты** участника — по сырому имени события на его шине: ячейки, для
 *   чьих свойств событие — триггер (у `change:visible` это и `visible`, и
 *   `present`: синхронизацию состояния не дедуплицируют), и событие
 *   поверхности с моделями, если участник его публикует.
 *
 * Повторов наружу нет по построению: поверхность держит события без повторов
 * по полному имени (`TSurface.events`), и у события один публикатор — первый
 * участник, который его объявил. Полное имя одно в составе компонента; если
 * его всё же публикуют двое, остаётся первый — порядок участников задаёт
 * сборка.
 */

import type { TName, TPropSpec } from '../../define'
import type { TSurface } from '../surface'
import { TLine } from './line.class'
import type { TMember } from './member.class'
import type { IMemberSpec, IModelRoute, IRoute } from './types'

/** Свойство участника в поверхности — из него монтирование строит линию. */
interface IEntry {
	/** Индекс участника в составе. */
	readonly member: number
	readonly spec: TPropSpec
	/** Имя во фреймворке. */
	readonly name: string
}

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
	/** Ячейка состояния `i` — линия `readable[i]`. */
	readonly readable: readonly number[]
	/** Записываемые линии — по входу на каждую. */
	readonly writable: readonly number[]
	/**
	 * Маршруты участников по порядку состава: сырое имя на шине участника →
	 * маршрут. У участника, с событиями которого обмену делать нечего, —
	 * `undefined`: его шину обмен не слушает.
	 */
	readonly routes: readonly (ReadonlyMap<string, IRoute> | undefined)[]

	private readonly _entries: readonly IEntry[]

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
		const entries: IEntry[] = []
		const readable: number[] = []
		const writable: number[] = []
		const lineOf = new Map<TName, number>()
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

				const line = entries.length

				entries.push({ member, spec: prop, name: entry.exportName })
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

		this._entries = Object.freeze(entries)
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

	/**
	 * Линии монтирования: владельцы участников на свойствах таблицы. Состав тот
	 * же, по которому таблица найдена.
	 */
	lines(members: readonly TMember[]): TLine[] {
		return this._entries.map(
			(entry) => new TLine(entry.spec, members[entry.member].owner, entry.name),
		)
	}
}
