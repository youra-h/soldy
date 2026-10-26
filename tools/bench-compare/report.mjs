import fs from 'node:fs'
import path from 'node:path'

/**
 * Journal tables of a framework from `results/<framework>.json` and
 * `results/size-<framework>.json` (benchmarks/compare/README.md, «Метрики» and «Итог
 * страницы»):
 *
 *   node report.mjs react
 *
 * Pages: the weight of one copy (the page minus the empty page before it, in
 * the first measured cycle, divided by N), the median mount, the heap slope
 * after unmounting and the settled counters; the verdict is the one of
 * `tools/bench-pages/report.mjs`. Size: JS + CSS of the page's entry, gzip and
 * brotli.
 */
const fw = process.argv[2]

if (!fw) throw new Error('node report.mjs <framework>')

const here = (...parts) => path.resolve(import.meta.dirname, ...parts)
const run = JSON.parse(fs.readFileSync(here('results', `${fw}.json`), 'utf8'))
const sizeFile = here('results', `size-${fw}.json`)
const size = fs.existsSync(sizeFile) ? JSON.parse(fs.readFileSync(sizeFile, 'utf8')) : null
const WARM = run.warm
const kb = (bytes, digits = 0) => (bytes / 1024).toFixed(digits).replace('.', ',')

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

function median(values) {
	const sorted = [...values].sort((a, b) => a - b)

	return sorted[Math.floor(sorted.length / 2)]
}

const COUNTERS = ['nodes', 'listeners', 'components', 'emitters']

/** Figures and verdict of a measured page; `empty` — the participant's empty page. */
function figures(page, empty, copies) {
	const measured = page.cycles.slice(WARM)
	const heapSlope = slope(measured.map((c) => c.after.heap))
	const emptySlope = empty ? slope(empty.cycles.slice(WARM).map((c) => c.after.heap)) : 0
	const grown = Object.fromEntries(
		COUNTERS.filter((name) => page.end[name] !== undefined).map((name) => [
			name,
			page.end[name] - page.base[name],
		]),
	)
	const leak = Object.values(grown).some((delta) => delta >= Math.ceil(run.cycles / 2))
	const heap = heapSlope > Math.max(3 * emptySlope, 4096)

	return {
		weight: (measured[0].mounted.heap - measured[0].before.heap) / copies,
		mount: median(measured.map((c) => c.time)),
		heapSlope,
		grown,
		verdict: leak ? '**утечка**' : heap ? 'куча растёт' : 'чисто',
	}
}

const participants = Object.keys(run.participants)
const pageKeys = [...new Set(participants.flatMap((p) => Object.keys(run.participants[p].pages)))]
const mismatched = new Set((run.mismatches ?? []).map((m) => `${m.lib}:${m.page}`))
const lines = []

lines.push(
	`Прогон ${run.date.slice(0, 10)}: N = ${run.n}, act = ${run.act}, циклов ${run.warm} + ${run.cycles}.`,
	'',
)
lines.push(
	'| Страница | Участник | Вес копии (у `all` — набора), КБ | Монтирование, мс | Рост кучи, КБ/цикл | Узлы | Слушатели | Итог |',
	'| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
)

for (const key of pageKeys) {
	if (key === 'empty') continue

	for (const p of participants) {
		const page = run.participants[p].pages[key]

		if (!page) continue

		const f = figures(page, run.participants[p].pages.empty, key.startsWith('all') ? 1 : run.n)
		const mark = mismatched.has(`${p}:${key}`) ? ' (действий не поровну)' : ''

		lines.push(
			`| ${key} | ${p} | ${kb(f.weight, 1)} | ${Math.round(f.mount)} | ${kb(f.heapSlope, 1)} | ${f.grown.nodes} | ${f.grown.listeners} | ${f.verdict}${mark} |`,
		)
	}
}

if (size) {
	// soldy first, pages in the order of the run, `all` last
	const libs = ['soldy', ...Object.keys(size).filter((lib) => lib !== 'soldy')]
	const ids = [...pageKeys.filter((key) => !key.includes(':') && key !== 'empty'), 'all']

	lines.push('', `| Страница | ${libs.map((lib) => `${lib}, gzip / brotli`).join(' | ')} |`)
	lines.push(`| --- | ${libs.map(() => '---:').join(' | ')} |`)

	for (const id of ids) {
		const cells = libs.map((lib) => {
			const s = size[lib][id]

			return s ? `${kb(s.js.gzip + s.css.gzip)} / ${kb(s.js.brotli + s.css.brotli)}` : '—'
		})

		lines.push(`| ${id} | ${cells.join(' | ')} |`)
	}
}

console.log(lines.join('\n'))
