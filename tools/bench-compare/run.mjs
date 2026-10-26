import { chromium } from 'playwright'
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { serve } from './serve.mjs'

/**
 * Comparison run: the soldy component pages next to the same pages of the
 * neighbors (see benchmarks/compare/README.md).
 *
 *   npm run bench -- --fw react                      # soldy and every React neighbor
 *   npm run bench -- --fw vue --libs naive --pages select,all --cycles 10
 *
 * soldy is the page of `tools/bench-pages` (the developer stand's hosts), the
 * neighbors are the pages of this stand; one runner measures both the same
 * way. Every participant gets its own browser. First the warm-up — every page
 * of the participant once, without measuring — then the pages one by one,
 * `warm + cycles` cycles each: mount N copies, measure; the scenario on the
 * first `act` copies; unmount, measure. There is no locale step — the
 * neighbors have no shared locale source to switch.
 *
 * `all` is per pair: every component both soldy and the neighbor have, once,
 * each under its own root. soldy measures it once per neighbor (`all:<lib>`).
 *
 * A measurement follows garbage collection over the DevTools protocol, as in
 * `tools/bench-pages/run.mjs`: the used heap, live DOM nodes and event
 * listeners, and — on the soldy page only — live core instances. The number
 * of actions a scenario made is kept: a pair whose numbers differ is reported
 * and its page does not count (`mismatch`).
 *
 * The result is `results/<framework>.json`; `report.mjs` builds the journal
 * tables from it.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,angular,svelte,solid,webc' },
		libs: { type: 'string' },
		pages: { type: 'string' },
		n: { type: 'string', default: '50' },
		act: { type: 'string', default: '10' },
		warm: { type: 'string', default: '2' },
		cycles: { type: 'string', default: '20' },
		settle: { type: 'string', default: '6000' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const N = Number(values.n)
const ACT = Number(values.act)
const WARM = Number(values.warm)
const CYCLES = Number(values.cycles)
const SETTLE = Number(values.settle)
const here = (...parts) => path.resolve(import.meta.dirname, ...parts)

/** Neighbors of a framework: the folders of `libs/<framework>/` except soldy's size entries. */
function librariesOf(fw) {
	const all = fs
		.readdirSync(here('libs', fw), { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== 'soldy')
		.map((entry) => entry.name)

	return values.libs ? all.filter((name) => values.libs.split(',').includes(name)) : all
}

/**
 * Builds of a framework — the soldy page of `tools/bench-pages` and the
 * neighbors' page — into `dist/<framework>/`: runs of two frameworks never
 * share an output folder.
 */
async function buildFramework(fw) {
	if (values['no-build']) return

	await build({
		configFile: here('../bench-pages/vite.config.ts'),
		build: { outDir: here('dist', fw, 'soldy') },
	})
	process.env.PAGES = fw
	await build({ configFile: here('vite.config.ts') })
}

const out = here('results')

fs.mkdirSync(out, { recursive: true })

/** Slope of a line through the points — growth per cycle, least squares. */
function slope(points) {
	const n = points.length

	if (n < 2) return 0

	const mx = (n - 1) / 2
	const my = points.reduce((sum, y) => sum + y, 0) / n
	let num = 0
	let den = 0

	points.forEach((y, x) => {
		num += (x - mx) * (y - my)
		den += (x - mx) ** 2
	})

	return num / den
}

/**
 * One participant: its own browser and page. `plan` — the pages to measure:
 * `{ key, page, only }`, where `only` narrows `all` to the components of a pair.
 */
async function measureParticipant(url, plan) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
	const errors = []

	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`)
	})
	await page.goto(url)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const cdp = await page.context().newCDPSession(page)

	await cdp.send('Performance.enable')

	const core = await page.evaluate(() => bench.prototypes !== null)

	/** Live objects with a prototype of `bench.prototypes` — and its subclasses. */
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
			...(core
				? { components: await alive('component'), emitters: await alive('emitter') }
				: {}),
		}
	}

	async function settled() {
		await page.waitForTimeout(SETTLE)

		return measure()
	}

	const mount = ({ page: p, only }) =>
		page.evaluate(([p, n, only]) => bench.mount(p, n, only), [p, N, only])
	const act = ({ page: p, only }) =>
		page.evaluate(([p, a, only]) => bench.scenario(p, a, only), [p, ACT, only])
	const unmount = () => page.evaluate(() => bench.unmount())
	const result = { url, browser: browser.version(), pages: {}, errors }

	for (const step of plan) {
		await mount(step)
		await act(step)
		await unmount()
	}

	for (const step of plan) {
		const cycles = []
		let before = await measure()
		let base = before

		for (let cycle = 0; cycle < WARM + CYCLES; cycle++) {
			const time = await mount(step)
			const mounted = await measure()
			const actions = await act(step)

			await unmount()

			const after = await measure()

			cycles.push({ time, actions, before, mounted, after })
			before = after

			if (cycle === WARM - 1) {
				base = await settled()
				before = base
			}
		}

		result.pages[step.key] = { cycles, base, end: await settled(), errors: errors.length }
		console.log(url.replace(/^.*\//, ''), step.key, summary(result.pages[step.key]))
	}

	await browser.close()

	return result
}

/** A line of the run log: the weight of the first measured page and the settled growth. */
function summary({ cycles, base, end: last }) {
	const measured = cycles.slice(WARM)
	const kb = (x) => Math.round(x / 1024)

	return JSON.stringify({
		weightKB: kb(measured[0].mounted.heap - measured[0].before.heap),
		mountMs: Math.round(measured[0].time),
		actions: measured[0].actions,
		heapSlopeKB: Math.round(slope(measured.map((c) => c.after.heap)) / 102.4) / 10,
		nodes: last.nodes - base.nodes,
		listeners: last.listeners - base.listeners,
	})
}

/** Pages a participant has, read from its page without measuring. */
async function pagesOf(url) {
	const browser = await chromium.launch()
	const page = await browser.newPage()

	await page.goto(url)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const pages = await page.evaluate(() => bench.pages)

	await browser.close()

	return pages
}

const wanted = (id) => !values.pages || values.pages.split(',').includes(id)

for (const fw of FRAMEWORKS) {
	await buildFramework(fw)

	const soldy = serve(here('dist', fw, 'soldy'))
	const neighbors = serve(here('dist', fw, 'neighbors'))

	try {
		const libs = librariesOf(fw)
		const soldyUrl = `${soldy.base}?fw=${fw}`
		const soldyPages = await pagesOf(soldyUrl)
		const libPages = {}

		for (const lib of libs)
			libPages[lib] = await pagesOf(`${neighbors.base}${fw}.html?lib=${lib}`)

		const compared = [...new Set(Object.values(libPages).flat())].filter((id) =>
			soldyPages.includes(id),
		)
		const result = {
			framework: fw,
			date: new Date().toISOString(),
			n: N,
			act: ACT,
			warm: WARM,
			cycles: CYCLES,
			settle: SETTLE,
			matrix: libPages,
			participants: {},
		}
		const soldyPlan = [
			...compared.filter(wanted).map((id) => ({ key: id, page: id })),
			...(wanted('all')
				? libs.map((lib) => ({
						key: `all:${lib}`,
						page: 'all',
						only: libPages[lib].filter((id) => soldyPages.includes(id)),
					}))
				: []),
			...(wanted('empty') ? [{ key: 'empty', page: 'empty' }] : []),
		]

		result.participants.soldy = await measureParticipant(soldyUrl, soldyPlan)

		for (const lib of libs) {
			const own = libPages[lib].filter((id) => soldyPages.includes(id))
			const plan = [
				...own.filter(wanted).map((id) => ({ key: id, page: id })),
				...(wanted('all') ? [{ key: `all:${lib}`, page: 'all', only: own }] : []),
				...(wanted('empty') ? [{ key: 'empty', page: 'empty' }] : []),
			]

			result.participants[lib] = await measureParticipant(
				`${neighbors.base}${fw}.html?lib=${lib}`,
				plan,
			)
		}

		// Action counts of a pair must match: otherwise the scenarios did different work
		result.mismatches = []

		for (const lib of libs) {
			for (const [key, data] of Object.entries(result.participants[lib].pages)) {
				const ours = result.participants.soldy.pages[key]?.cycles[WARM]?.actions
				const theirs = data.cycles[WARM]?.actions

				if (ours !== undefined && ours !== theirs) {
					result.mismatches.push({ lib, page: key, soldy: ours, [lib]: theirs })
					console.warn(fw, lib, key, `действий: soldy ${ours}, ${lib} ${theirs}`)
				}
			}
		}

		fs.writeFileSync(path.join(out, `${fw}.json`), JSON.stringify(result, null, '\t'))
	} catch (error) {
		console.error(fw, 'ошибка', error)
	}

	soldy.server.close()
	neighbors.server.close()
}
