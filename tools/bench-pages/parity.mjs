import { chromium } from 'playwright'
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { serve } from './serve.mjs'

/**
 * Parity run: the same user scenario on every framework, with the component's
 * events and the accessibility tree recorded after every step (see
 * benchmarks/parity/README.md).
 *
 *   node parity.mjs                                  # all frameworks, all pages
 *   node parity.mjs --fw vue,react --pages select,menu
 *
 * Each framework gets its own browser and its own page. Every component page
 * is mounted with one copy, whose events go to the journal (`bench.record`);
 * the scenario of the page runs, and after the mount and after every user
 * action, once the page is still (`bench.settle`), a step is recorded: the
 * events since the previous step (name and comparable arguments), the ARIA
 * snapshot of the whole document (`ariaSnapshot`: roles, names, states,
 * values — the panels that the layers move to the end of `body` too) and the
 * focused node. The unmount is the last step, with its events only.
 *
 * The result is `results/parity-<framework>.json`; `parity-report.mjs`
 * compares the frameworks with Vue.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,webc,angular' },
		pages: { type: 'string' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')

// Without minification, as the heap snapshot: class names of the arguments
// stay readable in the journal
const dist = path.resolve(import.meta.dirname, 'dist-prof')

if (!values['no-build']) {
	await build({
		configFile: path.resolve(import.meta.dirname, 'vite.config.ts'),
		build: { outDir: dist, minify: false },
	})
}

const { server, base } = serve(dist)
const out = path.resolve(import.meta.dirname, 'results')

fs.mkdirSync(out, { recursive: true })

async function recordFramework(fw) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
	const errors = []
	let steps = []

	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') {
			errors.push(`console.${m.type()}: ${m.text().slice(0, 300)}`)
		}
	})

	/** The focused node — the deepest, through shadow roots: its tag and ARIA line. */
	async function focus() {
		const tag = await page.evaluate(() => {
			let node = document.activeElement

			while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement

			if (!node || node === document.body) return null

			node.setAttribute('data-parity-focus', '')

			return node.localName
		})

		if (!tag) return null

		const marked = page.locator('[data-parity-focus]')
		const line = (await marked.ariaSnapshot()).split('\n')[0]

		await marked.evaluate((node) => node.removeAttribute('data-parity-focus'))

		return { tag, aria: line }
	}

	async function capture(label) {
		return {
			label,
			events: await page.evaluate(() => bench.take()),
			aria: await page.locator('body').ariaSnapshot(),
			focus: await focus(),
		}
	}

	await page.exposeFunction('parityStep', async (label) => {
		steps.push(await capture(label))
	})
	await page.goto(base + '?fw=' + fw)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })
	await page.evaluate(() => bench.observe())

	const ids = values.pages ? values.pages.split(',') : await page.evaluate(() => bench.pages)
	const pages = {}

	for (const id of ids) {
		const before = errors.length

		steps = []
		await page.evaluate((id) => bench.record(id), id)
		await page.evaluate(() => bench.settle())
		steps.push(await capture('mount'))
		await page.evaluate((id) => bench.scenario(id, 1), id)
		await page.evaluate(() => bench.unmount())
		steps.push({
			label: 'unmount',
			events: await page.evaluate(() => bench.take()),
			aria: null,
			focus: null,
		})

		pages[id] = { steps, errors: errors.slice(before) }
		console.log(`${fw.padEnd(8)} ${id.padEnd(16)} ${steps.length} steps`)
	}

	await browser.close()

	return { framework: fw, date: new Date().toISOString(), pages }
}

for (const fw of FRAMEWORKS) {
	const result = await recordFramework(fw)

	fs.writeFileSync(path.join(out, `parity-${fw}.json`), JSON.stringify(result, null, '\t'))
}

server.close()
