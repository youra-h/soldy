import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { types, urlOf } from './pages.mjs'

// Трасса сценариев стенда: что делает главный поток браузера — скрипт,
// пересчёт стилей, раскладка, обход перед отрисовкой, отрисовка и перестройка
// слоёв. Таблица на N строк, сценарии — те же, что у `run.mjs`, каждый под
// своей трассой.
//
//   node trace.mjs <строк> [библиотеки через запятую] [прогонов] [набор]
//
// Библиотека с флагами через «+», как у `run.mjs`: `soldy+reorder+preview=none`.
// Набор сценариев (`SETS` ниже) — `reorder` по умолчанию: жест перестановки, ему
// нужен флаг `reorder`; `resize` — протяжка ручки ширины, флаг `resize`;
// `rest` — таблица на покое: выбор и сортировки.
const N = Number(process.argv[2] ?? 5000)
const LIBS = (process.argv[3] ?? 'soldy+reorder').split(',')
const RUNS = Number(process.argv[4] ?? 3)
const SET = process.argv[5] ?? 'reorder'

/**
 * Наборы сценариев — по порядку, как у `run.mjs`: подпись, путь к сценарию в
 * `window.bench` и его аргумент.
 */
const SETS = {
	// Таблица на покое: выделить все и снять, отсортировать по возрастанию и по
	// убыванию
	rest: [
		['Выделить все', ['selectAll']],
		['Снять выделение', ['selectAll']],
		['Сортировка ↑', ['sort']],
		['Сортировка ↓', ['sort']],
	],
	// Протяжка ручки ширины второй колонки: нажать, шаг указателя на 20 px и
	// отпустить там же
	resize: [
		['Взять ручку', ['resize', 'grab']],
		['Шаг ручки', ['resize', 'drag'], 20],
		['Отпустить ручку', ['resize', 'drop'], 20],
	],
	// Жест перестановки колонки: взять, шаг на соседа, отпустить
	reorder: [
		['Взять колонку', ['take']],
		['Смена места', ['step']],
		['Отпустить', ['release']],
	],
}

const SCENARIOS = SETS[SET]

if (!SCENARIOS) throw new Error(`набора «${SET}» нет: ${Object.keys(SETS).join(', ')}`)

const dist = path.resolve(import.meta.dirname, 'dist')
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

/**
 * События скрипта главного потока: обработчики событий DOM, вызовы функций из
 * браузера (колбэки кадра, таймеры, наблюдатели), микрозадачи — в них
 * перерисовывает фреймворк, — разбор и компиляция.
 */
const SCRIPT = new Set([
	'EventDispatch',
	'FunctionCall',
	'TimerFire',
	'FireAnimationFrame',
	'FireIdleCallback',
	'RunMicrotasks',
	'EvaluateScript',
	'v8.evaluateModule',
	'v8.compile',
	'v8.compileModule',
	'v8.run',
])

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
 * Отрезки событий, слитые в непересекающиеся: вложенное и перекрытое событие
 * считается один раз. По возрастанию начала.
 */
function merged(spans) {
	const sorted = spans.map(({ start, end }) => [start, end]).sort((a, b) => a[0] - b[0])
	const result = []

	for (const [start, end] of sorted) {
		const last = result.at(-1)

		if (last && start <= last[1]) last[1] = Math.max(last[1], end)
		else result.push([start, end])
	}

	return result
}

/** Пересечение двух наборов слитых отрезков. */
function intersect(a, b) {
	const result = []
	let i = 0
	let j = 0

	while (i < a.length && j < b.length) {
		const start = Math.max(a[i][0], b[j][0])
		const end = Math.min(a[i][1], b[j][1])

		if (start < end) result.push([start, end])
		if (a[i][1] < b[j][1]) i++
		else j++
	}

	return result
}

/** Сумма длин отрезков, мс. */
const lengthOf = (intervals) =>
	intervals.reduce((total, [start, end]) => total + end - start, 0) / 1000

/**
 * Сводка трассы: скрипт, сумма каждой фазы, пересчёт стилей внутри
 * обработчиков указателя и наибольшее число элементов, чей стиль пересчитан за
 * раз.
 *
 * Скрипт — время, которое главный поток провёл в событиях скрипта, без
 * двойного счёта: обработчик, вызвавший функцию, и микрозадачи внутри него —
 * одно время, а фазы кадра, вызванные из скрипта (стиль после записи, раскладка
 * от чтения коробки), — в своих столбцах, а не в нём.
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
	const script = merged(spans.filter((s) => SCRIPT.has(s.name)))
	const phases = merged(spans.filter((s) => PHASES.includes(s.name)))

	return {
		Скрипт: lengthOf(script) - lengthOf(intersect(script, phases)),
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

		for (const [label, scenario, arg] of SCENARIOS) {
			await browser.startTracing(page, {
				// `v8.execute` — ради микрозадач (`RunMicrotasks`): без него скрипт
				// перерисовки фреймворка в трассу не попадает
				categories: [
					'devtools.timeline',
					'disabled-by-default-devtools.timeline',
					'v8.execute',
				],
			})
			// Сценарий зовётся методом своего объекта: `bench.resize.drag(20)`
			await page.evaluate(
				([keys, value]) => {
					const owner = keys.slice(0, -1).reduce((object, key) => object[key], bench)

					return owner[keys.at(-1)](value)
				},
				[scenario, arg],
			)
			runs[label].push(summarize(await browser.stopTracing()))
		}

		await page.close()
	}

	console.log(`\n${lib}, ${SET}, N=${N}, прогонов ${RUNS}, медиана; мс главного потока`)
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
