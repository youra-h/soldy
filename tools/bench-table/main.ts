import { shallowRef } from 'vue'
import { makeRows, type TRec } from './libs/data'

const libs = {
	soldy: () => import('./libs/soldy'),
	naive: () => import('./libs/naive'),
	prime: () => import('./libs/prime'),
	plain: () => import('./libs/plain'),
	tanstack: () => import('./libs/tanstack'),
	reka: () => import('./libs/reka'),
	core: () => import('./libs/core'),
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
// «успокоения» — три кадра подряд чаще, чем раз в 50 мс. Действие, которое
// кончается не сразу (`until` — отпущенная колонка едет на место), успокаивается
// после своего конца: кадры перехода тоже частые
function frame() {
	return new Promise<number>((r) =>
		requestAnimationFrame(() => setTimeout(() => r(performance.now()), 0)),
	)
}
async function measure(action: () => void, until: () => boolean = () => true) {
	const t0 = performance.now()
	action()
	const paint = (await frame()) - t0
	let prev = performance.now()
	let calm = 0
	let done = until()
	while (calm < 3 || !done) {
		const t = await frame()
		calm = t - prev < 50 ? calm + 1 : 0
		prev = t
		if (!done && until()) {
			done = true
			calm = 0
		}
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

/** Заголовки колонок данных — у таблицы, которую можно переставлять (`sel.columns`). */
function headers(): HTMLElement[] {
	const selector = 'columns' in lib.sel ? lib.sel.columns : undefined

	if (!selector) throw new Error('у таблицы нет заголовков для перестановки')

	return [...document.querySelectorAll<HTMLElement>(selector)]
}

/** Середина узла на экране. */
function middle(element: Element) {
	const box = element.getBoundingClientRect()

	return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/**
 * Событие указателя мыши, как его шлёт браузер, только из кода. Плагин
 * перестановки слушает указатель на корне таблицы — туда событие всплывает с
 * заголовка.
 */
function pointer(type: string, target: Element, x: number, y: number) {
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			composed: true,
			pointerId: 1,
			pointerType: 'mouse',
			isPrimary: true,
			button: 0,
			buttons: type === 'pointerup' ? 0 : 1,
			clientX: x,
			clientY: y,
		}),
	)
}

/** Заголовок, который взяли, — на нём жест до отпускания. */
let held: HTMLElement | null = null

function heldHeader(): HTMLElement {
	if (!held) throw new Error('колонку не взяли')

	return held
}

/**
 * Перестановка колонки — жест по заголовку второй колонки: взять (нажатие и
 * протяжка за порог в 6 px), шаг на соседа (указатель за серединой третьей —
 * она уступает место) и отпустить. Отпущенная колонка едет на место, и
 * переставляется она, когда доехала: замер идёт, пока взятый заголовок не
 * перестал быть взятым.
 */
const reorder = {
	take: () => {
		const header = headers()[1]
		const { x, y } = middle(header)

		held = header

		return measure(() => {
			pointer('pointerdown', header, x, y)
			pointer('pointermove', header, x + 10, y)
		})
	},
	step: () => {
		const { x, y } = middle(headers()[2])

		return measure(() => pointer('pointermove', heldHeader(), x + 10, y))
	},
	release: () => {
		const header = heldHeader()
		const { x, y } = middle(header)

		held = null

		return measure(
			() => pointer('pointerup', header, x, y),
			() => !document.querySelector('thead [data-dragging]'),
		)
	},
}

Object.assign(window, {
	bench: {
		render: (n: number) => measure(() => (rows.value = makeRows(n))),
		replace: (n: number, seed: number) => measure(() => (rows.value = makeRows(n, seed))),
		clear: () => measure(() => (rows.value = null)),
		selectAll: () => measure(() => q(lib.sel.selectAll).click()),
		sort: () => measure(() => q(lib.sel.sort).click()),
		scrollThrough,
		...reorder,
		info: () => ({
			rows: document.querySelectorAll('tbody tr').length,
			nodes: document.getElementsByTagName('*').length,
			checked: document.querySelectorAll(
				'tbody input[type="checkbox"]:checked, tbody [role="checkbox"][aria-checked="true"], tbody .n-checkbox--checked',
			).length,
			// Первая ячейка данных: в режиме окна первым в теле стоит распорка
			first: document.querySelector('tbody tr > td:nth-child(2)')?.textContent?.trim(),
			// Первые заголовки колонок данных — порядок до и после перестановки
			heads:
				'columns' in lib.sel
					? headers()
							.slice(0, 3)
							.map((header) => header.textContent?.trim())
							.join(', ')
					: undefined,
			heap: heap(),
		}),
	},
})
