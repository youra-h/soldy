/**
 * Ближайшая к `target` точка не дальше `radius`; поровну от двух — меньшая.
 * Такой нет — `undefined`.
 */
export function nearestPoint(
	points: readonly number[],
	target: number,
	radius: number,
): number | undefined {
	let nearest: number | undefined

	for (const point of points) {
		const distance = Math.abs(point - target)

		if (distance > radius) continue
		if (nearest === undefined || distance < Math.abs(nearest - target)) nearest = point
	}

	return nearest
}

/**
 * Первая точка на пути ручки от `from` к `to` — пройденная или достигнутая.
 * Точка, от которой путь начался, не в счёт: ручка с неё уходит. Пути нет
 * или точек на нём нет — `undefined`.
 */
export function crossedPoint(
	points: readonly number[],
	from: number,
	to: number,
): number | undefined {
	if (to > from) return points.find((point) => point > from && point <= to)

	return points.filter((point) => point < from && point >= to).at(-1)
}
