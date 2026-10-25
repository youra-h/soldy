import fs from 'node:fs'
import path from 'node:path'

/**
 * Таблицы журнала из итога прогона (`results/<фреймворк>.json`, его пишет
 * `run.mjs`) — Markdown в вывод, для раздела журнала
 * `benchmarks/pages/<фреймворк>.md`.
 *
 *   node report.mjs vue
 *
 * Рост считается от конца разогрева (`warm` циклов) до последнего цикла, по
 * осевшим замерам (после паузы `settle`). Итог страницы:
 *
 * - **утечка** — после снятия живых экземпляров ядра, узлов DOM или
 *   слушателей стало больше, чем было, и рост копится: не меньше чем на
 *   половину числа циклов. То, что страница держит за собой, прибавляется
 *   каждым её циклом — хоть по одному. Разовый сдвиг меньше — колебание: у
 *   Svelte число узлов после снятия ходит на ±1 от цикла к циклу и не
 *   копится;
 * - **куча растёт** — счётчики на месте, а наклон кучи за цикл выше шума:
 *   втрое больше, чем у `empty` (корень без компонентов), и не меньше 4 КБ;
 * - **чисто** — ни того, ни другого.
 *
 * Держит сразу после снятия больше, чем осевшее, — к итогу приписано: снятое
 * держал таймер, и до паузы оно жило.
 */
const fw = process.argv[2] ?? 'vue'
const file = path.resolve(import.meta.dirname, 'results', `${fw}.json`)
const result = JSON.parse(fs.readFileSync(file, 'utf8'))
const KB = 1024
const MB = 1024 * 1024
const COUNTERS = [
	['components', 'компоненты'],
	['emitters', 'шины'],
	['nodes', 'узлы'],
	['listeners', 'слушатели'],
]

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

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits
/** Число журнала — с десятичной запятой, как в остальных журналах. */
const num = (value, digits = 1) => String(round(value, digits)).replace('.', ',')
const signed = (value) => (value > 0 ? `+${value}` : String(value))

/** Сводка страницы по циклам. */
function pageSummary({ cycles, base, end: last }) {
	const measured = cycles.slice(result.warm)
	const immediate = cycles.at(-1).after
	const weights = measured.map((c) => c.mounted.heap - c.before.heap)

	return {
		weightFirst: weights[0],
		weightLast: weights.at(-1),
		mountMs: median(measured.map((c) => c.time)),
		heapSlope: slope(measured.map((c) => c.after.heap)),
		heapGrowth: last.heap - base.heap,
		grown: Object.fromEntries(COUNTERS.map(([key]) => [key, last[key] - base[key]])),
		held: Object.fromEntries(COUNTERS.map(([key]) => [key, immediate[key] - last[key]])),
		nodesMounted: measured[0].mounted.nodes - measured[0].before.nodes,
		componentsMounted: measured[0].mounted.components - measured[0].before.components,
		actions: measured[0].actions,
	}
}

const summaries = Object.fromEntries(
	Object.entries(result.pages).map(([id, page]) => [id, pageSummary(page)]),
)
/** Служебные страницы прогона — не компоненты. */
const SERVICE = ['all', 'empty', 'leak']
const components = Object.keys(summaries).filter((id) => !SERVICE.includes(id)).length
const noise = Math.max(4 * KB, 3 * Math.abs(summaries.empty?.heapSlope ?? 0))

function verdict(summary) {
	const listed = (values) =>
		COUNTERS.filter(([key]) => values[key] > 0)
			.map(([key, label]) => `${label} ${signed(values[key])}`)
			.join(', ')
	const accumulated = (key) => summary.grown[key] >= result.cycles / 2
	const leaked = listed(
		Object.fromEntries(
			COUNTERS.map(([key]) => [key, accumulated(key) ? summary.grown[key] : 0]),
		),
	)
	const jitter = listed(
		Object.fromEntries(
			COUNTERS.map(([key]) => [key, accumulated(key) ? 0 : summary.grown[key]]),
		),
	)
	const held = listed(summary.held)
	const note =
		(held ? `; до паузы держал таймер: ${held}` : '') +
		(jitter ? `; колебание, не копится: ${jitter}` : '')

	if (leaked) return `**утечка**: ${leaked}${note}`
	if (summary.heapSlope > noise) {
		return `куча растёт: ${num(summary.heapSlope / KB)} КБ/цикл${note}`
	}

	return `чисто${note}`
}

const lines = []
const out = (line = '') => lines.push(line)
const cycles = `${result.warm} разогрева + ${result.cycles}`

out(
	`Chromium ${result.browser}, ${result.n} копий на страницу, сценарий — на ${result.act} копиях, циклов ${cycles}, обход — ${result.rounds} круга, пауза перед осевшим замером — ${num(result.settle / 1000)} с.`,
)
out(
	`Шум замера (\`empty\`, корень без компонентов): куча ${num((summaries.empty?.heapSlope ?? 0) / KB)} КБ/цикл; порог «куча растёт» — ${num(noise / KB)} КБ/цикл.`,
)
out()
out(
	'| Страница | Вес, МБ | На копию, КБ | Вес в последнем цикле, МБ | Монтирование, мс | Куча после снятия, КБ/цикл | Итог |',
)
out('| --- | --: | --: | --: | --: | --: | --- |')

for (const [id, summary] of Object.entries(summaries)) {
	const copies = id === 'all' ? components : id === 'empty' ? 0 : result.n

	out(
		`| \`${id}\` | ${num(summary.weightFirst / MB, 2)} | ${copies ? num(summary.weightFirst / copies / KB) : '—'} | ${num(summary.weightLast / MB, 2)} | ${num(summary.mountMs, 0)} | ${num(summary.heapSlope / KB)} | ${verdict(summary)} |`,
	)
}

if (result.tour) {
	const rounds = result.tour
	const ids = Object.keys(rounds[0])
	const firstRound = rounds[0]
	const lastRound = rounds.at(-1)
	const lastId = ids.at(-1)
	const endOf = (visits) => visits[lastId].after

	out()
	out(`Обход: ${ids.length} страниц подряд, ${rounds.length} круга без перезагрузки.`)
	out()
	out('| После круга | Куча, МБ | Узлы | Слушатели | Компоненты | Шины |')
	out('| --- | --: | --: | --: | --: | --: |')

	rounds.forEach((visits, index) => {
		const end = endOf(visits)

		out(
			`| ${index + 1} | ${num(end.heap / MB, 2)} | ${end.nodes} | ${end.listeners} | ${end.components} | ${end.emitters} |`,
		)
	})

	const grownPages = ids
		.map((id) => {
			const first = firstRound[id]
			const last = lastRound[id]
			const weight = (visit) => visit.mounted.heap - visit.before.heap

			return { id, first: weight(first), last: weight(last) }
		})
		.filter((page) => page.last - page.first > Math.max(64 * KB, page.first * 0.05))

	out()
	out(
		grownPages.length
			? `Вес вырос от первого круга к последнему: ${grownPages
					.map(
						(page) =>
							`\`${page.id}\` ${num(page.first / MB, 2)} → ${num(page.last / MB, 2)} МБ`,
					)
					.join(', ')}.`
			: 'Вес ни одной страницы от первого круга к последнему не вырос больше чем на 5 %.',
	)
}

if (result.errors.length) {
	out()
	out(`Ошибки страницы (${result.errors.length}):`)
	out()

	for (const error of [...new Set(result.errors)].slice(0, 20)) out(`- \`${error}\``)
}

console.log(lines.join('\n'))
