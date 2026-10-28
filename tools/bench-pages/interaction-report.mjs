import fs from 'node:fs'
import path from 'node:path'

/**
 * Journal tables of the interaction run from `results/interaction-<framework>.json`
 * (see benchmarks/interaction/README.md):
 *
 *   node interaction-report.mjs                 # every framework with a result, and the summary
 *   node interaction-report.mjs react svelte
 *   node interaction-report.mjs --from=<folder> vue   # results kept elsewhere (a run before a fix)
 *
 * For each framework: the response of every action — the median time to the
 * frame at every CPU rate, the calm and the browser's input-to-paint at the
 * slowest — and its render work on a page of N copies against a page of one,
 * with the DOM writes into the other copies. Then the summary: the time to
 * the frame at the slowest rate on every framework side by side.
 */
const FRAMEWORKS = ['vue', 'react', 'svelte', 'solid', 'webc', 'angular']
const NAMES = {
	vue: 'Vue',
	react: 'React',
	svelte: 'Svelte',
	solid: 'Solid',
	webc: 'Web Components',
	angular: 'Angular',
}
const args = process.argv.slice(2)
const from = args.find((arg) => arg.startsWith('--from='))?.slice('--from='.length)
const results = from ? path.resolve(from) : path.resolve(import.meta.dirname, 'results')
const asked = args.filter((arg) => !arg.startsWith('--'))
const runs = (asked.length ? asked : FRAMEWORKS)
	.map((fw) => path.join(results, `interaction-${fw}.json`))
	.filter((file) => fs.existsSync(file))
	.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))

const median = (list) => {
	const sorted = list.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b)

	return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
}

/** Event Timing does not report under 16 ms. */
const inp = (value) => (value === null ? '<16' : String(value))

/** The actions of a run in its order: `page: action`. */
function actionsOf(run) {
	return Object.entries(run.timing).flatMap(([page, rates]) =>
		Object.keys(Object.values(rates)[0]).map((action) => ({ page, action })),
	)
}

function timingTable(run) {
	const rates = run.rates
	const slowest = rates[rates.length - 1]
	const head = [
		'Действие',
		...rates.map((rate) => `×${rate}, кадр`),
		`×${slowest}, успокоение`,
		`×${slowest}, INP`,
	]
	const rows = actionsOf(run).map(({ page, action }) => {
		const at = (rate) => run.timing[page][rate][action]
		const failed = rates.reduce((sum, rate) => sum + at(rate).filter((r) => r.error).length, 0)
		const last = at(slowest)

		return [
			`${page}: ${action}${failed ? ` (сбоев ${failed})` : ''}`,
			...rates.map((rate) => String(median(at(rate).map((r) => r.paint)))),
			String(median(last.map((r) => r.settled))),
			// A language switch is not input: the events Event Timing reports then are the
			// pointer's, over the nodes the new layout moved under it
			action.startsWith('locale') ? '—' : inp(median(last.map((r) => r.inp ?? 0)) || null),
		]
	})

	return table(head, rows)
}

function rendersTable(run) {
	if (!run.renders) return '_Счёт перерисовок не снимался._'

	const n = String(run.n)
	const head = [
		'Действие',
		`обновлений, ${n} копий`,
		'обновлений, 1 копия',
		`монтирований, ${n} / 1`,
		'DOM-записей в других копиях',
		`DOM-записей вне страницы, ${n} / 1`,
		'кто обновился (50 копий)',
	]
	const rows = Object.entries(run.renders).flatMap(([page, sizes]) =>
		Object.keys(sizes[n]).map((action) => {
			const many = sizes[n][action]
			const one = sizes['1'][action]
			const of = (list, pick) => median(list.map(pick))
			const names = Object.entries(many[0]?.renders.names ?? {})
				.slice(0, 4)
				.map(([name, count]) => `${name.replace(/^_/, '')} ${count}`)
				.join(', ')
			const ticks = of(many, (r) => r.renders.tick)

			return [
				`${page}: ${action}`,
				String(of(many, (r) => r.renders.update)) + (ticks ? ` (тактов ${ticks})` : ''),
				String(of(one, (r) => r.renders.update)),
				`${of(many, (r) => r.renders.mount)} / ${of(one, (r) => r.renders.mount)}`,
				String(of(many, (r) => r.writes?.others ?? 0)),
				`${of(many, (r) => r.writes?.outside ?? 0)} / ${of(one, (r) => r.writes?.outside ?? 0)}`,
				names || '—',
			]
		}),
	)

	return table(head, rows)
}

function summaryTable() {
	const slowest = runs[0]?.rates.at(-1)
	const head = ['Действие', ...runs.map((run) => NAMES[run.framework] ?? run.framework)]
	const rows = actionsOf(runs[0]).map(({ page, action }) => [
		`${page}: ${action}`,
		...runs.map((run) => {
			const list = run.timing[page]?.[slowest]?.[action]

			return list ? String(median(list.map((r) => r.paint))) : '—'
		}),
	])

	return `Время до кадра при замедлении ×${slowest}, мс (медиана):\n\n${table(head, rows)}`
}

function table(head, rows) {
	const line = (cells) => `| ${cells.join(' | ')} |`

	return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n')
}

for (const run of runs) {
	console.log(`## ${NAMES[run.framework] ?? run.framework}\n`)
	console.log(
		`Chromium ${run.browser}, ${run.n} копий, ${run.reps} замеров после ${run.warm} разогрева, ${run.date.slice(0, 10)}.\n`,
	)
	console.log('Отклик, мс (медиана):\n')
	console.log(timingTable(run))
	console.log('\nРабота на действие (медиана):\n')
	console.log(rendersTable(run))

	if (run.errors.length)
		console.log(`\nОшибки страницы: ${run.errors.length}, первая — ${run.errors[0]}`)

	console.log('')
}

if (runs.length > 1) console.log(summaryTable())
