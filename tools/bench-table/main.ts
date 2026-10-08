import { shallowRef } from 'vue'
import { makeRows, type TRec } from './libs/data'

const libs = {
	soldy: () => import('./libs/soldy'),
	naive: () => import('./libs/naive'),
	prime: () => import('./libs/prime'),
}
const name = (new URLSearchParams(location.search).get('lib') ?? 'soldy') as keyof typeof libs
function q(s: string) {
	const el = document.querySelector<HTMLElement>(s)
	if (!el) throw new Error('нет ' + s)
	return el
}

/** Занятая куча — нестандартное `performance.memory` Chromium. */
function heap() {
	const memory: unknown = Reflect.get(performance, 'memory')
	return memory && typeof memory === 'object' && 'usedJSHeapSize' in memory
		? Number(memory.usedJSHeapSize)
		: undefined
}

const rows = shallowRef<TRec[] | null>(null)
const lib = await libs[name]()
lib.mount(q('#app'), rows)

// Время до кадра, где действие отрисовано (rAF + задача после него), и до
// «успокоения» — три кадра подряд чаще, чем раз в 50 мс
function frame() {
	return new Promise<number>((r) =>
		requestAnimationFrame(() => setTimeout(() => r(performance.now()), 0)),
	)
}
async function measure(action: () => void) {
	const t0 = performance.now()
	action()
	const paint = (await frame()) - t0
	let prev = performance.now()
	let calm = 0
	while (calm < 3) {
		const t = await frame()
		calm = t - prev < 50 ? calm + 1 : 0
		prev = t
	}
	return { paint: Math.round(paint), settled: Math.round(prev - t0) }
}

Object.assign(window, {
	bench: {
		render: (n: number) => measure(() => (rows.value = makeRows(n))),
		replace: (n: number, seed: number) => measure(() => (rows.value = makeRows(n, seed))),
		clear: () => measure(() => (rows.value = null)),
		selectAll: () => measure(() => q(lib.sel.selectAll).click()),
		sort: () => measure(() => q(lib.sel.sort).click()),
		info: () => ({
			rows: document.querySelectorAll('tbody tr').length,
			nodes: document.getElementsByTagName('*').length,
			checked: document.querySelectorAll(
				'tbody input[type="checkbox"]:checked, tbody [role="checkbox"][aria-checked="true"], tbody .n-checkbox--checked',
			).length,
			first: document
				.querySelector('tbody tr:first-child td:nth-child(2)')
				?.textContent?.trim(),
			heap: heap(),
		}),
	},
})
