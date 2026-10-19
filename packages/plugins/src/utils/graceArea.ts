import type { TPoint } from './positionOrigin'
import type { TBox } from './types'

/**
 * На сколько точка ухода сдвигается назад, к строке, px: указатель, ушедший со
 * строки, стоит уже за её краем, и без запаса граница пути проходила бы через
 * саму точку — первый же ход вдоль неё считался бы уходом с пути.
 */
const BLEED = 5

/**
 * Путь указателя к открытой панели — многоугольник от точки, где указатель
 * ушёл со строки, к ближнему краю панели и вокруг неё самой (Radix pointer
 * grace area, Floating UI `safePolygon`).
 *
 * Строка, у которой открыта панель сбоку, — пункт с подменю: к панели
 * указатель идёт наискосок и задевает соседние пункты. Пока он внутри пути,
 * пункты по дороге не перехватывают подсветку, и подменю не закрывается.
 *
 * Сторону пути решает панель, а не направление письма: она встаёт у конца
 * строки, у её начала, если у конца нет места, а в RTL наоборот, — и путь
 * всегда ведёт туда, где она стоит.
 */
export function graceArea(exit: TPoint, panel: TBox): TPoint[] {
	const toRight = panel.left + panel.width / 2 > exit.x
	const near = toRight ? panel.left : panel.left + panel.width
	const far = toRight ? panel.left + panel.width : panel.left
	const bottom = panel.top + panel.height

	return [
		{ x: exit.x + (toRight ? -BLEED : BLEED), y: exit.y },
		{ x: near, y: panel.top },
		{ x: far, y: panel.top },
		{ x: far, y: bottom },
		{ x: near, y: bottom },
	]
}

/**
 * Внутри ли точка многоугольника — по чётности пересечений луча вправо с его
 * сторонами. Вершины — по порядку обхода, в любую сторону.
 */
export function isPointInPolygon(point: TPoint, polygon: readonly TPoint[]): boolean {
	let inside = false

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i]
		const b = polygon[j]

		if (a.y > point.y !== b.y > point.y) {
			const cross = a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y)

			if (point.x < cross) inside = !inside
		}
	}

	return inside
}
