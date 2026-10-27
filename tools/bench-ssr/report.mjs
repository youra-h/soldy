import fs from 'node:fs'
import path from 'node:path'
import { judge, warmed } from './verdict.mjs'

/**
 * Journal tables from the run's results (`results/<framework>.json`, written by
 * `run.mjs`) — Markdown to the output, for `benchmarks/ssr/`.
 *
 *   node report.mjs                     # every framework with a result
 *   node report.mjs vue react
 *
 * The verdict is `verdict.mjs`'s.
 */
const FRAMEWORKS = ['vue', 'react', 'svelte', 'solid', 'angular']
const asked = process.argv.slice(2)
const results = (asked.length > 0 ? asked : FRAMEWORKS)
	.map((framework) => path.resolve(import.meta.dirname, 'results', `${framework}.json`))
	.filter((file) => fs.existsSync(file))
	.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))

const KB = 1024
const MB = 1024 * 1024
const VERDICTS = { leak: '**утечка**', 'heap grows': '**куча растёт**', clean: 'чисто' }

/** A journal number — with a decimal comma, as in the other journals. */
const num = (value, digits = 1) => value.toFixed(digits).replace('.', ',')
const signed = (value) => (value > 0 ? `+${value}` : String(value))
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

function table(head, rows) {
	return [
		`| ${head.join(' | ')} |`,
		`| ${head.map(() => '---').join(' | ')} |`,
		...rows.map((row) => `| ${row.join(' | ')} |`),
	].join('\n')
}

const pageRow = (framework, result, empty) => {
	const { growth, heap, noise, verdict } = judge(result, empty)
	const base = warmed(result)
	const after = result.samples.filter((sample) => sample.renders > result.options.warm)

	return [
		framework,
		String(result.options.renders),
		num(median(after.map((sample) => sample.time))),
		num(base.heap / MB, 2),
		num(result.settled.heap / MB, 2),
		num(heap, 0),
		num(noise, 0),
		`${signed(base.components - result.start.components)} / ${signed(growth.components)}`,
		`${signed(base.emitters - result.start.emitters)} / ${signed(growth.emitters)}`,
		VERDICTS[verdict],
	]
}

const HEAD = [
	'платформа',
	'рендеров',
	'рендер, мс',
	'куча после разогрева, МБ',
	'куча в конце, МБ',
	'наклон, Б/рендер',
	'шум `empty`, Б/рендер',
	'компоненты: разогрев / после',
	'шины: разогрев / после',
	'итог',
]

console.log('### Страница со всеми компонентами\n')
console.log(
	table(
		HEAD,
		results
			.filter(({ pages }) => pages.all)
			.map(({ framework, pages }) => pageRow(framework, pages.all, pages.empty)),
	),
)

console.log('\n### Языки соседних запросов\n')
console.log(
	table(
		[
			'платформа',
			'компонентов',
			'разметка ru-RU, КБ',
			'маркеры ru / en / ar',
			'первые рендеры',
			'разметка не как у первого',
		],
		results
			.filter(({ pages }) => pages.all)
			.map(({ framework, pages: { all } }) => [
				framework,
				String(all.components.length),
				num((all.sizes['ru-RU'] ?? 0) / KB),
				Object.values(all.markers)
					.map((list) => list.length)
					.join(' / '),
				Object.values(all.references).every((problems) => problems.length === 0)
					? 'свои строки, ряд даты своего направления'
					: Object.entries(all.references)
							.filter(([, problems]) => problems.length > 0)
							.map(([tag, problems]) => `${tag}: ${problems.join('; ')}`)
							.join('<br>'),
				`${all.mismatches} из ${all.options.renders}`,
			]),
	),
)

console.log('\n### Подставная утечка\n')
console.log(
	table(
		HEAD,
		results
			.filter(({ pages }) => pages.leak)
			.map(({ framework, pages }) => pageRow(framework, pages.leak, pages.empty)),
	),
)
