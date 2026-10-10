import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

// Трасса жеста перестановки колонки: что делает главный поток браузера —
// пересчёт стилей, раскладка, обход перед отрисовкой, отрисовка и перестройка
// слоёв. Таблица на N строк, жест — те же сценарии стенда, что у `run.mjs`
// (`bench.take`, `bench.step`, `bench.release`), каждый под своей трассой.
//
//   node trace.mjs <строк> [библиотеки через запятую] [прогонов]
//
// Библиотека с флагами через «+», как у `run.mjs`: `soldy+reorder+preview=none`.
// Флаг `reorder` нужен всегда: без него колонку не взять.
const N = Number(process.argv[2] ?? 5000)
const LIBS = (process.argv[3] ?? 'soldy+reorder').split(',')
const RUNS = Number(process.argv[4] ?? 3)
const urlOf = (lib) => {
	const [name, ...flags] = lib.split('+')

	return (
		'?lib=' + name + flags.map((flag) => `&${flag.includes('=') ? flag : flag + '=1'}`).join('')
	)
}
const dist = path.resolve(import.meta.dirname, 'dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = http
	.createServer((req, res) => {
		const p = req.url.split('?')[0]
		const f = path.join(dist, p === '/' ? 'index.html' : p)
		if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end()
		res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' })
		fs.createReadStream(f).pipe(res)
	})
	.listen(0)
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()

/** Фазы кадра, которые суммирует трасса, — имена событий главного потока. */
const PHASES = ['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize']

/** Сценарии жеста — по порядку, как у `run.mjs`. */
const SCENARIOS = [
	['Взять колонку', 'take'],
	['Смена места', 'step'],
	['Отпустить', 'release'],
]

/** События указателя, внутри которых пересчёт стилей — синхронный, в обработчике. */
const POINTER = new Set(['pointerdown', 'pointermove', 'pointerup'])

/**
 * Длительности событий главного потока, мс: полные (`X`) — сразу, парные
 * (`B`/`E`) — по стеку на поток и имя. Главный поток — `CrRendererMain`.
 */
function spansOf(events) {
	const main = new Set(
		events
			.filter(
				(e) =>
					e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain',
			)
			.map((e) => `${e.pid}:${e.tid}`),
	)
	const spans = []
	const open = new Map()

	for (const e of events) {
		const thread = `${e.pid}:${e.tid}`

		if (!main.has(thread)) continue

		if (e.ph === 'X') {
			spans.push({ name: e.name, start: e.ts, end: e.ts + (e.dur ?? 0), args: e.args })
		} else if (e.ph === 'B') {
			const key = `${thread}:${e.name}`
			const stack = open.get(key) ?? []

			stack.push(e)
			open.set(key, stack)
		} else if (e.ph === 'E') {
			const begin = open.get(`${thread}:${e.name}`)?.pop()

			if (begin)
				spans.push({
					name: e.name,
					start: begin.ts,
					end: e.ts,
					args: { ...begin.args, ...e.args },
				})
		}
	}

	return spans
}

/**
 * Сводка трассы: сумма каждой фазы, пересчёт стилей внутри обработчиков
 * указателя и наибольшее число элементов, чей стиль пересчитан за раз.
 */
function summarize(trace) {
	const spans = spansOf(JSON.parse(trace.toString()).traceEvents)
	const sum = (name) =>
		spans.filter((s) => s.name === name).reduce((total, s) => total + (s.end - s.start), 0) /
		1000
	const handlers = spans.filter(
		(s) => s.name === 'EventDispatch' && POINTER.has(s.args?.data?.type),
	)
	const inHandler = (s) => handlers.some((h) => s.start >= h.start && s.end <= h.end)
	const styles = spans.filter((s) => s.name === 'UpdateLayoutTree')

	return {
		...Object.fromEntries(PHASES.map((name) => [name, sum(name)])),
		'Стиль в обработчике':
			styles.filter(inHandler).reduce((total, s) => total + (s.end - s.start), 0) / 1000,
		'Элементов за раз': Math.max(0, ...styles.map((s) => s.args?.elementCount ?? 0)),
	}
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

for (const lib of LIBS) {
	const runs = Object.fromEntries(SCENARIOS.map(([label]) => [label, []]))

	for (let run = 0; run < RUNS; run++) {
		const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
		page.on('pageerror', (e) => console.error(lib, 'pageerror', e.message))
		await page.goto(base + urlOf(lib))
		await page.waitForFunction(() => 'bench' in window)
		await page.evaluate((n) => bench.render(n), N)

		for (const [label, action] of SCENARIOS) {
			await browser.startTracing(page, {
				categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'],
			})
			await page.evaluate((name) => bench[name](), action)
			runs[label].push(summarize(await browser.stopTracing()))
		}

		await page.close()
	}

	console.log(`\n${lib}, N=${N}, прогонов ${RUNS}, медиана; мс главного потока`)
	console.table(
		Object.fromEntries(
			Object.entries(runs).map(([label, summaries]) => [
				label,
				Object.fromEntries(
					Object.keys(summaries[0]).map((key) => [
						key,
						Math.round(median(summaries.map((summary) => summary[key]))),
					]),
				),
			]),
		),
	)
}

await browser.close()
server.close()
