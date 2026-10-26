import type { TScenario } from '../bench-pages/scenarios'
import { COMPARED } from './pages'

/**
 * The neighbor page (`window.bench`) — the same surface as the soldy page of
 * `tools/bench-pages/bench.ts`, so one runner measures both: a component page
 * is N copies under one root of the framework, `all` is every compared
 * component once, each under its own root, `empty` is a root without
 * components. A scenario acts on the copies of the page the way the soldy
 * scenario acts on its own, with the same number of actions
 * (benchmarks/compare/README.md, «Сценарии»).
 *
 * There is no locale switch: the neighbors take their strings from their own
 * providers, and the runner skips the locale step for soldy as well. Core
 * instances (`prototypes`) exist only on the soldy page.
 */

/** Mounts `count` copies of a component on a node; returns the unmount. */
export type TMount = (id: string, node: HTMLElement, count: number) => Promise<() => void>

export interface IBenchOptions {
	framework: string
	/** Components the library has, in the order of `COMPARED`. */
	pages: string[]
	mount: TMount
	scenarios: Record<string, TScenario>
}

function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function frames(count = 2): Promise<void> {
	for (let index = 0; index < count; index++) await frame()
}

/** The library of the page — `?lib=`. */
export function libraryName(): string {
	const name = new URLSearchParams(location.search).get('lib')

	if (!name) throw new Error('[bench-compare] no ?lib=')

	return name
}

/** Component ids of the library's page files, in the order of `COMPARED`. */
export function pagesOf(ids: string[]): string[] {
	return COMPARED.filter((id) => ids.includes(id))
}

export function startBench({ framework, pages, mount, scenarios }: IBenchOptions): void {
	const stage = document.querySelector<HTMLElement>('#app')

	if (!stage) throw new Error('[bench-compare] no #app')

	let mounted: (() => void)[] = []

	function place(): HTMLElement {
		const node = document.createElement('div')

		node.className = 'bench-page'
		stage?.appendChild(node)

		return node
	}

	async function mountPage(page: string, count: number, only?: string[]): Promise<number> {
		if (mounted.length) throw new Error('[bench-compare] the page is already mounted')

		const start = performance.now()

		if (page === 'all') {
			for (const id of only ?? pages) mounted.push(await mount(id, place(), 1))
		} else {
			const copies = page === 'empty' ? 0 : count

			mounted = [await mount(page === 'empty' ? pages[0] : page, place(), copies)]
		}

		await frames()

		return performance.now() - start
	}

	async function unmount(): Promise<void> {
		for (const drop of mounted) drop()

		mounted = []

		for (const node of stage?.querySelectorAll('.bench-page') ?? []) node.remove()

		await frames()
	}

	async function scenario(page: string, act: number, only?: string[]): Promise<number> {
		if (page === 'empty') return 0

		const ids = page === 'all' ? (only ?? pages) : [page]
		const roots = [...(stage?.querySelectorAll<HTMLElement>('.bench-page') ?? [])]
		let done = 0

		for (const id of ids) {
			const run = scenarios[id]
			const scope = page === 'all' ? roots[ids.indexOf(id)] : roots[0]

			if (run && scope) done += await run(scope, page === 'all' ? 1 : act)
		}

		return done
	}

	const bench = {
		framework,
		pages,
		mount: mountPage,
		unmount,
		scenario,
		locale: async () => {},
		frames,
		prototypes: null,
	}

	Object.assign(window, { bench })
}
