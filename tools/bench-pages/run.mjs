import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { open, slope, warmup } from './measure.mjs'
import { serve } from './serve.mjs'

/**
 * Component page run: page weight and leaks over cycles (see
 * benchmarks/pages/README.md).
 *
 *   npm run bench                                  # all frameworks, all pages
 *   npm run bench -- --fw vue,react --pages button,select --cycles 10
 *
 * Each framework gets its own browser and its own page. First the warm-up —
 * every component page once, then the run's other pages, without measuring,
 * whatever `--pages` lists — then the passes:
 *
 * 1. **Pages one by one.** A component page — N copies under one root — is
 *    mounted, the scenario acts on the first `act` copies, the locale switches
 *    there and back, the page is unmounted; `warm + cycles` times in a row.
 *    Every mount and every unmount is followed by garbage collection and a
 *    measurement. The first `warm` cycles warm the page itself up (lazy
 *    component definitions, format caches, element registration); growth
 *    counts from their end. Besides the components — `all` (every component
 *    once, each under its own root) and `empty` (a root without components —
 *    the noise of the measurement itself).
 * 2. **Tour.** All pages in turn, `rounds` rounds, without reloading: the
 *    weight of each page and of the empty page after it, on every round.
 * 3. **`leak`** — buttons with a planted leak, in cycles, like the pages: a
 *    check that the measurement sees it. Last: what it holds stays to the end.
 *
 * Page counters are compared settled: after the warm-up cycles and after the
 * last cycle the run waits `settle` ms. An application timer holds what was
 * unmounted until it fires — the toasts preview replaces a toast after 2 s —
 * and that is not a leak; a leak is what is still held afterwards.
 *
 * A measurement follows garbage collection over the DevTools protocol
 * (`HeapProfiler.collectGarbage` twice): the used heap, live DOM nodes and
 * event listeners (the `Performance.getMetrics` counters — nodes and listeners
 * someone holds count even when detached) and live core instances —
 * components (`TComponent`) and event buses (`TEventEmitter`) — via
 * `Runtime.queryObjects` (`measure.mjs`, shared with the soak session).
 *
 * The result is `results/<framework>.json`; `report.mjs` builds the journal
 * tables from it.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,webc,angular' },
		pages: { type: 'string' },
		n: { type: 'string', default: '50' },
		act: { type: 'string', default: '10' },
		warm: { type: 'string', default: '2' },
		cycles: { type: 'string', default: '20' },
		rounds: { type: 'string', default: '3' },
		settle: { type: 'string', default: '6000' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const N = Number(values.n)
const ACT = Number(values.act)
const WARM = Number(values.warm)
const CYCLES = Number(values.cycles)
const ROUNDS = Number(values.rounds)
const SETTLE = Number(values.settle)

if (!values['no-build']) {
	await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts') })
}

const { server, base } = serve()
const out = path.resolve(import.meta.dirname, 'results')

fs.mkdirSync(out, { recursive: true })

async function measureFramework(fw) {
	const { browser, page, errors, measure, settled } = await open(base, fw)
	const evaluate = (fn, arg) => page.evaluate(fn, arg)
	const all = await evaluate(() => bench.pages)
	const pages = values.pages ? values.pages.split(',') : [...all, 'all', 'empty']
	const result = {
		framework: fw,
		browser: browser.version(),
		date: new Date().toISOString(),
		n: N,
		act: ACT,
		warm: WARM,
		cycles: CYCLES,
		rounds: ROUNDS,
		settle: SETTLE,
		pages: {},
		tour: null,
		errors,
	}
	const start = await measure()

	result.start = start

	/** A page in cycles: weights, measurements after unmounting, settled ones after the warm-up and at the end. */
	async function cyclesOf(id) {
		const cycles = []
		let before = await measure()
		let base = before

		for (let cycle = 0; cycle < WARM + CYCLES; cycle++) {
			const time = await evaluate(([p, n]) => bench.mount(p, n), [id, N])
			const mounted = await measure()
			const actions = await evaluate(([p, act]) => bench.scenario(p, act), [id, ACT])

			await evaluate(() => bench.locale())
			await evaluate(() => bench.unmount())

			const after = await measure()

			cycles.push({ time, actions, before, mounted, after })
			before = after

			if (cycle === WARM - 1) {
				base = await settled(SETTLE)
				before = base
			}
		}

		result.pages[id] = { cycles, base, end: await settled(SETTLE), errors: errors.length }
		console.log(fw, id, summary(result.pages[id]))
	}

	// Warm-up: every component page once, then the run's other pages, without
	// measuring — whatever `--pages` lists, so every page starts its cycles
	// from the same warm-up whichever pages share the run. Without it the first
	// page of the run would carry the engine warming up — compiling the shared
	// adapter and plugin code — in its growth, and the others would not.
	// Warming only the run's own pages is not enough: `all` holds a single copy
	// of each component per cycle and kept warming up through its own measured
	// cycles (~33 KB/cycle with every counter in place)
	const warmStart = performance.now()

	await warmup(page, [...all, ...pages.filter((id) => !all.includes(id))], N, ACT)
	console.log(fw, 'прогрев', `${Math.round((performance.now() - warmStart) / 1000)} с`)

	for (const id of pages) await cyclesOf(id)

	// The tour: every page in turn, in rounds — what builds up from changing components
	if (!values.pages) {
		const rounds = []

		for (let round = 0; round < ROUNDS; round++) {
			const visits = {}

			for (const id of all) {
				const before = await measure()

				await evaluate(([p, n]) => bench.mount(p, n), [id, N])

				const mounted = await measure()

				await evaluate(([p, act]) => bench.scenario(p, act), [id, ACT])
				await evaluate(() => bench.locale())
				await evaluate(() => bench.unmount())
				visits[id] = { before, mounted, after: await measure() }
			}

			rounds.push(visits)
			console.log(fw, `обход ${round + 1}`, JSON.stringify(await measure()))
		}

		result.tour = rounds
		await cyclesOf('leak')
	}

	result.end = await measure()
	await browser.close()
	fs.writeFileSync(path.join(out, `${fw}.json`), JSON.stringify(result, null, '\t'))

	return result
}

/** The run's log line: the first page's weight and the settled growth over the cycles after the warm-up. */
function summary({ cycles, base, end: last }) {
	const measured = cycles.slice(WARM)
	const kb = (x) => Math.round(x / 1024)

	return JSON.stringify({
		weightKB: kb(measured[0].mounted.heap - measured[0].before.heap),
		mountMs: Math.round(measured[0].time),
		heapSlopeKB: Math.round(slope(measured.map((c) => c.after.heap)) / 102.4) / 10,
		nodes: last.nodes - base.nodes,
		listeners: last.listeners - base.listeners,
		components: last.components - base.components,
		emitters: last.emitters - base.emitters,
	})
}

for (const fw of FRAMEWORKS) {
	try {
		await measureFramework(fw)
	} catch (error) {
		console.error(fw, 'ошибка', error)
	}
}

server.close()
