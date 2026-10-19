// @vitest-environment jsdom

/**
 * Авторост многострочного поля (`TTextareaAutoresizePlugin`): высота
 * `<textarea>` по тексту — от `rows` до `maxRows` строк.
 *
 * Разметку тест строит сам, как её рисует Vue: корень и поле в нём. Плагины
 * собраны настоящим набором, узел плагин получает кадром, как от адаптера.
 * Раскладки в jsdom нет: метрики поля тест задаёт инлайновым стилем (их
 * читает `getComputedStyle`), высоту текста — `scrollHeight`, ширину —
 * заглушка `ResizeObserver`. Настоящую раскладку, перенос по ширине и размеры
 * темы проверяет браузер — `playground/vue/browser/textarea.spec.ts`.
 */

import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { TTextarea } from '@soldy-ui/core'
import type { ITextareaProps } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TTextareaAutoresizePlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Строка поля, px. */
const LINE = 20

/** Поля поля по оси блока, px: по 5 сверху и снизу. */
const PADDING = 10

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Уведомление наблюдателя, как его отдаёт браузер: узел и border-box. */
type TEntry = {
	target: Element
	borderBoxSize: Array<{ inlineSize: number; blockSize: number }>
}

/** Заглушка `ResizeObserver`: помнит колбэк и узлы, срабатывает по велению теста. */
class ResizeObserverStub {
	readonly observed = new Set<Element>()

	constructor(private readonly _callback: (entries: TEntry[]) => void) {
		observers.push(this)
	}

	observe(element: Element): void {
		this.observed.add(element)
	}

	unobserve(element: Element): void {
		this.observed.delete(element)
	}

	disconnect(): void {
		this.observed.clear()
	}

	trigger(element: Element, inlineSize: number, blockSize: number): void {
		if (this.observed.has(element))
			this._callback([{ target: element, borderBoxSize: [{ inlineSize, blockSize }] }])
	}
}

let observers: ResizeObserverStub[] = []

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	observers = []
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

/** Наблюдатель сообщил размер поля. */
function resize(element: Element, inlineSize: number, blockSize: number): void {
	for (const observer of observers) observer.trigger(element, inlineSize, blockSize)
}

/**
 * Разметка поля: корень и `<textarea>` с метриками темы — интерлиньяж,
 * поля и `box-sizing`. Высоту текста задаёт `lines` — `scrollHeight` поля.
 */
function markup(owner: TTextarea, options: { lineHeight?: string; boxSizing?: string } = {}) {
	const root = document.createElement('div')
	const field = document.createElement('textarea')

	root.className = owner.classes.base
	field.style.lineHeight = options.lineHeight ?? `${LINE}px`
	field.style.padding = `${PADDING / 2}px 8px`
	field.style.boxSizing = options.boxSizing ?? 'border-box'

	let lines = 1

	// Текст с полями, без рамки — как `scrollHeight` у браузера
	Object.defineProperty(field, 'scrollHeight', {
		configurable: true,
		get: () => lines * LINE + PADDING,
	})

	root.append(field)
	document.body.append(root)

	return {
		root,
		field,
		/** Сколько строк занимает текст. */
		setLines: (count: number) => {
			lines = count
		},
	}
}

/** Поле с набором плагинов; узел — по `bind`. */
function assemble(props: Partial<ITextareaProps> = {}) {
	const owner = new TTextarea(props)
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TTextareaAutoresizePlugin)

	bundles.push(bundle)

	/** Корень — плагину узла, как от адаптера; объявляет его кадр. */
	const bind = async (root: Element | null) => {
		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()
	}

	return { owner, bundle, bind }
}

/** Поле на странице с текстом в `lines` строк: узел уже объявлен. */
async function mount(
	props: Partial<ITextareaProps> = {},
	lines = 1,
	options: { lineHeight?: string; boxSizing?: string } = {},
) {
	const assembled = assemble(props)
	const parts = markup(assembled.owner, options)

	parts.setLines(lines)
	await assembled.bind(parts.root)

	return { ...assembled, ...parts }
}

/** Инлайновые стили поля, которые пишет плагин. */
const styles = (field: HTMLTextAreaElement) => ({
	height: field.style.height,
	overflowY: field.style.overflowY,
	resize: field.style.resize,
})

describe('высота по тексту', () => {
	it('ready — сразу: строки текста между rows и maxRows, без прокрутки и ручки', async () => {
		const { field } = await mount({ autoresize: true, rows: 2, maxRows: 5 }, 3)

		expect(styles(field)).toEqual({ height: '70px', overflowY: 'hidden', resize: 'none' })
	})

	it('короткий текст — не ниже rows', async () => {
		const { field } = await mount({ autoresize: true, rows: 2, maxRows: 5 }, 1)

		expect(field.style.height).toBe(`${2 * LINE + PADDING}px`)
	})

	it('на потолке maxRows — высота потолка, прокрутка поля снята с запрета', async () => {
		const { field } = await mount({ autoresize: true, rows: 2, maxRows: 5 }, 8)

		expect(styles(field)).toEqual({
			height: `${5 * LINE + PADDING}px`,
			overflowY: '',
			resize: 'none',
		})
	})

	it('потолок не ниже rows', async () => {
		const { field } = await mount({ autoresize: true, rows: 4, maxRows: 2 }, 8)

		expect(field.style.height).toBe(`${4 * LINE + PADDING}px`)
		expect(field.style.overflowY).toBe('')
	})

	it('maxRows 0 — потолка нет', async () => {
		const { field } = await mount({ autoresize: true, rows: 2 }, 30)

		expect(styles(field)).toEqual({
			height: `${30 * LINE + PADDING}px`,
			overflowY: 'hidden',
			resize: 'none',
		})
	})

	it('content-box: высота — одни строки, без полей', async () => {
		const { field } = await mount({ autoresize: true, rows: 2 }, 3, {
			boxSizing: 'content-box',
		})

		expect(field.style.height).toBe(`${3 * LINE}px`)
	})

	it('интерлиньяж normal — строку даёт браузер: поле без высоты стоит в rows строк', async () => {
		const assembled = assemble({ autoresize: true, rows: 2, maxRows: 3 })
		const { root, field, setLines } = markup(assembled.owner, { lineHeight: 'normal' })

		field.rows = 2
		// Поле без высоты — две строки по LINE и поля
		Object.defineProperty(field, 'clientHeight', {
			configurable: true,
			get: () => 2 * LINE + PADDING,
		})
		setLines(8)
		await assembled.bind(root)

		expect(field.style.height).toBe(`${3 * LINE + PADDING}px`)
	})
})

describe('когда пересчитывает', () => {
	it('ввод пользователя — синхронно, в слушателе input поля', async () => {
		const { field, setLines } = await mount({ autoresize: true, rows: 1 }, 1)

		setLines(4)
		field.dispatchEvent(new Event('input', { bubbles: true }))

		expect(field.style.height).toBe(`${4 * LINE + PADDING}px`)
	})

	it('значение из кода — кадром: фреймворк пишет его в узел позже', async () => {
		const { owner, field, setLines } = await mount({ autoresize: true, rows: 1 }, 1)

		setLines(3)
		owner.value = 'три\nстроки\nтекста'

		expect(field.style.height).toBe(`${LINE + PADDING}px`)

		await nextFrame()

		expect(field.style.height).toBe(`${3 * LINE + PADDING}px`)
	})

	/** Повод, строки текста после него и высота, которую ставит кадр. */
	it.each([
		['rows', { rows: 3 }, 1, 3 * LINE + PADDING],
		['maxRows', { maxRows: 2 }, 6, 2 * LINE + PADDING],
		// Размер меняет поля и кегль через класс; в jsdom метрики те же
		['size', { size: 'lg' }, 6, 6 * LINE + PADDING],
	] as const)('%s — кадром', async (_name, change, lines, height) => {
		const { owner, field, setLines } = await mount({ autoresize: true, rows: 1 }, 1)

		setLines(lines)
		owner.assign(change)

		expect(field.style.height).toBe(`${LINE + PADDING}px`)

		await nextFrame()

		expect(field.style.height).toBe(`${height}px`)
	})

	it('ширина поля — кадром; смена одной высоты — нет: её меняет сам плагин', async () => {
		const { field, setLines } = await mount({ autoresize: true, rows: 1 }, 1)
		const frame = vi.spyOn(globalThis, 'requestAnimationFrame')

		resize(field, 300, 30)
		expect(frame).toHaveBeenCalledTimes(1)

		await nextFrame()
		frame.mockClear()

		// Та же ширина, другая высота — свою же запись плагин не пересчитывает
		resize(field, 300, 70)
		expect(frame).not.toHaveBeenCalled()

		// Поле сузили — текст переносится в больше строк
		setLines(2)
		resize(field, 200, 70)
		expect(frame).toHaveBeenCalledTimes(1)

		frame.mockRestore()
		await nextFrame()

		expect(field.style.height).toBe(`${2 * LINE + PADDING}px`)
	})
})

describe('без автороста', () => {
	it('инлайновых стилей нет — ни при монтировании, ни на смену значения', async () => {
		const { owner, field, setLines } = await mount({ rows: 2 }, 5)

		setLines(7)
		owner.value = 'текст'
		field.dispatchEvent(new Event('input', { bubbles: true }))
		await nextFrame()

		expect(styles(field)).toEqual({ height: '', overflowY: '', resize: '' })
	})

	it('высоту, которую задали ручкой, не трогает', async () => {
		const { owner, field } = await mount({ rows: 2 }, 5)

		field.style.height = '123px'
		owner.value = 'текст'
		await nextFrame()

		expect(field.style.height).toBe('123px')
	})

	it('выключили — кадром снимает height, overflow-y и resize', async () => {
		const { owner, field } = await mount({ autoresize: true, rows: 2 }, 3)

		expect(field.style.height).not.toBe('')

		owner.autoresize = false
		await nextFrame()

		expect(styles(field)).toEqual({ height: '', overflowY: '', resize: '' })
	})

	it('включили — кадром высота по тексту', async () => {
		const { owner, field } = await mount({ rows: 2 }, 3)

		owner.autoresize = true
		await nextFrame()

		expect(styles(field)).toEqual({ height: '70px', overflowY: 'hidden', resize: 'none' })
	})
})

/**
 * Сборка идёт и на сервере, где нет ни узла, ни `requestAnimationFrame`, а
 * значение там меняется. Кадр без узла плагин не планирует: что сменилось до
 * узла, применит `ready`.
 */
describe('без узла', () => {
	it('кадра нет: ни значение, ни строки, ни размер, ни авторост его не планируют', () => {
		const { owner } = assemble({ autoresize: true })
		const frame = vi.spyOn(globalThis, 'requestAnimationFrame')

		owner.value = 'текст'
		owner.rows = 4
		owner.maxRows = 6
		owner.size = 'lg'
		owner.autoresize = false

		expect(frame).not.toHaveBeenCalled()
	})

	it('что сменилось до узла, применяет ready', async () => {
		const { owner, bind } = assemble({ autoresize: true, rows: 1 })
		const { root, field, setLines } = markup(owner)

		owner.rows = 2
		setLines(4)
		await bind(root)

		expect(field.style.height).toBe(`${4 * LINE + PADDING}px`)
	})

	it('корня без поля — ничего не делает', async () => {
		const { bind } = assemble({ autoresize: true })
		const root = document.createElement('div')

		document.body.append(root)

		await expect(bind(root)).resolves.toBeUndefined()
		expect(observers.every((observer) => observer.observed.size === 0)).toBe(true)
	})
})

describe('жизнь подписок', () => {
	it('узел снят — ни ввод, ни ширина поля не пересчитывают', async () => {
		const { field, bind, setLines } = await mount({ autoresize: true, rows: 1 }, 1)

		await bind(null)

		setLines(5)
		field.dispatchEvent(new Event('input', { bubbles: true }))
		resize(field, 100, 30)
		await nextFrame()

		expect(field.style.height).toBe(`${LINE + PADDING}px`)
		expect(observers.every((observer) => observer.observed.size === 0)).toBe(true)
	})

	it('после destroy() набора ни ввод, ни значение не пересчитывают', async () => {
		const { owner, bundle, field, setLines } = await mount({ autoresize: true, rows: 1 }, 1)

		bundle.destroy()

		setLines(5)
		field.dispatchEvent(new Event('input', { bubbles: true }))
		owner.value = 'текст'
		await nextFrame()

		expect(field.style.height).toBe(`${LINE + PADDING}px`)
	})
})
