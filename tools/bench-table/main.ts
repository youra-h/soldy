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

/**
 * Окно прокрутки таблицы — элемент страницы с самой длинной прокруткой: у
 * каждой библиотеки он свой, и селектор на каждую не нужен.
 */
function scroller(): Element {
	let best: Element | null = null

	for (const el of document.querySelectorAll('#app *')) {
		const style = getComputedStyle(el)
		const scrolls =
			/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1

		if (scrolls && (!best || el.scrollHeight > best.scrollHeight)) best = el
	}

	return best ?? document.documentElement
}

/** Прокрутить таблицу до конца по экрану за кадр — так листает пользователь. */
async function scrollThrough() {
	const el = scroller()
	const t0 = performance.now()

	while (el.scrollTop + el.clientHeight < el.scrollHeight - 1) {
		el.scrollTop += el.clientHeight
		await frame()
	}

	const done = await measure(() => {})

	return { paint: Math.round(performance.now() - t0), settled: done.settled }
}

Object.assign(window, {
	bench: {
		render: (n: number) => measure(() => (rows.value = makeRows(n))),
		replace: (n: number, seed: number) => measure(() => (rows.value = makeRows(n, seed))),
		clear: () => measure(() => (rows.value = null)),
		selectAll: () => measure(() => q(lib.sel.selectAll).click()),
		sort: () => measure(() => q(lib.sel.sort).click()),
		scrollThrough,
		info: () => ({
			rows: document.querySelectorAll('tbody tr').length,
			nodes: document.getElementsByTagName('*').length,
			checked: document.querySelectorAll(
				'tbody input[type="checkbox"]:checked, tbody [role="checkbox"][aria-checked="true"], tbody .n-checkbox--checked',
			).length,
			// Первая ячейка данных: в режиме окна первым в теле стоит распорка
			first: document.querySelector('tbody tr > td:nth-child(2)')?.textContent?.trim(),
			heap: heap(),
		}),
	},
})
