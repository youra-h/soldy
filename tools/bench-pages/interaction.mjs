import { chromium } from 'playwright'
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { serve } from './serve.mjs'

/**
 * Interaction run: how long a user waits for a frame after an action on one
 * copy of a page of 50, at full speed and with the CPU slowed down as on an
 * average phone, and how much the framework renders for it (see
 * benchmarks/interaction/README.md).
 *
 *   npm run interaction                                  # all frameworks, all pages
 *   npm run interaction -- --fw vue,react --pages select,tabs --rates 1,6
 *
 * Each framework gets its own browser and its own page, one framework after
 * another: they would slow each other down. Two passes:
 *
 * 1. **Timing** (`dist`, the production build). A component page — N copies
 *    under one root — is mounted, and its actions (`ACTIONS`) run on the first
 *    copy with real input (Playwright's mouse and keyboard): the browser's path
 *    is measured whole, from the input event to the frame. Every CPU rate
 *    (`Emulation.setCPUThrottlingRate`) runs `warm` rounds unmeasured and
 *    `reps` measured; the page's language switch (`ruRU` ⇄ `enUS`) is an action
 *    too, from the call.
 * 2. **Renders** (`dist-count`, the counting build). The same actions at full
 *    speed, on a page of N copies and on a page of one: the framework's render
 *    work per action (`count/`) and the DOM writes by copy. An action on one
 *    copy that renders more on the page of N than on the page of one, or
 *    writes into the other copies, does work for its neighbors.
 *
 * The result is `results/interaction-<framework>.json`; `interaction-report.mjs`
 * builds the journal tables from it.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,webc,angular' },
		pages: { type: 'string' },
		n: { type: 'string', default: '50' },
		rates: { type: 'string', default: '1,4,6' },
		warm: { type: 'string', default: '2' },
		reps: { type: 'string', default: '10' },
		'count-reps': { type: 'string', default: '3' },
		'no-build': { type: 'boolean', default: false },
		'no-count': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const N = Number(values.n)
const RATES = values.rates.split(',').map(Number)
const WARM = Number(values.warm)
const REPS = Number(values.reps)
const COUNT_REPS = Number(values['count-reps'])

/** The page's first copy: the actions are on it. */
const first = (page, selector) => page.locator(`.bench-page ${selector}`).first()

/** Open panels of a layer by their class. */
const panels = (selector) => `${selector}[data-open="true"]`

/** Press Escape until no panel by the selector is open: the reset after an action. */
async function closeAll(page, selector) {
	for (let attempt = 0; attempt < 3; attempt++) {
		if (!(await page.locator(panels(selector)).count())) return

		await page.keyboard.press('Escape')
		await page.evaluate(() => bench.settle())
	}
}

/**
 * The actions of a page, in the order of a round. An action: `final` — its
 * last input event (`click`, `keydown`, `input`), `run` — the input, `before`
 * — what has to stand before it, unmeasured, `open` — how many panels by the
 * selector are open after it (a check that it did what it says).
 */
const overlay = (selector, trigger) => [
	{
		name: 'open',
		final: 'click',
		// The previous action may have left a panel open (typing in Select opens it)
		before: (page) => closeAll(page, selector),
		run: (page) => trigger(page).click(),
		open: [selector, 1],
	},
	{
		name: 'close',
		final: 'keydown',
		run: (page) => page.keyboard.press('Escape'),
		open: [selector, 0],
	},
]

const locale = [
	{ name: 'locale ru', locale: 'ru' },
	{ name: 'locale en', locale: 'en' },
]

const ACTIONS = {
	select: [
		...overlay('.so-select__panel', (page) => first(page, '.so-select__arrow')),
		{
			name: 'type',
			final: 'input',
			before: async (page) => {
				await closeAll(page, '.so-select__panel')
				await first(page, '.so-select__field input').fill('')
				await closeAll(page, '.so-select__panel')
				await first(page, '.so-select__field input').focus()
			},
			run: (page) => page.keyboard.type('П'),
			open: ['.so-select__panel', 1],
		},
	],
	menu: overlay('.so-menu__panel', (page) => first(page, '.so-menu .so-button')),
	'date-picker': [
		...overlay('.so-date-picker__panel', (page) => first(page, '.so-date-picker__trigger')),
		...locale,
	],
	dialog: overlay('.so-dialog', (page) =>
		page.locator('.bench-page .so-button', { hasText: 'Открыть окно' }).first(),
	),
	input: [
		{
			name: 'type',
			final: 'input',
			before: (page) => first(page, '.so-input input').focus(),
			run: (page) => page.keyboard.type('a'),
		},
	],
	tabs: [
		{
			name: 'tab 2',
			final: 'click',
			run: (page) => first(page, '.so-tabs').locator('[role="tab"]').nth(1).click(),
		},
		{
			name: 'tab 1',
			final: 'click',
			run: (page) => first(page, '.so-tabs').locator('[role="tab"]').nth(0).click(),
		},
	],
	calendar: locale,
	'number-input': locale,
}

/** One action, measured in the page. */
async function act(page, action) {
	await action.before?.(page)

	if (action.locale) {
		await page.evaluate((language) => bench.switchLocale(language), action.locale)
	} else {
		await page.evaluate((final) => bench.arm(final), action.final)
		await action.run(page)
	}

	const result = await page.evaluate(() => bench.measured())

	if (action.open) {
		const [selector, expected] = action.open
		const open = await page.locator(panels(selector)).count()

		if (open !== expected)
			result.error = `открыто ${open} панелей ${selector}, ждали ${expected}`
	}

	return result
}

/** A framework's page: the browser, the page with the bench and its errors. */
async function open(dist, fw) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
	const errors = []

	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`)
	})

	const { server, base } = serve(dist)

	await page.goto(base + '?fw=' + fw)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const cdp = await page.context().newCDPSession(page)

	return {
		page,
		cdp,
		errors,
		close: async () => {
			await browser.close()
			server.close()
		},
	}
}

/** Mount a page of `count` copies and wait until it is still. */
async function mount(page, id, count) {
	await page.evaluate(([id, count]) => bench.mount(id, count), [id, count])
	await page.evaluate(() => bench.settle())
}

async function unmount(page) {
	await page.evaluate(() => bench.unmount())
}

/** Timing pass: every page, every CPU rate, `warm` + `reps` rounds of its actions. */
async function timing(fw, ids) {
	const { page, cdp, errors, close } = await open(path.resolve(import.meta.dirname, 'dist'), fw)
	const pages = {}

	for (const id of ids) {
		const rates = {}

		await mount(page, id, N)

		for (const rate of RATES) {
			const actions = Object.fromEntries(ACTIONS[id].map((action) => [action.name, []]))

			await cdp.send('Emulation.setCPUThrottlingRate', { rate })

			for (let round = 0; round < WARM + REPS; round++) {
				for (const action of ACTIONS[id]) {
					const result = await act(page, action)

					if (round >= WARM) actions[action.name].push(result)
				}
			}

			await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
			rates[rate] = actions
			console.log(fw, id, `×${rate}`, line(actions))
		}

		await unmount(page)
		pages[id] = rates
	}

	await close()

	return { pages, errors }
}

/** Renders pass: every page at N copies and at one, `count-reps` measured rounds after one unmeasured. */
async function renders(fw, ids) {
	const { page, errors, close } = await open(path.resolve(import.meta.dirname, 'dist-count'), fw)
	const pages = {}

	for (const id of ids) {
		const sizes = {}

		for (const count of [N, 1]) {
			const actions = Object.fromEntries(ACTIONS[id].map((action) => [action.name, []]))

			await mount(page, id, count)

			for (let round = 0; round < 1 + COUNT_REPS; round++) {
				for (const action of ACTIONS[id]) {
					const result = await act(page, action)

					if (round >= 1) actions[action.name].push(result)
				}
			}

			await unmount(page)
			sizes[count] = actions
		}

		pages[id] = sizes
		console.log(fw, id, 'перерисовки', counts(sizes))
	}

	await close()

	return { pages, errors }
}

const median = (list) => {
	const sorted = [...list].sort((a, b) => a - b)

	return sorted[Math.floor(sorted.length / 2)]
}

/** A log line of a rate: the action's median paint and settle. */
function line(actions) {
	return Object.entries(actions)
		.map(([name, results]) => {
			const failed = results.filter((r) => r.error).length

			return `${name} ${median(results.map((r) => r.paint))}/${median(results.map((r) => r.settled))}${failed ? ` (сбоев ${failed})` : ''}`
		})
		.join(', ')
}

/** A log line of the renders: updates at N and at one, writes into the other copies. */
function counts(sizes) {
	return Object.keys(sizes[N])
		.map((name) => {
			const at = (count) => median(sizes[count][name].map((r) => r.renders.update))
			const others = median(sizes[N][name].map((r) => r.writes?.others ?? 0))

			return `${name} ${at(N)}/${at(1)} чужим ${others}`
		})
		.join(', ')
}

if (!values['no-build']) {
	const configFile = path.resolve(import.meta.dirname, 'vite.config.ts')

	await build({ configFile })
	if (!values['no-count']) await build({ configFile, mode: 'count' })
}

const out = path.resolve(import.meta.dirname, 'results')

fs.mkdirSync(out, { recursive: true })

for (const fw of FRAMEWORKS) {
	const ids = values.pages ? values.pages.split(',') : Object.keys(ACTIONS)

	try {
		const browser = await chromium.launch()
		const version = browser.version()

		await browser.close()

		const timed = await timing(fw, ids)
		const counted = values['no-count'] ? null : await renders(fw, ids)
		const result = {
			framework: fw,
			browser: version,
			date: new Date().toISOString(),
			n: N,
			rates: RATES,
			warm: WARM,
			reps: REPS,
			countReps: COUNT_REPS,
			timing: timed.pages,
			renders: counted?.pages ?? null,
			errors: [...timed.errors, ...(counted?.errors ?? [])],
		}

		fs.writeFileSync(
			path.join(out, `interaction-${fw}.json`),
			JSON.stringify(result, null, '\t'),
		)
	} catch (error) {
		console.error(fw, 'ошибка', error)
	}
}
