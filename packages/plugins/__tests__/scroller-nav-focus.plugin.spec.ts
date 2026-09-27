// @vitest-environment jsdom

/**
 * Кнопка листания, выключившаяся у края под фокусом, отдаёт его кнопке
 * напротив (`TScrollerViewportPlugin`, «Фокус у края»).
 *
 * Края сообщает тест — тем же вызовом, каким их сообщает замер плагина
 * (`notifyViewport`): раскладки в jsdom нет. Кнопки за адаптер перерисовывает
 * тоже тест, по правилу ядра (`prevDisabled`, `nextDisabled`). Кнопку,
 * выключенную под фокусом, браузер сбрасывает на страницу, а jsdom — нет,
 * поэтому сброс делает тест. Настоящие клавиатура, прокрутка и перерисовка
 * Vue — `playground/vue/browser/scroller.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TScroller } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TScrollerViewportPlugin } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * `ResizeObserver` в jsdom не реализован, а плагин заводит его на первом
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
	document.body.innerHTML = ''
})

/** Кнопка по селектору; нет её — тест падает здесь, а не на чтении свойства. */
const buttonOf = (scope: ParentNode, selector: string): HTMLButtonElement => {
	const node = scope.querySelector(selector)

	if (!(node instanceof HTMLButtonElement)) throw new Error(`${selector}: кнопки нет`)

	return node
}

/**
 * Лента с кнопками и кнопка снаружи неё. Содержимое по умолчанию — одна
 * кнопка, то есть своя остановка Tab внутри ленты.
 */
async function mount(content = '<button class="item">Первый</button>') {
	document.body.insertAdjacentHTML(
		'beforeend',
		`<div class="s-scroller">
			<button class="s-scroller__prev" disabled>Назад</button>
			<div class="s-scroller__viewport">${content}</div>
			<button class="s-scroller__next" disabled>Вперёд</button>
		</div>
		<button class="elsewhere">Мимо</button>`,
	)

	const root = document.querySelector('.s-scroller')
	const viewport = document.querySelector('.s-scroller__viewport')

	if (!root || !viewport) throw new Error('разметки ленты нет')

	// Фокус внутри ленты плагин доводит `scrollBy`, а jsdom прокрутки не знает
	Object.defineProperty(viewport, 'scrollBy', { value: vi.fn() })

	const owner = new TScroller()
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TScrollerViewportPlugin)
	const element = bundle.get(TElementPlugin)

	if (!element) throw new Error('узла корня нет')

	element.element = root
	// Корень плагин получает кадром позже, а первый замер — ещё кадром позже.
	// Ждём оба: иначе замер сообщил бы свои края поверх заданных тестом
	await nextFrame()
	await nextFrame()

	// Свои кнопки — прямые дети корня: у вложенной ленты классы те же
	const prev = buttonOf(root, ':scope > .s-scroller__prev')
	const next = buttonOf(root, ':scope > .s-scroller__next')

	/**
	 * Перерисовка, как у адаптера: кнопки выключает правило ядра. Кнопку,
	 * выключенную под фокусом, браузер сбрасывает на страницу; `fixup: false` —
	 * фокус остался на выключенной кнопке.
	 *
	 * Сброс — до выключения: с выключенной кнопки jsdom фокус не снимает и
	 * `blur()`.
	 */
	const render = (fixup = true) => {
		for (const [button, disabled] of [
			[prev, owner.prevDisabled],
			[next, owner.nextDisabled],
		] as const) {
			if (fixup && disabled && document.activeElement === button) button.blur()

			button.disabled = disabled
		}
	}

	/**
	 * Замер сообщил края, адаптер перерисовал кнопки. Остановка Tab внутри —
	 * та же, что намерил плагин: у содержимого свои кнопки.
	 */
	const edges = (canPrev: boolean, canNext: boolean, fixup = true) => {
		owner.notifyViewport({ canPrev, canNext, hasTabStops: true })
		render(fixup)
	}

	return { owner, bundle, prev, next, edges, render }
}

describe('кнопка у края отдаёт фокус кнопке напротив', () => {
	/**
	 * Одним замером: край кнопки под фокусом закрылся, а напротив открылся.
	 * Кнопку напротив адаптер включает только перерисовкой — поэтому кадр.
	 */
	it.each([
		{ name: '«вперёд» в конце строки — фокус на «назад»', from: 'next', to: 'prev' },
		{ name: '«назад» в начале строки — фокус на «вперёд»', from: 'prev', to: 'next' },
	] as const)('$name', async ({ from, to }) => {
		const buttons = await mount()
		const atStart = from === 'next'

		buttons.edges(!atStart, atStart)
		buttons[from].focus()
		buttons.edges(atStart, !atStart)

		expect(document.activeElement, 'до кадра — на странице').toBe(document.body)

		await nextFrame()

		expect(document.activeElement).toBe(buttons[to])
	})

	it('фокус остался на выключенной кнопке — тоже уходит напротив', async () => {
		const { prev, next, edges } = await mount()

		edges(false, true)
		next.focus()
		edges(true, false, false)

		await nextFrame()

		expect(document.activeElement).toBe(prev)
	})
})

describe('плагин фокус не трогает', () => {
	it.each([
		{ name: 'фокус на содержимом ленты', selector: '.item' },
		{ name: 'фокус снаружи ленты', selector: '.elsewhere' },
		{ name: 'фокус на кнопке напротив', selector: ':scope > .s-scroller > .s-scroller__prev' },
	])('$name — край закрылся, фокус на месте', async ({ selector }) => {
		const { edges } = await mount()
		const focused = buttonOf(document.body, selector)

		edges(true, true)
		focused.focus()
		edges(true, false)

		await nextFrame()

		expect(document.activeElement).toBe(focused)
	})

	it('за кадр фокус увели на другой элемент — там он и остаётся', async () => {
		const { next, edges } = await mount()
		const elsewhere = buttonOf(document, '.elsewhere')

		edges(true, true)
		next.focus()
		edges(true, false)
		elsewhere.focus()

		await nextFrame()

		expect(document.activeElement).toBe(elsewhere)
	})

	it('destroy() до кадра — фокус остаётся на странице', async () => {
		const { bundle, next, edges } = await mount()

		edges(true, true)
		next.focus()
		edges(true, false)
		bundle.destroy()

		await nextFrame()

		expect(document.activeElement).toBe(document.body)
	})

	/** Край за кадр открылся снова — кнопка жива, и фокус с неё не уводят. */
	it('край открылся снова, фокус на кнопке — остаётся на ней', async () => {
		const { next, edges } = await mount()

		edges(true, true)
		next.focus()
		edges(true, false, false)
		edges(true, true)

		await nextFrame()

		expect(document.activeElement).toBe(next)
	})
})

/** Кнопка напротив выключена — отдать фокус некому. */
describe('отдать фокус некому', () => {
	it('листать стало нечего', async () => {
		const { next, edges } = await mount()

		edges(false, true)
		next.focus()
		edges(false, false)

		await nextFrame()

		expect(document.activeElement).toBe(document.body)
	})

	/**
	 * Выключенность кнопки напротив плагин берёт у ядра, а не у разметки: та
	 * ещё не перерисована, и «назад» в ней пока включена. Фокус на ней
	 * продержался бы до перерисовки и снова упал бы на страницу.
	 */
	it('за кадр выключили всю ленту', async () => {
		const { owner, prev, next, edges } = await mount()

		edges(false, true)
		next.focus()
		edges(true, false)

		owner.disabled = true

		await nextFrame()

		expect(prev.disabled, '«назад» в разметке').toBe(false)
		expect(document.activeElement).toBe(document.body)
	})
})

/**
 * Лента внутри ленты: у вложенной кнопки с теми же классами, и лежат они в
 * нашем вьюпорте. Её кнопки плагин не считает своими — как и нажатия по ним.
 */
describe('вложенная лента', () => {
	const NESTED = `<div class="s-scroller">
		<button class="s-scroller__prev">Назад</button>
		<div class="s-scroller__viewport"></div>
		<button class="s-scroller__next">Вперёд</button>
	</div>`

	it('фокус получает кнопка этой ленты, а не вложенной', async () => {
		const { prev, next, edges } = await mount(NESTED)

		edges(true, false)
		prev.focus()
		edges(false, true)

		await nextFrame()

		expect(document.activeElement).toBe(next)
	})

	it('фокус на кнопке вложенной ленты — край этой ленты его не трогает', async () => {
		const { edges } = await mount(NESTED)
		const nested = buttonOf(document, '.s-scroller__viewport .s-scroller__next')

		edges(true, true)
		nested.focus()
		edges(true, false)

		await nextFrame()

		expect(document.activeElement).toBe(nested)
	})
})
