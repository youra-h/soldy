import { chromium } from 'playwright'
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { group } from '../bench-table/heap-group.mjs'
import { serve } from './serve.mjs'

/**
 * Heap snapshot of a component page: what one copy holds, by group (see
 * benchmarks/pages/README.md, «Снимок кучи»).
 *
 *   npm run heap                                        # button on react, svelte, angular
 *   npm run heap -- --fw svelte --pages button,menu --n 20 --top 60
 *
 * The page is built without minification into `dist-prof`: closures keep their
 * names and lines. Each framework gets its own browser. The page is mounted
 * and unmounted `warm` times, then N copies are mounted — snapshot — and
 * unmounted, 2N copies are mounted — snapshot. The difference of the two
 * snapshots by group (`group()`, shared with the table stand) is the cost of N
 * copies and is divided by N: what the page pays once — lazy definitions,
 * caches, the root of the framework — is in both snapshots and drops out.
 *
 * The result is `results/heap-<framework>-<page>.json` — every group per copy —
 * and the top groups in the log: plain groups, internal nodes by owner, the JS
 * heap by the nearest dominating host and what the hosts consist of.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'react,svelte,angular' },
		pages: { type: 'string', default: 'button' },
		n: { type: 'string', default: '50' },
		warm: { type: 'string', default: '2' },
		top: { type: 'string', default: '40' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const PAGES = values.pages.split(',')
const N = Number(values.n)
const WARM = Number(values.warm)
const TOP = Number(values.top)
const dist = path.resolve(import.meta.dirname, 'dist-prof')
const out = path.resolve(import.meta.dirname, 'results')

if (!values['no-build']) {
	await build({
		configFile: path.resolve(import.meta.dirname, 'vite.config.ts'),
		build: { outDir: dist, minify: false },
	})
}

fs.mkdirSync(out, { recursive: true })

const { server, base } = serve(dist)

/** Groups of the snapshot difference per copy: KB and pieces, the largest first. */
function perCopy(before, after) {
	return [...after]
		.map(([name, a]) => {
			const b = before.get(name) ?? { size: 0, count: 0 }

			return { name, size: (a.size - b.size) / N / 1024, count: (a.count - b.count) / N }
		})
		.sort((x, y) => y.size - x.size)
}

function show(title, list) {
	console.log(`\n${title}`)
	console.log('КБ/коп  шт/коп  группа')

	for (const d of list.slice(0, TOP)) {
		console.log(
			d.size.toFixed(2).padStart(6),
			d.count.toFixed(1).padStart(7),
			' ',
			d.name.slice(0, 130),
		)
	}
}

async function snapshotFramework(fw) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

	page.on('pageerror', (e) => console.error(fw, 'pageerror', e.message))
	await page.goto(base + '?fw=' + fw)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const cdp = await page.context().newCDPSession(page)

	async function snapshot() {
		await cdp.send('HeapProfiler.collectGarbage')
		await cdp.send('HeapProfiler.collectGarbage')

		const chunks = []
		const onChunk = (e) => chunks.push(e.chunk)

		cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk)
		await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
		cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk)

		return group(JSON.parse(chunks.join(''))).groups
	}

	const mount = (id, count) => page.evaluate(([p, n]) => bench.mount(p, n), [id, count])
	const unmount = () => page.evaluate(() => bench.unmount())

	for (const id of PAGES) {
		for (let cycle = 0; cycle < WARM; cycle++) {
			await mount(id, N)
			await unmount()
		}

		await mount(id, N)

		const before = await snapshot()

		await unmount()
		await mount(id, 2 * N)

		const after = await snapshot()

		await unmount()

		const diff = perCopy(before, after)
		const plain = diff.filter((d) => !/^[@#%] /.test(d.name) && d.name !== '__JS__')
		const total = plain.reduce((sum, d) => sum + d.size, 0)
		const js = diff.find((d) => d.name === '__JS__')?.size ?? 0

		fs.writeFileSync(
			path.join(out, `heap-${fw}-${id}.json`),
			JSON.stringify({ framework: fw, page: id, n: N, total, js, groups: diff }, null, '\t'),
		)
		console.log(
			`\n${fw} ${id}, копий ${N} → ${2 * N}: ${total.toFixed(2)} КБ на копию, JS-куча ${js.toFixed(2)} КБ`,
		)
		show(
			'Группы',
			plain.filter((d) => !d.name.startsWith('(native) blink')),
		)
		show(
			'Внутренние узлы по первому владельцу',
			diff.filter((d) => d.name.startsWith('@ ')),
		)
		show(
			'JS-куча по ближайшему хозяину-доминатору (шт/коп — число хозяев)',
			diff.filter((d) => d.name.startsWith('# ')),
		)
		show(
			'Состав хозяев (хозяин :: узел)',
			diff.filter((d) => d.name.startsWith('% ')),
		)
	}

	await browser.close()
}

for (const fw of FRAMEWORKS) {
	try {
		await snapshotFramework(fw)
	} catch (error) {
		console.error(fw, 'ошибка', error)
	}
}

server.close()
