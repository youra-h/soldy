import { chromium } from 'playwright'

/**
 * What the page run (`run.mjs`) and the soak session (`soak.mjs`) share: the
 * framework's page in its own browser, its measurement over the DevTools
 * protocol, the warm-up and the slope (see benchmarks/pages/README.md,
 * «Методика»).
 */

/**
 * Slope of the line through the points, by least squares: growth per unit of
 * `xs` — the points' positions, their numbers unless given.
 */
export function slope(points, xs = points.map((_, index) => index)) {
	const n = points.length

	if (n < 2) return 0

	const mx = xs.reduce((sum, x) => sum + x, 0) / n
	const my = points.reduce((sum, y) => sum + y, 0) / n
	let num = 0
	let den = 0

	points.forEach((y, index) => {
		num += (xs[index] - mx) * (y - my)
		den += (xs[index] - mx) ** 2
	})

	return num / den
}

/**
 * The framework's page in its own browser: the page with the bench (`?fw=`),
 * the errors it reports and its measurement.
 *
 * A measurement follows two garbage collections (`HeapProfiler.collectGarbage`):
 * the used heap, live DOM nodes and event listeners (the `Performance.getMetrics`
 * counters — nodes and listeners someone holds count even when detached) and
 * live core instances — components (`TComponent`) and event buses
 * (`TEventEmitter`) — via `Runtime.queryObjects`. The settled one waits first:
 * an app timer holds what was unmounted until it fires.
 */
export async function open(base, fw) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
	const errors = []

	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`)
	})
	await page.goto(base + '?fw=' + fw)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const cdp = await page.context().newCDPSession(page)

	await cdp.send('Performance.enable')

	/** Live objects with the prototype from `bench.prototypes` — and its heirs. */
	async function alive(name) {
		const group = 'bench-count'
		const { result } = await cdp.send('Runtime.evaluate', {
			expression: `bench.prototypes.${name}`,
			objectGroup: group,
		})
		const { objects } = await cdp.send('Runtime.queryObjects', {
			prototypeObjectId: result.objectId,
			objectGroup: group,
		})
		const { result: length } = await cdp.send('Runtime.callFunctionOn', {
			objectId: objects.objectId,
			functionDeclaration: 'function () { return this.length }',
			returnByValue: true,
		})

		await cdp.send('Runtime.releaseObjectGroup', { objectGroup: group })

		return length.value
	}

	async function measure() {
		await cdp.send('HeapProfiler.collectGarbage')
		await cdp.send('HeapProfiler.collectGarbage')

		const { metrics } = await cdp.send('Performance.getMetrics')
		const metric = (name) => metrics.find((m) => m.name === name)?.value ?? NaN

		return {
			heap: metric('JSHeapUsedSize'),
			nodes: metric('Nodes'),
			listeners: metric('JSEventListeners'),
			components: await alive('component'),
			emitters: await alive('emitter'),
		}
	}

	async function settled(ms) {
		await page.waitForTimeout(ms)

		return measure()
	}

	return { browser, page, errors, measure, settled }
}

/**
 * Warm-up, unmeasured: each page in turn — `n` copies mounted, the scenario on
 * `act` of them, the locale there and back, the page taken down.
 */
export async function warmup(page, ids, n, act) {
	for (const id of ids) {
		await page.evaluate(([p, n]) => bench.mount(p, n), [id, n])
		await page.evaluate(([p, act]) => bench.scenario(p, act), [id, act])
		await page.evaluate(() => bench.locale())
		await page.evaluate(() => bench.unmount())
	}
}
