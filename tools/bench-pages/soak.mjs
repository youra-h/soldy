import { build } from 'vite'
import { randomInt } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { open, slope, warmup } from './measure.mjs'
import { serve } from './serve.mjs'

/**
 * Soak session: random transitions over every page without a reload, for
 * tens of minutes, on every framework at once (see benchmarks/pages/README.md,
 * «Долгая сессия»).
 *
 *   npm run soak                                            # all frameworks, 30 min
 *   npm run soak -- --fw vue,react --minutes 60 --seed 7
 *   npm run soak -- --pages leak --minutes 1 --every 5      # the check: it must show the leak
 *   npm run soak -- --fw svelte --seed 7 --replay 150-199   # transitions 150–199 in cycles
 *
 * The page run's cycles go through the scenarios as written. The paths they
 * leave out — an unusual order of actions, an overlay over an overlay, a page
 * taken down in the middle of an animation — come from decisions inside the
 * same scenarios, so a path found here is a path of a page's scenario.
 *
 * Each framework gets its own browser and its own page for the whole session.
 * After the warm-up — every page once, as in the page run — the session runs
 * transitions (`bench.transition`) until its time is up: a page drawn from
 * every component page and `all`, 1 to `n` copies, its scenario on 1 to `act`
 * of them with a decision before every user action — do it, skip it, switch
 * the language there and back first, or do it and take the page down without
 * the frames after it. Every `every` transitions the empty page gets a settled
 * measurement (after `settle` ms). The result: the slopes of the heap and the
 * counters over the whole session, and the page's errors with the transition
 * they came in.
 *
 * A transition is drawn from the seed and its number alone, the same on every
 * framework: `--replay a-b` runs transitions a to b of the seed again, in
 * cycles measured as the page run's — to tell which one leaves something
 * behind.
 *
 * The result is `results/soak-<framework>.json`, of a replay —
 * `results/soak-replay-<framework>.json`; the summary goes to the log.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,webc,angular' },
		pages: { type: 'string' },
		minutes: { type: 'string', default: '30' },
		seed: { type: 'string' },
		every: { type: 'string', default: '50' },
		n: { type: 'string', default: '50' },
		act: { type: 'string', default: '10' },
		settle: { type: 'string', default: '6000' },
		replay: { type: 'string' },
		warm: { type: 'string', default: '2' },
		cycles: { type: 'string', default: '20' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const MINUTES = Number(values.minutes)
const SEED = values.seed === undefined ? randomInt(2 ** 32) : Number(values.seed)
const EVERY = Number(values.every)
const N = Number(values.n)
const ACT = Number(values.act)
const SETTLE = Number(values.settle)
const WARM = Number(values.warm)
const CYCLES = Number(values.cycles)
const REPLAY = values.replay?.split('-').map(Number)

/** The longest a transition may take: a longer one has hung, and the session ends. */
const STUCK = 120_000

/** Heap growth per transition (per cycle of a replay) that is above the noise, as in the page run. */
const NOISE = 4 * 1024

const KB = 1024
const MB = 1024 * 1024
const COUNTERS = [
	['components', 'компоненты'],
	['emitters', 'шины'],
	['nodes', 'узлы'],
	['listeners', 'слушатели'],
]

/** A number for the log, with a decimal comma, as the journals write it. */
const num = (value, digits = 1) =>
	String(Math.round(value * 10 ** digits) / 10 ** digits).replace('.', ',')
const signed = (value) => (value > 0 ? `+${value}` : String(value))

class TStuck extends Error {}

/** The promise, or `TStuck` once `ms` have passed. */
function within(ms, promise) {
	let timer

	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timer = setTimeout(() => reject(new TStuck(`дольше ${ms / 1000} с`)), ms)
		}),
	]).finally(() => clearTimeout(timer))
}

/**
 * The pages a transition is drawn from — `--pages`, or every component page
 * and `all` — and the warm-up's, every page and `all` whatever `--pages` is.
 */
async function pagesOf(page) {
	const all = await page.evaluate(() => bench.pages)

	return {
		warm: [...all, 'all'],
		pages: values.pages ? values.pages.split(',') : [...all, 'all'],
	}
}

/** Transition `index` of the seed. */
function transition(page, index, pages) {
	return within(
		STUCK,
		page.evaluate((draw) => bench.transition(draw), {
			seed: SEED,
			index,
			pages,
			copies: N,
			act: ACT,
		}),
	)
}

/**
 * Whether the page is clear for the next transition after one that failed:
 * what it left mounted is taken down. Not — the session ends, as the next
 * mount would fail too.
 */
async function cleared(page) {
	try {
		await page.evaluate(() => bench.unmount())

		return true
	} catch {
		return false
	}
}

/** How many of the transition's steps got the decision. */
const decided = ({ steps }, decision) => steps.filter((s) => s.startsWith(`${decision} `)).length

/** A transition for the log: the page, the copies, the decisions in order. */
const told = (t) => `${t.page}, копий ${t.copies}, сценарий на ${t.act}: ${t.steps.join(' · ')}`

/** The first line of an error's message. */
const firstLine = (error) => String(error?.message ?? error).split('\n')[0]

/** The page's errors in the log: each text once, with the first place it came in. */
function logErrors(fw, errors, where) {
	const unique = new Map()

	for (const { at, text } of errors) {
		const entry = unique.get(text) ?? { at, count: 0 }

		entry.count += 1
		unique.set(text, entry)
	}

	for (const [text, { at, count }] of [...unique].slice(0, 20)) {
		console.log(fw, `ошибка — ${where(at)}${count > 1 ? `, всего ${count}` : ''}: ${text}`)
	}
}

/** A counter's floor at each measurement: the least it is from there to the end. */
function floorsOf(points, key) {
	const floors = []
	let low = Infinity

	for (let index = points.length - 1; index >= 0; index--) {
		low = Math.min(low, points[index][key])
		floors[index] = low
	}

	return floors
}

/**
 * Where the counters' floors rose: the intervals between measurements after
 * which a counter never came back down, with what each one gained — the
 * transitions to replay.
 */
function rises(points, counters) {
	const floors = counters.map(([key, label]) => [label, floorsOf(points, key)])

	return points.slice(1).flatMap((point, index) => {
		const gained = floors
			.filter(([, floor]) => floor[index + 1] > floor[index])
			.map(([label, floor]) => `${label} ${signed(floor[index + 1] - floor[index])}`)

		return gained.length
			? [{ from: points[index].transitions, to: point.transitions - 1, gained }]
			: []
	})
}

async function soak(fw) {
	const { browser, page, errors, settled } = await open(base, fw)
	const { warm, pages } = await pagesOf(page)
	const result = {
		framework: fw,
		browser: browser.version(),
		date: new Date().toISOString(),
		seed: SEED,
		pages,
		n: N,
		act: ACT,
		minutes: MINUTES,
		every: EVERY,
		settle: SETTLE,
		odds: await page.evaluate(() => bench.odds),
		transitions: [],
		points: [],
		errors: [],
	}
	let seen = 0

	/** The page's errors since the last call, with the transition they came in (`-1` — the warm-up). */
	const take = (at) => {
		for (const text of errors.slice(seen)) result.errors.push({ at, text })

		seen = errors.length
	}

	await warmup(page, warm, N, ACT)
	take(-1)

	const start = performance.now()
	const minutes = () => (performance.now() - start) / 60_000

	/** A settled measurement of the empty page after `transitions` transitions. */
	const point = async (transitions) => {
		const measured = await settled(SETTLE)
		const counters = COUNTERS.map(([key, label]) => `${label} ${measured[key]}`).join(', ')

		result.points.push({ transitions, minutes: minutes(), ...measured })
		console.log(
			fw,
			`${num(minutes())} мин, переходов ${transitions}: куча ${num(measured.heap / MB, 2)} МБ, ${counters}, ошибок ${result.errors.length}`,
		)
	}

	await point(0)

	let index = 0
	let stuck = false

	while (minutes() < MINUTES) {
		try {
			const done = await transition(page, index, pages)

			result.transitions.push({
				page: done.page,
				copies: done.copies,
				act: done.act,
				steps: done.steps.length,
				skipped: decided(done, 'skip'),
				locales: decided(done, 'locale'),
				stopped: done.stopped,
			})
		} catch (error) {
			result.transitions.push(null)
			result.errors.push({ at: index, text: `переход: ${firstLine(error)}` })
			stuck = error instanceof TStuck || !(await cleared(page))
		}

		take(index)
		index += 1

		if (stuck) break

		// What comes during the pause belongs to the transitions before it
		if (index % EVERY === 0) {
			await point(index)
			take(index - 1)
		}
	}

	if (!stuck && index % EVERY) {
		await point(index)
		take(index - 1)
	}

	await browser.close()
	fs.writeFileSync(path.join(out, `soak-${fw}.json`), JSON.stringify(result, null, '\t'))
	summary(result)
}

/**
 * The session's summary in the log. The verdict: **leak** — a counter's floor
 * rose, the least of its last three measurements is above the least of its
 * first three (the least — so a one-off jitter, such as Svelte's ±1 node, does
 * not count); **heap grows** — the counters stay, and the heap's slope over the
 * session is above 4 KB per transition; otherwise **clean**.
 */
function summary(result) {
	const { framework: fw, points, transitions } = result
	const done = transitions.filter(Boolean)
	const first = points[0]
	const last = points.at(-1)
	const k = Math.max(1, Math.min(3, Math.floor(points.length / 2)))
	const least = (list, key) => Math.min(...list.map((p) => p[key]))
	const grown = (key) => least(points.slice(-k), key) - least(points.slice(0, k), key)
	/** Growth per transition of the measurements' `key`, by least squares. */
	const rate = (list, key) =>
		slope(
			list.map((p) => p[key]),
			list.map((p) => p.transitions),
		)
	const heap = rate(points, 'heap')
	const heapLate = rate(points.slice(Math.floor(points.length / 2)), 'heap')
	const total = (key) => done.reduce((sum, t) => sum + t[key], 0)
	const leaked = COUNTERS.filter(([key]) => grown(key) > 0)
	const counters = COUNTERS.map(
		([key, label]) =>
			`${label} ${first[key]} → ${last[key]} (${num(rate(points, key) * 100, 2)} на 100 переходов)`,
	)
	const verdict = leaked.length
		? `**утечка**: ${leaked.map(([key, label]) => `${label} ${signed(grown(key))}`).join(', ')}`
		: heap > NOISE
			? `куча растёт: ${num(heap / KB)} КБ/переход`
			: 'чисто'

	console.log(
		fw,
		`зерно ${result.seed}: ${transitions.length} переходов за ${num(last.minutes)} мин, замеров ${points.length}; действий ${total('steps')}, из них пропущено ${total('skipped')}, со сменой языка ${total('locales')}; снято посреди действия ${done.filter((t) => t.stopped).length}`,
	)
	console.log(
		fw,
		`куча ${num(first.heap / MB, 2)} → ${num(last.heap / MB, 2)} МБ, наклон ${num(heap / KB, 2)} КБ/переход (вторая половина ${num(heapLate / KB, 2)}); ${counters.join(', ')}`,
	)
	console.log(fw, `итог: ${verdict}; ошибок ${result.errors.length}`)

	const found = rises(points, leaked)

	for (const { from, to, gained } of found.slice(0, 10)) {
		console.log(fw, `переходы ${from}–${to}: ${gained.join(', ')} (--replay ${from}-${to})`)
	}

	if (found.length > 10) console.log(fw, `и ещё ${found.length - 10} промежутков с ростом`)

	logErrors(fw, result.errors, (at) => (at < 0 ? 'на прогреве' : `на переходе ${at}`))
}

/**
 * Transitions `from` to `to` of the seed again, in cycles: the cycle runs them
 * in order, then the page is measured; `warm` cycles warm it up, the settled
 * measurements — after them and at the end. The verdict is the page run's
 * (`report.mjs`): a leak — a counter grew by at least half the number of
 * cycles; the heap grows — its slope over the cycles is above 4 KB per cycle.
 */
async function replay(fw) {
	const { browser, page, errors, measure, settled } = await open(base, fw)
	const { warm, pages } = await pagesOf(page)
	const [from, to = from] = REPLAY
	const result = {
		framework: fw,
		browser: browser.version(),
		date: new Date().toISOString(),
		seed: SEED,
		pages,
		n: N,
		act: ACT,
		from,
		to,
		warm: WARM,
		cycles: CYCLES,
		settle: SETTLE,
		transitions: [],
		after: [],
		errors: [],
	}

	await warmup(page, warm, N, ACT)

	let seen = errors.length
	let before = await settled(SETTLE)

	for (let cycle = 0; cycle < WARM + CYCLES; cycle++) {
		for (let index = from; index <= to; index++) {
			const done = await transition(page, index, pages)

			if (cycle === 0) {
				result.transitions.push(done)
				console.log(fw, `переход ${index}: ${told(done)}`)
			}
		}

		for (const text of errors.slice(seen)) result.errors.push({ at: cycle, text })

		seen = errors.length
		result.after.push(await measure())

		if (cycle === WARM - 1) before = await settled(SETTLE)
	}

	const after = await settled(SETTLE)

	await browser.close()
	Object.assign(result, { before, end: after })
	fs.writeFileSync(path.join(out, `soak-replay-${fw}.json`), JSON.stringify(result, null, '\t'))

	const heap = slope(result.after.slice(WARM).map((m) => m.heap))
	const grown = Object.fromEntries(COUNTERS.map(([key]) => [key, after[key] - before[key]]))
	const leaked = COUNTERS.filter(([key]) => grown[key] >= CYCLES / 2)
	const verdict = leaked.length
		? `**утечка**: ${leaked.map(([key, label]) => `${label} ${signed(grown[key])}`).join(', ')}`
		: heap > NOISE
			? `куча растёт: ${num(heap / KB)} КБ/цикл`
			: 'чисто'

	console.log(
		fw,
		`переходы ${from}–${to}, циклов ${WARM} разогрева + ${CYCLES}: куча ${num(heap / KB)} КБ/цикл; ${COUNTERS.map(([key, label]) => `${label} ${signed(grown[key])}`).join(', ')}; итог: ${verdict}; ошибок ${result.errors.length}`,
	)
	logErrors(fw, result.errors, (at) => `в цикле ${at + 1}`)
}

if (!values['no-build']) {
	await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts') })
}

const { server, base } = serve()
const out = path.resolve(import.meta.dirname, 'results')

fs.mkdirSync(out, { recursive: true })
console.log(`зерно ${SEED}`)

await Promise.all(
	FRAMEWORKS.map(async (fw) => {
		try {
			await (REPLAY ? replay(fw) : soak(fw))
		} catch (error) {
			console.error(fw, 'ошибка', error)
		}
	}),
)

server.close()
