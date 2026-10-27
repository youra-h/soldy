import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { queryObjects } from 'node:v8'
import { TButton, TComponent, TEventEmitter } from '@soldy-ui/core'
import { arEG, enUS, ruRU, zhCN, type TLocale } from '@soldy-ui/plugins'
import { pageComponents, type TServerPage } from './page'

/**
 * The run of one framework in its own Node process (see
 * benchmarks/ssr/README.md in the root): thousands of server renders of the
 * page in a row, a measurement after every `every` of them.
 *
 * A round is three requests at once — one per language (`ruRU`, `enUS`,
 * `arEG`), as neighboring requests of a server, — and the renders of a round
 * run concurrently as far as the renderer allows. Every render is compared
 * with the first render of its language: a server page has no state of its
 * own, and markup that differs from the first is either another request's
 * language or a counter that lives longer than a request (a mount id that
 * grows over the process). The first renders are checked themselves: strings
 * and the date's direction of their own language, none of the others'.
 *
 * A measurement follows garbage collection (`gc()` twice, `--expose-gc`): the
 * used heap and live core instances — components (`TComponent` and
 * subclasses, collection facades too) and event buses (`TEventEmitter`) — via
 * `queryObjects` of `node:v8`. It counts the prototypes of subclasses too, so
 * the numbers are compared with the count before the first render, not with
 * zero.
 *
 * Pages: `all` — every component; `empty` — the provider without components,
 * the noise of the run itself; `leak` — `all` plus a planted leak (a core
 * instance and the markup held per render): a run that does not show it is
 * not a run.
 */

/** A measurement after garbage collection. */
export type TSample = {
	/** Renders so far. */
	readonly renders: number
	/** Used heap, bytes. */
	readonly heap: number
	/** Live `TComponent` objects (subclass prototypes included). */
	readonly components: number
	/** Live `TEventEmitter` objects. */
	readonly emitters: number
	/** Mean time of a render since the previous measurement, ms. */
	readonly time: number
}

/** Markup of a render that differs from the first render of its language. */
export type TMismatch = {
	readonly render: number
	readonly locale: string
	/** What the check of the render found: another language, or a plain difference. */
	readonly problems: readonly string[]
	/** The markup around the first difference: reference, then the render. */
	readonly expected: string
	readonly actual: string
}

/** The result of a run — `results/<framework>-<page>.json`. */
export type TResult = {
	readonly framework: string
	readonly page: string
	readonly components: readonly string[]
	readonly options: Readonly<Record<string, number>>
	/** Before the first render. */
	readonly start: TSample
	readonly samples: readonly TSample[]
	/** After the last render and a `settle` pause. */
	readonly settled: TSample
	/** Markup size of the first render of each language, characters. */
	readonly sizes: Readonly<Record<string, number>>
	/** Problems of the first renders of the languages. */
	readonly references: Readonly<Record<string, readonly string[]>>
	/** The markers of each language found in its first render. */
	readonly markers: Readonly<Record<string, readonly string[]>>
	readonly mismatches: number
	readonly firstMismatches: readonly TMismatch[]
}

/** The languages of neighboring requests. */
const LOCALES: readonly TLocale[] = [ruRU, enUS, arEG]

/**
 * The control language — not among the requests: strings of the requests'
 * languages found in its markup are the page's data (a preview's text), not a
 * translation, and are not markers of a language.
 */
const CONTROL = zhCN

/** Languages written right to left — the direction of their date segments. */
const RTL: ReadonlySet<string> = new Set(['ar'])

const { values } = parseArgs({
	options: {
		page: { type: 'string', default: 'all' },
		renders: { type: 'string', default: '3000' },
		warm: { type: 'string', default: '600' },
		every: { type: 'string', default: '150' },
		settle: { type: 'string', default: '3000' },
		out: { type: 'string' },
		dump: { type: 'string' },
	},
})

const options = {
	renders: Number(values.renders),
	/** The warm-up, renders: growth counts from its end (`verdict.mjs`). */
	warm: Number(values.warm),
	every: Number(values.every),
	settle: Number(values.settle),
}

declare const gc: () => void

if (typeof gc !== 'function') throw new Error('[bench-ssr] run Node with --expose-gc')

/** Every string of a locale's translations, without the templated ones. */
function translations(locale: TLocale): string[] {
	const found: string[] = []
	const walk = (value: unknown): void => {
		if (typeof value === 'string') {
			if (!value.includes('{')) found.push(value)
		} else if (typeof value === 'object' && value !== null) {
			for (const item of Object.values(value)) walk(item)
		}
	}

	walk(locale.translations)

	return found
}

/**
 * Markers of each language — its strings found in no other language and not in
 * the control language's markup (that is the page's data).
 */
function markersOf(control: string): Map<string, readonly string[]> {
	const all = LOCALES.map((locale) => new Set(translations(locale)))

	return new Map(
		LOCALES.map((locale, index) => [
			locale.tag,
			[...all[index]].filter(
				(text) =>
					!control.includes(text) &&
					all.every((other, at) => at === index || !other.has(text)),
			),
		]),
	)
}

/**
 * Attributes `lang` and `dir` of every start tag with `lang`, and whether it is
 * the row of a date's segments. The row's direction is its language's; a
 * number field's text is a number, left to right in every language.
 */
function langTags(markup: string): { lang: string; dir: string | undefined; date: boolean }[] {
	return [...markup.matchAll(/<[a-z][^>]*\slang="([^"]+)"[^>]*>/g)].map((match) => ({
		lang: match[1],
		dir: /\sdir="([^"]+)"/.exec(match[0])?.[1],
		date: match[0].includes('so-date-input__segments'),
	}))
}

/** What is wrong with the language of a render: empty — nothing. */
function checkLanguage(
	markup: string,
	locale: TLocale,
	markers: Map<string, readonly string[]>,
): string[] {
	const problems: string[] = []
	const own = markers.get(locale.tag) ?? []

	if (own.length > 0 && !own.some((text) => markup.includes(text))) {
		problems.push(`no string of ${locale.tag}`)
	}

	for (const [tag, list] of markers) {
		if (tag === locale.tag) continue

		const foreign = list.filter((text) => markup.includes(text))

		if (foreign.length > 0) problems.push(`strings of ${tag}: ${foreign.join(' | ')}`)
	}

	const direction = RTL.has(locale.tag.split('-')[0]) ? 'rtl' : 'ltr'

	const tags = langTags(markup)

	if (!tags.some(({ date }) => date)) problems.push('no date segments')

	for (const { lang, dir, date } of tags) {
		if (lang !== locale.tag) problems.push(`lang="${lang}"`)
		else if (date && dir !== direction) problems.push(`date segments with dir="${dir}"`)
	}

	return problems
}

/** The markup around the first difference of two strings. */
function around(expected: string, actual: string): { expected: string; actual: string } {
	let at = 0

	while (at < expected.length && expected[at] === actual[at]) at++

	const from = Math.max(0, at - 80)

	return { expected: expected.slice(from, at + 120), actual: actual.slice(from, at + 120) }
}

/**
 * A measurement after a timer turn of the event loop — what a renderer lets go
 * of on its next task is gone (Solid disposes the root of `renderToString` by
 * `setTimeout`) — and after garbage collection.
 */
async function sample(renders: number, time: number): Promise<TSample> {
	await new Promise((resolve) => setTimeout(resolve, 0))

	gc()
	gc()

	return {
		renders,
		heap: process.memoryUsage().heapUsed,
		components: queryObjects(TComponent, { format: 'count' }),
		emitters: queryObjects(TEventEmitter, { format: 'count' }),
		time,
	}
}

/** Run the page of a framework and write the result to `--out`. */
export async function measure(page: TServerPage, previews: readonly string[]): Promise<void> {
	const pageName = values.page
	const components = pageName === 'empty' ? [] : pageComponents(previews)
	/** The planted leak: what a render leaves behind, held to the end. */
	const leaked: unknown[] = []

	const render = async (locale: TLocale): Promise<string> => {
		const markup = await page.render(locale, components)

		if (pageName === 'leak') leaked.push(new TButton({ text: 'Leak' }), markup)

		return markup
	}

	const start = await sample(0, 0)
	const control = await page.render(CONTROL, components)
	const markers = markersOf(control)
	const references = new Map<string, string>()
	const samples: TSample[] = []
	const firstMismatches: TMismatch[] = []

	let renders = 0
	let mismatches = 0
	let since = performance.now()
	let sinceRenders = 0

	while (renders < options.renders) {
		// A server returns to its event loop between requests: timers fire, and
		// what the microtasks kept alive is let go. A synchronous renderer's round
		// resolves in microtasks, and without this the run would never leave them
		await new Promise((resolve) => setImmediate(resolve))

		const round = await Promise.all(LOCALES.map(render))

		round.forEach((markup, index) => {
			const locale = LOCALES[index]
			const reference = references.get(locale.tag)

			renders++

			if (reference === undefined) {
				references.set(locale.tag, markup)
				return
			}

			if (markup === reference) return

			mismatches++

			if (firstMismatches.length < 5) {
				firstMismatches.push({
					render: renders,
					locale: locale.tag,
					problems: checkLanguage(markup, locale, markers),
					...around(reference, markup),
				})
			}
		})

		if (Math.floor(renders / options.every) > samples.length) {
			const time = (performance.now() - since) / (renders - sinceRenders)

			samples.push(await sample(renders, time))
			since = performance.now()
			sinceRenders = renders
		}
	}

	await new Promise((resolve) => setTimeout(resolve, options.settle))

	const settled = await sample(renders, 0)
	const result: TResult = {
		framework: page.framework,
		page: pageName,
		components: components.map((component) => component.id),
		options,
		start,
		samples,
		settled,
		sizes: Object.fromEntries([...references].map(([tag, markup]) => [tag, markup.length])),
		references: Object.fromEntries(
			LOCALES.map((locale) => [
				locale.tag,
				checkLanguage(references.get(locale.tag) ?? '', locale, markers),
			]),
		),
		markers: Object.fromEntries(
			[...markers].map(([tag, list]) => [
				tag,
				list.filter((text) => references.get(tag)?.includes(text)),
			]),
		),
		mismatches,
		firstMismatches,
	}

	// The first markup of each language — to look at what the checks compared
	if (values.dump) {
		mkdirSync(values.dump, { recursive: true })

		for (const [tag, markup] of references) {
			writeFileSync(path.join(values.dump, `${page.framework}-${tag}.html`), markup)
		}
	}

	if (values.out) writeFileSync(values.out, JSON.stringify(result, null, '\t'))
	else console.log(JSON.stringify(result))

	// A renderer's timers (a preview's toast replaced after a delay) would keep
	// the process alive past the run
	process.exit(0)
}
