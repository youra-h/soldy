import { TSlideSnapStrategy } from './base.strategy'
import type { TPlateauKnot, TSlideSnapContext } from './types'

/**
 * TPlateauSnapStrategy — плато (`plateau`): метка занимает два радиуса хода
 * указателя, и всё это время ручка стоит на ней. Промежутки между метками
 * сжаты — там ручка идёт чуть быстрее указателя, — и недостижимых значений
 * нет: уйти с метки — протащить указатель за плато.
 *
 * Перевод — ломаная (`TPlateauKnot`): на плато ручка стоит, между плато идёт
 * по прямой, края хода остаются краями. С каждой стороны метки плато не
 * шире радиуса и не больше четверти промежутка до соседней метки — половины
 * до края хода: между плато остаётся хотя бы половина промежутка, и ручка там
 * быстрее указателя не больше чем вдвое.
 *
 * Ручка, которую взяли вне плато, стоит на месте: её место — лишний узел
 * ломаной (`anchor`), и промежуток сжат по обе стороны от него. Иначе первое
 * же движение перенесло бы ручку туда, где её место на сжатой шкале. Взятая
 * на плато встаёт на его метку.
 */
export class TPlateauSnapStrategy extends TSlideSnapStrategy {
	private readonly _knots: readonly TPlateauKnot[]

	constructor(context: TSlideSnapContext) {
		super(context)

		this._knots = anchored(plateau(this._points, this._radius), context.anchor)
	}

	override follow(target: number): number {
		return along(this._knots, target)
	}
}

/**
 * Ломаная плато: края хода и по два узла на метку — начало и конец её плато.
 * Узел, который не дальше предыдущего, пропущен: метка на краю хода и нулевой
 * радиус дают узел поверх соседнего с тем же «встаёт».
 */
function plateau(points: readonly number[], radius: number): TPlateauKnot[] {
	const last = points.length - 1
	const knots: TPlateauKnot[] = []
	const add = (knot: TPlateauKnot): void => {
		const previous = knots.at(-1)

		if (!previous || knot[0] > previous[0]) knots.push(knot)
	}

	add([0, 0])

	points.forEach((point, index) => {
		const before = index > 0 ? (point - points[index - 1]) / 4 : point / 2
		const after = index < last ? (points[index + 1] - point) / 4 : (1 - point) / 2

		add([point - Math.min(radius, before), point])
		add([point + Math.min(radius, after), point])
	})

	add([1, 1])

	return knots
}

/**
 * Ломаная с узлом в якоре — там, где ручка стоит в начале жеста. Якорь на
 * плато или в узле ничего не добавляет: на плато ручка и так встаёт на метку,
 * а узел уже на своём месте.
 */
function anchored(knots: readonly TPlateauKnot[], anchor: number): readonly TPlateauKnot[] {
	const index = knots.findIndex(([target]) => target >= anchor)

	if (index <= 0 || knots[index][0] === anchor) return knots

	// На плато у соседних узлов одно «встаёт»
	if (knots[index - 1][1] === knots[index][1]) return knots

	return [...knots.slice(0, index), [anchor, anchor], ...knots.slice(index)]
}

/**
 * Где встаёт ручка, которая без щелчка была бы в `target`: по ломаной, за
 * краями хода — край. В узле — ровно его «встаёт»: якорь отдаётся как есть.
 */
function along(knots: readonly TPlateauKnot[], target: number): number {
	const at = Math.min(1, Math.max(0, target))
	let index = 0

	while (index < knots.length - 2 && knots[index + 1][0] <= at) index++

	const [fromTarget, fromPlaced] = knots[index]
	const [toTarget, toPlaced] = knots[index + 1]

	return fromPlaced + ((at - fromTarget) * (toPlaced - fromPlaced)) / (toTarget - fromTarget)
}
