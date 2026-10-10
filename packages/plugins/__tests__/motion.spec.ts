// @vitest-environment jsdom

/**
 * Режим движения библиотеки в коде (`src/motion/`): `useMotion` пишет его
 * атрибутом на корень документа, а плагины спрашивают его в момент операции.
 *
 * Без атрибута решает система — `prefers-reduced-motion` у окна документа. В
 * jsdom `matchMedia` нет вовсе: система там о движении не просит, а её просьбу
 * тест задаёт заглушкой у окна документа.
 *
 * Плавная прокрутка — движение: листание Scroller и прокрутка ListBox за
 * выбором идут плавно, только пока режим движение не убрал. Начальная
 * прокрутка ListBox к выбранному — сразу при любом режиме: показывать на
 * монтировании нечего. Как тема исполняет режим в CSS, сторожат
 * `themes/oren/__tests__/motion.spec.ts` и
 * `playground/vue/browser/motion-mode.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TListBox, TScroller, createEngineListBox } from '@soldy-ui/core'
import type { TScrollBehavior } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TListScrollPlugin,
	TPluginBundle,
	TScrollerViewportPlugin,
	useMotion,
} from '../src'
import type { IPlugin, IPluginConstructor, TMotionMode } from '../src'
import { smoothScrollBehavior } from '../src/motion'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Окно документа теста — у него и заглушка настройки системы. */
function view(): Window {
	const window = document.defaultView

	if (!window) throw new Error('у документа теста нет окна')

	return window
}

/**
 * Настройка системы: `true` — пользователь просит меньше движения. Отвечает
 * только на медиазапрос движения — так видно, что спрашивают именно его.
 */
function systemReduces(reduce: boolean): void {
	Object.defineProperty(view(), 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			media: query,
			matches: reduce && query.replaceAll(' ', '') === '(prefers-reduced-motion:reduce)',
		}),
	})
}

/**
 * `ResizeObserver` в jsdom не реализован, а плагин ленты заводит его на первом
 * замере. Заглушка молчит: замер здесь ни при чём.
 */
beforeAll(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

afterEach(() => {
	useMotion('system')
	Reflect.deleteProperty(view(), 'matchMedia')
	document.body.innerHTML = ''
})

/** Атрибут режима на корне документа. */
const attribute = () => document.documentElement.getAttribute('data-s-motion')

describe('useMotion', () => {
	it.each<[TMotionMode, string | null]>([
		['full', 'full'],
		['reduce', 'reduce'],
		['system', null],
	])('%s — атрибут корня документа: %s', (mode, expected) => {
		useMotion('reduce')
		useMotion(mode)

		expect(attribute()).toBe(expected)
	})
})

/**
 * Режим сильнее системы в обе стороны, а без режима решает система. Узел —
 * из документа теста, как у плагина: режим читается у документа узла.
 */
describe('плавная прокрутка по режиму', () => {
	const node = () => document.body.appendChild(document.createElement('div'))

	it.each<[string, TMotionMode, boolean, ScrollBehavior]>([
		['режима нет, система не просит', 'system', false, 'smooth'],
		['режима нет, система просит меньше движения', 'system', true, 'instant'],
		['full поверх просьбы системы', 'full', true, 'smooth'],
		['reduce, хотя система не просит', 'reduce', false, 'instant'],
	])('%s — %s', (_name, mode, reduce, expected) => {
		systemReduces(reduce)
		useMotion(mode)

		expect(smoothScrollBehavior(node())).toBe(expected)
	})

	it('без matchMedia система о движении не просит', () => {
		expect(smoothScrollBehavior(node())).toBe('smooth')
	})

	/**
	 * Компонент живёт и в `iframe`: режим — у документа самого узла, а не у
	 * глобального. У документа без окна системы нет, и движение есть.
	 */
	it('режим — документа узла, а не глобального', () => {
		useMotion('reduce')

		const foreign = document.implementation.createHTMLDocument('')

		expect(smoothScrollBehavior(foreign.body.appendChild(foreign.createElement('div')))).toBe(
			'smooth',
		)
	})
})

/** Лента с кнопками, без раскладки: края ей сообщает тест, как замер. */
async function mountScroller() {
	document.body.insertAdjacentHTML(
		'beforeend',
		`<div class="s-scroller">
			<button class="s-scroller__prev">Назад</button>
			<div class="s-scroller__viewport"><span>Первый</span></div>
			<button class="s-scroller__next">Вперёд</button>
		</div>`,
	)

	const root = document.querySelector('.s-scroller')
	const viewport = document.querySelector('.s-scroller__viewport')

	if (!root || !viewport) throw new Error('разметки ленты нет')

	// jsdom прокрутки не знает — вызов листания и есть то, что проверяется
	const scrollBy = vi.fn()

	Object.defineProperty(viewport, 'scrollBy', { value: scrollBy })

	const owner = new TScroller()
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TScrollerViewportPlugin)

	pluginOf(bundle, TElementPlugin).element = root
	// Корень плагин получает кадром позже, а первый замер — ещё кадром позже:
	// иначе замер сообщил бы свои края поверх заданных тестом
	await nextFrame()
	await nextFrame()

	owner.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })

	return { owner, scrollBy }
}

describe('листание Scroller', () => {
	it.each<[string, TMotionMode, boolean, ScrollBehavior]>([
		['по умолчанию — плавно', 'system', false, 'smooth'],
		['система просит меньше движения — сразу', 'system', true, 'instant'],
		['full поверх просьбы системы — плавно', 'full', true, 'smooth'],
		['reduce — сразу', 'reduce', false, 'instant'],
	])('%s', async (_name, mode, reduce, behavior) => {
		const { owner, scrollBy } = await mountScroller()

		systemReduces(reduce)
		useMotion(mode)
		owner.scrollNext()

		expect(scrollBy).toHaveBeenCalledOnce()
		expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior }))
	})
})

/** Что плагин прокрутки получает первым: движок или узел корня. */
type TBindOrder = 'engine-first' | 'root-first'

/**
 * ListBox с выбранным элементом за краем видимой части. Раскладки в jsdom нет
 * — коробки задаёт тест: список высотой 100 px, выбранный `b` и соседний `c`
 * ниже. Движок и узел корня плагин получает в порядке `order`: в жизни движок
 * привязывают при сборке, а узел корня объявляют кадром после монтирования.
 */
async function mountListBox(scrollBehavior: TScrollBehavior, order: TBindOrder = 'engine-first') {
	const owner = new TListBox({ value: 'b', scrollBehavior })
	const engine = createEngineListBox({
		owner,
		items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
	})

	const root = document.body.appendChild(document.createElement('div'))
	const scrollTo = vi.fn()

	root.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 })
	Object.defineProperty(root, 'scrollTo', { value: scrollTo })

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TListScrollPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	engine.extensions.batch.items.forEach((item, index) => {
		const node = root.appendChild(document.createElement('div'))
		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		node.getBoundingClientRect = () =>
			DOMRect.fromRect({ x: 0, y: 300 * index, width: 200, height: 32 })
		bundles.register(itemBundle, item)
		pluginOf(itemBundle, TElementPlugin).element = node
	})

	const bindRoot = async () => {
		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()
	}

	if (order === 'engine-first') {
		bundles.bindEngine(engine)
		await bindRoot()
	} else {
		await bindRoot()
		bundles.bindEngine(engine)
	}

	return { owner, scrollTo }
}

/**
 * Начальная прокрутка — список открывается на выбранном. Она мгновенная и при
 * `smooth`, при любом режиме движения: показывать на монтировании нечего. Ей
 * нужны и движок, и узел корня — срабатывает то, что пришло вторым.
 */
describe('начальная прокрутка ListBox к выбранному', () => {
	it.each<[string, TBindOrder]>([
		['движок, потом узел корня', 'engine-first'],
		['узел корня, потом движок', 'root-first'],
	])('smooth — сразу и при full: %s', async (_name, order) => {
		useMotion('full')

		const { scrollTo } = await mountListBox('smooth', order)

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }))
	})

	it('none — начальной прокрутки нет', async () => {
		const { scrollTo } = await mountListBox('none')

		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})
})

/** Выбор сменился после монтирования — прокрутка к новому выбранному по режиму. */
describe('прокрутка ListBox за выбором', () => {
	it.each<[string, TMotionMode, boolean, ScrollBehavior]>([
		['по умолчанию — плавно', 'system', false, 'smooth'],
		['система просит меньше движения — сразу', 'system', true, 'instant'],
		['full поверх просьбы системы — плавно', 'full', true, 'smooth'],
		['reduce — сразу', 'reduce', false, 'instant'],
	])('smooth: %s', async (_name, mode, reduce, behavior) => {
		const { owner, scrollTo } = await mountListBox('smooth')

		scrollTo.mockClear()
		systemReduces(reduce)
		useMotion(mode)
		owner.value = 'c'
		await nextFrame()

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior }))
	})

	it('instant — сразу при любом режиме', async () => {
		const { owner, scrollTo } = await mountListBox('instant')

		scrollTo.mockClear()
		useMotion('full')
		owner.value = 'c'
		await nextFrame()

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }))
	})
})
