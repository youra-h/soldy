// First: the counting build's render hooks stand before any framework loads
import { counts, detail } from './count/probes'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { TActionEvent, TButton, TComponent, TEventEmitter } from '@soldy-ui/core'
import { enUS, ruRU } from '@soldy-ui/plugins'
import {
	COLLECTION_ITEMS,
	COMPONENTS,
	isPreviewHostModule,
	previewProps,
	type IPreviewHandle,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../../packages/playground/vue/browser/page.css'
import {
	decideSteps,
	observeSteps,
	SCENARIOS,
	TScenarioStopped,
	type TStepDecision,
} from './scenarios'

declare global {
	interface Window {
		/** Step of the parity run: exposed by `parity.mjs`, it records the tree in Node. */
		parityStep?: (label: string) => Promise<void>
	}
}

/**
 * The measurement page (`window.bench`): the preview host of the framework
 * from `?fw=` mounts a component's page — N copies in one root
 * (`TPreviewMount.count`) — a scenario acts on it, and the page is taken down.
 * The runners (`run.mjs`, the soak session `soak.mjs`) measure over the
 * DevTools protocol; here is only what the app does.
 *
 * The hosts are the developer stand's (`packages/playground/vue/src/hosts/`):
 * all six frameworks have the same previews with the same data, so the pages
 * of different frameworks are comparable.
 */

useIcons(material)
useTheme(oren)

/**
 * Host modules — lazily, by folder, as in the stand's shell
 * (`packages/playground/vue/src/hosts/index.ts`): only the page framework's
 * host is loaded, and the hosts have their own type programs, which the glob
 * does not pull into the stand's program.
 */
const HOSTS = import.meta.glob('../../packages/playground/vue/src/hosts/*/index.ts')

const framework = new URLSearchParams(location.search).get('fw') ?? 'vue'
const load = HOSTS[`../../packages/playground/vue/src/hosts/${framework}/index.ts`]

if (!load) throw new Error(`[bench-pages] нет хоста «${framework}»`)

const module = await load()

if (!isPreviewHostModule(module)) throw new Error(`[bench-pages] хост «${framework}» не хост`)

const host: IPreviewHost = module.default
const stage = document.querySelector<HTMLElement>('#app')

if (!stage) throw new Error('[bench-pages] нет #app')

/**
 * The pages are the finished components the host can draw, in registry order.
 * The inheritance layers (the `layers` group) are not page components, as on
 * the stand's showcase.
 */
const pages = COMPONENTS.filter(
	(entry) => entry.group !== 'layers' && host.previews.includes(entry.id),
).map((entry) => entry.id)

/**
 * Props of a component on the page — its preview's (`PREVIEW_PROPS`). Select
 * gets its options as data (`items`), as the neighbors' pages get theirs
 * (`tools/bench-compare`): the preview writes them in markup, and the hosts
 * draw no markup options once `items` came.
 */
function propsOf(id: string): Readonly<Record<string, unknown>> {
	return id === 'select' ? { ...previewProps(id), items: COLLECTION_ITEMS } : previewProps(id)
}

/** What is mounted now: the page's roots. */
let mounted: IPreviewHandle[] = []

/** Copies on the mounted component page: the interaction run tells them apart by it. */
let copies = 0

/**
 * A planted leak — a check of the measurement itself: after mounting, the
 * page holds the buttons' nodes, a `document` listener for each and a core
 * instance, like a component that forgot to unsubscribe. A measurement that
 * does not see it is not a measurement.
 */
const leaked: unknown[] = []

function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function frames(count = 2): Promise<void> {
	for (let index = 0; index < count; index++) await frame()
}

/** A node for a root: each page has its own, removed together with it. */
function place(): HTMLElement {
	const node = document.createElement('div')

	node.className = 'bench-page'
	stage?.appendChild(node)

	return node
}

/**
 * A component's page: N copies in one root. Service pages: `all` — each
 * component once, in its own root; `empty` — a root without components, the
 * noise of the measurement itself; `leak` — buttons with the planted leak.
 * `only` narrows `all` to the listed components — the ones a neighbor library
 * has too (`tools/bench-compare`).
 *
 * Returns the mount time in ms: from the host call to the second frame, by
 * which the plugins have got their nodes.
 */
async function mount(page: string, count: number, only?: string[]): Promise<number> {
	if (mounted.length) throw new Error('[bench-pages] страница уже стоит')

	const start = performance.now()

	if (page === 'all') {
		mounted = (only ?? pages).map((id) =>
			host.mount(place(), { component: id, props: propsOf(id), count: 1 }),
		)
	} else {
		const component = page === 'leak' || page === 'empty' ? 'button' : page

		copies = page === 'empty' ? 0 : count
		mounted = [host.mount(place(), { component, props: propsOf(component), count: copies })]
	}

	await frames()

	const time = performance.now() - start

	if (page === 'leak') {
		for (const node of stage?.querySelectorAll('.so-button') ?? []) {
			const listener = () => node.isConnected

			document.addEventListener('pointerdown', listener)
			leaked.push(node, listener, new TButton({ text: 'Утечка' }))
		}
	}

	return time
}

/** Take the page down — the roots and their nodes — and wait the frames the layers leave in. */
async function unmount(): Promise<void> {
	for (const handle of mounted) handle.unmount()

	mounted = []
	copies = 0

	for (const node of stage?.querySelectorAll('.bench-page') ?? []) node.remove()

	await frames()
}

/** The page's scenario: actions on its copies. `all` runs every component's scenario in turn. */
async function scenario(page: string, act: number, only?: string[]): Promise<number> {
	const ids = page === 'all' ? (only ?? pages) : [page === 'leak' ? 'button' : page]

	if (page === 'empty') return 0
	let done = 0

	for (const id of ids) {
		const run = SCENARIOS[id]

		if (!run) continue

		const roots = [...(stage?.querySelectorAll<HTMLElement>('.bench-page') ?? [])]
		const scope = page === 'all' ? roots[ids.indexOf(id)] : roots[0]

		if (scope) done += await run(scope, page === 'all' ? 1 : act)
	}

	return done
}

/** The page's language: there and back, like an app's language switch. */
async function locale(): Promise<void> {
	host.setLocale(ruRU)
	await frames(1)
	host.setLocale(enUS)
	await frames(1)
}

/** Prototypes whose live objects the runner counts with `Runtime.queryObjects`. */
const prototypes = { component: TComponent.prototype, emitter: TEventEmitter.prototype }

/** An integer hash: the murmur3 finalizer. */
function mix(value: number): number {
	let hash = value | 0

	hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)

	return (hash ^ (hash >>> 16)) >>> 0
}

/**
 * A seeded generator, numbers in [0, 1): mulberry32 started from a hash of the
 * seed and the number, so the same pair gives the same sequence, and
 * neighbouring numbers do not repeat each other a step apart.
 */
function generator(seed: number, index: number): () => number {
	let state = mix(mix(seed) ^ index)

	return () => {
		state = (state + 0x6d2b79f5) | 0

		let t = Math.imul(state ^ (state >>> 15), state | 1)

		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** What a soak transition is drawn from: the seed, its number, the pages, the most copies and acted copies. */
type TTransitionDraw = {
	seed: number
	index: number
	pages: readonly string[]
	copies: number
	act: number
}

/**
 * A transition of the soak session: the page, its copies, the copies the
 * scenario acted on, the decisions before its user actions in order — the
 * action's label, after `skip`, `locale` or `stop` unless it was simply done —
 * and the action the page was taken down in the middle of (`null` — the
 * scenario ran to its end).
 */
type TTransition = {
	page: string
	copies: number
	act: number
	steps: string[]
	stopped: string | null
}

/**
 * Odds of the decisions before a user action of a soak transition; the rest
 * is `do`. `locale` switches the page's language there and back and then does
 * the action: the switch lands on whatever the scenario left open.
 */
const odds = { skip: 0.2, locale: 0.05, stop: 0.02 }

/** The decision a draw from [0, 1) falls on. */
function decide(draw: number): TStepDecision | 'locale' {
	if (draw < odds.skip) return 'skip'
	if (draw < odds.skip + odds.locale) return 'locale'
	if (draw < odds.skip + odds.locale + odds.stop) return 'stop'

	return 'do'
}

/**
 * A transition of the soak session (`soak.mjs`): a page drawn from `pages`
 * with 1 to `copies` copies (`all` — one of each), its scenario on 1 to `act`
 * of them with a decision before every user action (`decideSteps`), and the
 * page taken down — at once, without the frames after it, in the middle of
 * the action that got `stop`. Everything is drawn from the generator of the
 * seed and the number: the same pair is the same transition, and a path the
 * session found replays alone.
 */
async function transition(draw: TTransitionDraw): Promise<TTransition> {
	const random = generator(draw.seed, draw.index)
	const pick = (count: number) => Math.floor(random() * count)
	const page = draw.pages[pick(draw.pages.length)]
	const count = page === 'all' ? 1 : 1 + pick(draw.copies)
	const act = 1 + pick(Math.min(count, draw.act))
	const steps: string[] = []
	let stopped: string | null = null

	try {
		await mount(page, count)
		decideSteps(async (label) => {
			const decision = decide(random())

			steps.push(decision === 'do' ? label : `${decision} ${label}`)

			if (decision !== 'locale') return decision

			await locale()

			return 'do'
		})
		await scenario(page, act)
	} catch (error) {
		if (!(error instanceof TScenarioStopped)) throw error

		stopped = error.label
	} finally {
		decideSteps(undefined)
		await unmount()
	}

	return { page, copies: count, act, steps, stopped }
}

/** An event of the parity journal: the full core name and comparable arguments. */
type TJournalEntry = { name: string; args: unknown[] }

/** The component's events since the last `take`. */
let journal: TJournalEntry[] = []

/**
 * An event argument in a form the six frameworks can be compared by, taken at
 * the moment of the event: a core instance — its class and `value` (the
 * instance itself lives on and changes), an action event — its class, fields
 * and `defaultPrevented`, a DOM event or node — its type. Ids differ between
 * mounts and are not compared: the accessibility tree has none.
 */
function comparable(value: unknown, depth = 0): unknown {
	if (value === undefined) return '<undefined>'
	if (value === null || typeof value !== 'object') {
		return typeof value === 'function' ? '<function>' : value
	}
	if (value instanceof Date) return `Date(${value.toISOString()})`
	if (value instanceof Event) return { dom: value.type }
	if (value instanceof Node) return { node: value.nodeName.toLowerCase() }
	if (Array.isArray(value)) return value.map((item) => comparable(item, depth + 1))
	if (value instanceof TComponent) {
		const own = Reflect.get(value, 'value')

		return {
			instance: value.constructor?.name ?? 'Object',
			...(own === undefined ? {} : { value: comparable(own, depth + 1) }),
		}
	}
	if (value instanceof Set) return { set: [...value].map((item) => comparable(item, depth + 1)) }
	if (value instanceof Map) {
		return { map: [...value].map((entry) => comparable(entry, depth + 1)) }
	}
	if (depth > 3) return '<deep>'

	const fields = () =>
		Object.fromEntries(
			Object.entries(value).map(([key, field]) => [key, comparable(field, depth + 1)]),
		)
	const prototype = Object.getPrototypeOf(value)

	if (prototype === Object.prototype || prototype === null) return fields()

	// Any other object — a plugin, an engine — by its class: its fields are
	// its internals, not the event's data
	if (!(value instanceof TActionEvent)) return { object: value.constructor?.name ?? 'Object' }

	return {
		object: value.constructor?.name ?? 'Object',
		...fields(),
		defaultPrevented: value.defaultPrevented,
	}
}

/**
 * Props of a component on the parity page: the page run's (`propsOf`), and
 * DatePicker with the footer's buttons (`confirmable`), which its scenario
 * presses when they are there. The page run keeps its own: a footer would
 * change what its journals measure.
 */
function recordedPropsOf(id: string): Readonly<Record<string, unknown>> {
	return id === 'date-picker' ? { ...propsOf(id), confirmable: true } : propsOf(id)
}

/**
 * Mount the page for the parity run: one copy, whose events — and its parts'
 * in markup — go to the journal.
 */
async function record(page: string): Promise<void> {
	if (mounted.length) throw new Error('[bench-pages] страница уже стоит')

	mounted = [
		host.mount(place(), {
			component: page,
			props: recordedPropsOf(page),
			count: 1,
			onEvent: (name, args) =>
				journal.push({ name, args: args.map((arg) => comparable(arg)) }),
		}),
	]

	await frames()
}

/** The journal since the last call. */
function take(): TJournalEntry[] {
	const taken = journal

	journal = []

	return taken
}

/**
 * Wait until the page is still: no running finite animation or transition
 * (a spinner turns forever) and no DOM change for three frames, at most 3 s.
 * A layer closes with a transition, and what it sends at its end belongs to
 * the step that closed it.
 */
async function settle(): Promise<void> {
	const end = performance.now() + 3000
	let changed = true
	const watcher = new MutationObserver(() => (changed = true))

	watcher.observe(document.body, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	})

	try {
		for (let still = 0; still < 3 && performance.now() < end;) {
			changed = false
			await frame()

			const moving = document
				.getAnimations()
				.some(
					(animation) =>
						animation.playState === 'running' &&
						animation.effect?.getComputedTiming().endTime !== Infinity,
				)

			still = changed || moving ? 0 : still + 1
		}
	} finally {
		watcher.disconnect()
	}
}

/** Report every scenario step to the runner once the page is still. */
function observe(): void {
	observeSteps(async (label) => {
		await settle()
		await window.parityStep?.(label)
	})
}

/**
 * The input events of a user action (interaction run, `interaction.mjs`): the
 * first of them starts the action's time, its last one (`final` of `arm`)
 * waits for the frame.
 */
const INPUT_EVENTS = [
	'pointerdown',
	'mousedown',
	'pointerup',
	'mouseup',
	'click',
	'keydown',
	'beforeinput',
	'input',
	'keyup',
]

/**
 * Render work of an action: the counters of the counting build
 * (`count/counter.ts`) and the updates by component name, most first.
 */
type TRenders = { mount: number; update: number; tick: number; names: Record<string, number> }

/**
 * DOM writes of an action (mutation records) by where they landed: in the
 * first copy, which the action is on, in the other copies, outside the page
 * (a layer at the end of `body`).
 */
type TWrites = { acted: number; others: number; outside: number }

/**
 * An action's result, in ms from its first input event: `paint` — to the end
 * of the frame after its last event, `settled` — to the calm (three frames in
 * a row less than 50 ms apart, as the table stand's), `inp` — the browser's own
 * input-to-paint of the action's events (Event Timing, the longest; `null` —
 * under 16 ms, which it does not report). The counting build adds the render
 * work and the DOM writes.
 */
type TInteraction = {
	paint: number
	settled: number
	inp: number | null
	renders: TRenders | null
	writes: TWrites | null
}

/** Event Timing entries since the last action. */
let timings: PerformanceEntry[] = []

const timingObserver = new PerformanceObserver((list) => timings.push(...list.getEntries()))

// The shortest duration Event Timing reports; TypeScript's DOM types do not know the field yet
const timingOptions: PerformanceObserverInit & { durationThreshold: number } = {
	type: 'event',
	durationThreshold: 16,
}

timingObserver.observe(timingOptions)

/** The action being measured: its result once it has settled. */
let pending: Promise<TInteraction> | null = null

/** The end of the next frame: `requestAnimationFrame` and the task after it. */
function frameEnd(): Promise<number> {
	return new Promise((resolve) =>
		requestAnimationFrame(() => setTimeout(() => resolve(performance.now()), 0)),
	)
}

/**
 * Where the page's copies stand: the first node down from the page's root
 * with more than one child, and how many children a copy has. `null` — a
 * page of one copy, or one whose children do not split into its copies.
 */
function copyLayout(): { parent: Element; size: number } | null {
	let parent = stage?.querySelector('.bench-page') ?? null

	while (parent && parent.children.length === 1) parent = parent.children[0] ?? null

	if (!parent || copies < 2 || parent.children.length % copies) return null

	return { parent, size: parent.children.length / copies }
}

/** Count the DOM writes from now until `stop`, by copy (counting build only). */
function watchWrites(): (() => TWrites) | null {
	if (import.meta.env.MODE !== 'count') return null

	const layout = copyLayout()
	const writes: TWrites = { acted: 0, others: 0, outside: 0 }
	const page = stage?.querySelector('.bench-page')
	const watcher = new MutationObserver((records) => {
		for (const record of records) {
			let node: Node | null = record.target

			if (!page?.contains(node)) {
				writes.outside += 1
				continue
			}

			while (layout && node && node.parentNode !== layout.parent) node = node.parentNode

			const index =
				layout && node instanceof Element ? [...layout.parent.children].indexOf(node) : 0

			if (index >= 0 && index < (layout?.size ?? Infinity)) writes.acted += 1
			else writes.others += 1
		}
	})

	watcher.observe(document.body, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	})

	return () => {
		watcher.disconnect()

		return writes
	}
}

/** Measure an action that began at `t0` once it has settled. */
async function finish(
	t0: number,
	start: typeof counts,
	writes: (() => TWrites) | null,
): Promise<TInteraction> {
	const paint = (await frameEnd()) - t0
	let previous = performance.now()

	for (let calm = 0; calm < 3;) {
		const time = await frameEnd()

		calm = time - previous < 50 ? calm + 1 : 0
		previous = time
	}

	timings.push(...timingObserver.takeRecords())

	const durations = timings
		.filter((entry) => entry.startTime >= t0 - 1)
		.map((entry) => entry.duration)

	timings = []

	return {
		paint: Math.round(paint),
		settled: Math.round(previous - t0),
		inp: durations.length ? Math.max(...durations) : null,
		renders:
			import.meta.env.MODE === 'count'
				? {
						mount: counts.mount - start.mount,
						update: counts.update - start.update,
						tick: counts.tick - start.tick,
						names: Object.fromEntries(
							[...(detail.names ?? [])].sort((a, b) => b[1] - a[1]),
						),
					}
				: null,
		writes: writes?.() ?? null,
	}
}

/**
 * Get ready for a user action the runner sends with real input (Playwright):
 * its time starts at the first input event and waits for the frame after the
 * `final` one — `click` for a press, `keydown` for a key, `input` for typing.
 */
function arm(final: string): void {
	if (pending) throw new Error('[bench-pages] действие уже ждёт')

	const start = { ...counts }
	const writes = watchWrites()

	if (import.meta.env.MODE === 'count') detail.names = new Map()

	timings = []
	pending = new Promise((resolve) => {
		let t0: number | null = null
		const listener = (event: Event) => {
			t0 ??= event.timeStamp

			if (event.type !== final) return

			for (const type of INPUT_EVENTS) window.removeEventListener(type, listener, true)

			void finish(t0, start, writes).then(resolve)
		}

		for (const type of INPUT_EVENTS) window.addEventListener(type, listener, true)
	})
}

/** The page's language switch as an action: from the call to its frame. */
function switchLocale(language: 'ru' | 'en'): void {
	if (pending) throw new Error('[bench-pages] действие уже ждёт')

	const start = { ...counts }
	const writes = watchWrites()

	if (import.meta.env.MODE === 'count') detail.names = new Map()
	const t0 = performance.now()

	timings = []
	host.setLocale(language === 'ru' ? ruRU : enUS)
	pending = finish(t0, start, writes)
}

/** The armed action's result; it fails if the action has not come within 10 s. */
async function measured(): Promise<TInteraction> {
	const action = pending

	if (!action) throw new Error('[bench-pages] действие не ждёт')

	let timer = 0

	try {
		return await Promise.race([
			action,
			new Promise<never>((_, reject) => {
				timer = window.setTimeout(
					() => reject(new Error('[bench-pages] действие не пришло за 10 с')),
					10_000,
				)
			}),
		])
	} finally {
		clearTimeout(timer)
		pending = null
	}
}

const bench = {
	framework,
	arm,
	switchLocale,
	measured,
	pages,
	mount,
	unmount,
	scenario,
	locale,
	frames,
	prototypes,
	transition,
	odds,
	record,
	take,
	settle,
	observe,
}

Object.assign(window, { bench })
