/**
 * The verdict of a page from its run (`results/<framework>.json`, written by
 * `run.mjs`), shared by the run's summary and `report.mjs`.
 *
 * Growth counts from the end of the warm-up (`options.warm` renders of the
 * page's run: the first renders legitimately grow the heap — compiled code,
 * format caches of the locales, lazy definitions) to the settled measurement
 * after the last render:
 *
 * - **leak** — live core instances (components or event buses) after the
 *   settle pause are more than at the end of the warm-up. A server page holds
 *   nothing after its render: what a render leaves behind adds up with every
 *   request, and thousands of renders make any of it visible;
 * - **heap grows** — the counters are in place, but the slope of the heap per
 *   render (Theil–Sen over the measurements after the warm-up) is above
 *   the noise: three times the slope of `empty` (the provider without
 *   components) and at least `FLOOR` bytes;
 * - **clean** — neither.
 */

/** The smallest slope of the heap that counts as growth, bytes per render. */
export const FLOOR = 64

/**
 * Slope of `y` over `x` by Theil–Sen: the median of the slopes of all pairs.
 * A single measurement off the line — a collection that left something for the
 * next one (Svelte, one of twenty measurements 4 MB above its neighbors) —
 * would tilt a least-squares line, and it does not move the median.
 */
export function slope(points) {
	const slopes = []

	points.forEach(([x1, y1], index) => {
		for (const [x2, y2] of points.slice(index + 1)) slopes.push((y2 - y1) / (x2 - x1))
	})

	if (slopes.length === 0) return 0

	slopes.sort((a, b) => a - b)

	const middle = Math.floor(slopes.length / 2)

	return slopes.length % 2 ? slopes[middle] : (slopes[middle - 1] + slopes[middle]) / 2
}

/** The measurement at the end of the warm-up: the last one within `warm` renders. */
export function warmed(result) {
	return (
		result.samples.filter((sample) => sample.renders <= result.options.warm).at(-1) ??
		result.start
	)
}

/** Slope of the heap after the warm-up, bytes per render. */
export function heapSlope(result) {
	return slope(
		result.samples
			.filter((sample) => sample.renders > result.options.warm)
			.map((sample) => [sample.renders, sample.heap]),
	)
}

/**
 * The page's figures and verdict. `empty` is the run of the empty page of the
 * same framework — the noise of the heap; without it the floor alone counts.
 */
export function judge(result, empty) {
	const base = warmed(result)
	const growth = {
		components: result.settled.components - base.components,
		emitters: result.settled.emitters - base.emitters,
	}
	const once = {
		components: base.components - result.start.components,
		emitters: base.emitters - result.start.emitters,
	}
	const heap = heapSlope(result)
	const noise = empty ? Math.abs(heapSlope(empty)) : 0
	const leak = growth.components > 0 || growth.emitters > 0
	const grows = !leak && heap > Math.max(3 * noise, FLOOR)

	return {
		growth,
		once,
		heap,
		noise,
		verdict: leak ? 'leak' : grows ? 'heap grows' : 'clean',
	}
}
