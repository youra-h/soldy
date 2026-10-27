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
import { observeSteps, SCENARIOS } from './scenarios'

declare global {
	interface Window {
		/** Step of the parity run: exposed by `parity.mjs`, it records the tree in Node. */
		parityStep?: (label: string) => Promise<void>
	}
}

/**
 * Страница замера (`window.bench`): хост превью фреймворка из `?fw=` ставит
 * страницу компонента — N его копий одним корнем (`TPreviewMount.count`), —
 * сценарий действует на неё, и страница снимается. Меряет прогонщик
 * (`run.mjs`) протоколом DevTools; здесь — только то, что делает приложение.
 *
 * Хосты — стенда разработчика (`packages/playground/vue/src/hosts/`): у всех
 * шести фреймворков одни превью с одними данными, и страницы разных
 * фреймворков сравнимы.
 */

useIcons(material)
useTheme(oren)

/**
 * Модули хостов — лениво, по папкам, как у оболочки стенда
 * (`packages/playground/vue/src/hosts/index.ts`): грузится только хост
 * фреймворка страницы, а у хостов свои программы типов, и glob не втягивает
 * их в программу стенда.
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
 * Страницы — готовые компоненты, которые хост умеет нарисовать, в порядке
 * реестра. Слои наследования (группа `layers`) — не компоненты страницы, как
 * и на витрине стенда.
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

/** Смонтированное сейчас: корни страницы. */
let mounted: IPreviewHandle[] = []

/**
 * Подставная утечка — проверка самого замера: после монтирования страница
 * держит узлы кнопок, слушатель `document` на каждую и экземпляр ядра, как
 * компонент, который забыл отписаться. Замер, который её не увидел, — не
 * замер.
 */
const leaked: unknown[] = []

function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function frames(count = 2): Promise<void> {
	for (let index = 0; index < count; index++) await frame()
}

/** Узел под корень: у каждой страницы — свой, снимается вместе с ней. */
function place(): HTMLElement {
	const node = document.createElement('div')

	node.className = 'bench-page'
	stage?.appendChild(node)

	return node
}

/**
 * Страница компонента: N копий одним корнем. Служебные страницы: `all` —
 * каждый компонент по разу, своим корнем; `empty` — корень без компонентов,
 * шум самого замера; `leak` — кнопки с подставной утечкой. Отдаёт время
 * монтирования, мс: от вызова хоста до второго кадра, к которому плагины
 * получили узлы.
 *
 * `only` narrows `all` to the listed components — the ones a neighbor library
 * has too (`tools/bench-compare`).
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
		const copies = page === 'empty' ? 0 : count

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

/** Снять страницу: корни и их узлы; ждать кадры, за которые уходят слои. */
async function unmount(): Promise<void> {
	for (const handle of mounted) handle.unmount()

	mounted = []

	for (const node of stage?.querySelectorAll('.bench-page') ?? []) node.remove()

	await frames()
}

/** Сценарий страницы: действия на её копиях. `all` — сценарии всех компонентов по очереди. */
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

/** Язык страницы: туда и обратно, как переключатель языка приложения. */
async function locale(): Promise<void> {
	host.setLocale(ruRU)
	await frames(1)
	host.setLocale(enUS)
	await frames(1)
}

/** Сколько живых объектов класса — для `Runtime.queryObjects` прогонщика. */
const prototypes = { component: TComponent.prototype, emitter: TEventEmitter.prototype }

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

const bench = {
	framework,
	pages,
	mount,
	unmount,
	scenario,
	locale,
	frames,
	prototypes,
	record,
	take,
	settle,
	observe,
}

Object.assign(window, { bench })
