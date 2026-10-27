import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { build } from 'vite'
import { judge } from './verdict.mjs'

/**
 * Server render run: thousands of renders of a page with every component in
 * Node, memory after every hundred and a half (see benchmarks/ssr/README.md in
 * the root).
 *
 *   npm run bench                                    # five frameworks, all pages
 *   npm run bench -- --fw vue,react --renders 1500
 *
 * Each framework and each page is a Node process of its own
 * (`dist/<framework>.js`, built by `vite.config.ts`), with `--expose-gc`; the
 * frameworks run in parallel, the pages of one framework in turn. Pages:
 * `empty` — the provider alone (the noise), `all` — every component, `leak` —
 * `all` with a planted leak (`leak-renders` renders, `leak-warm` of them the
 * warm-up): a run that does not show
 * it is not a run.
 *
 * The result is `results/<framework>.json`; `report.mjs` builds the journal
 * tables from it.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,angular' },
		pages: { type: 'string', default: 'empty,all,leak' },
		renders: { type: 'string', default: '3000' },
		'leak-renders': { type: 'string', default: '600' },
		every: { type: 'string', default: '150' },
		warm: { type: 'string', default: '600' },
		'leak-warm': { type: 'string', default: '150' },
		settle: { type: 'string', default: '3000' },
		dump: { type: 'boolean', default: false },
		'no-build': { type: 'boolean', default: false },
	},
})

const FRAMEWORKS = values.fw.split(',')
const PAGES = values.pages.split(',')
const out = path.resolve(import.meta.dirname, 'results')

if (!values['no-build']) {
	await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts') })
}

fs.mkdirSync(out, { recursive: true })

/** One page of a framework in its own process; resolves with its result. */
function runPage(framework, page) {
	const file = path.join(out, `.${framework}-${page}.json`)
	const args = [
		'--no-warnings',
		'--expose-gc',
		path.resolve(import.meta.dirname, 'dist', `${framework}.js`),
		'--page',
		page,
		'--renders',
		page === 'leak' ? values['leak-renders'] : values.renders,
		'--warm',
		page === 'leak' ? values['leak-warm'] : values.warm,
		'--every',
		values.every,
		'--settle',
		values.settle,
		'--out',
		file,
		...(values.dump && page === 'all' ? ['--dump', path.join(out, 'markup')] : []),
	]

	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, args, {
			stdio: ['ignore', 'inherit', 'inherit'],
			env: { ...process.env, NODE_ENV: 'production' },
		})

		child.once('error', reject)
		child.once('exit', (code) => {
			if (code !== 0)
				return reject(new Error(`[bench-ssr] ${framework} ${page}: exit ${code}`))

			const result = JSON.parse(fs.readFileSync(file, 'utf8'))

			fs.rmSync(file)
			resolve(result)
		})
	})
}

const MB = 1024 * 1024

async function runFramework(framework) {
	const pages = {}

	for (const page of PAGES) {
		const started = performance.now()

		// A page that crashed its process (out of memory) is the run's finding
		// too: the other pages and frameworks go on
		try {
			pages[page] = await runPage(framework, page)
		} catch (error) {
			console.error(`${framework.padEnd(8)} ${page.padEnd(6)} ${error.message}`)
			process.exitCode = 1
			continue
		}

		const seconds = ((performance.now() - started) / 1000).toFixed(0)
		const { verdict, heap, growth } = judge(pages[page], pages.empty)

		console.log(
			`${framework.padEnd(8)} ${page.padEnd(6)} ${verdict.padEnd(10)} ` +
				`heap ${(pages[page].settled.heap / MB).toFixed(2)} MB, ${heap.toFixed(0)} B/render, ` +
				`components +${growth.components}, emitters +${growth.emitters}, ` +
				`mismatches ${pages[page].mismatches}, ${seconds} s`,
		)

		for (const [tag, problems] of Object.entries(pages[page].references)) {
			if (page !== 'empty' && problems.length > 0) {
				console.log(
					`${framework.padEnd(8)} ${page.padEnd(6)} ${tag}: ${problems.join('; ')}`,
				)
			}
		}
	}

	const result = { framework, pages }

	fs.writeFileSync(path.join(out, `${framework}.json`), JSON.stringify(result, null, '\t'))

	return result
}

const results = await Promise.all(FRAMEWORKS.map(runFramework))

// The planted leak must show, or the run proves nothing
for (const { framework, pages } of results) {
	if (pages.leak && judge(pages.leak, pages.empty).verdict !== 'leak') {
		console.error(
			`[bench-ssr] ${framework}: the planted leak did not show — the run is invalid`,
		)
		process.exitCode = 1
	}
}
