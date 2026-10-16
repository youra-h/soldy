/**
 * Пагинация в настоящем браузере — раскладка, цвет и фокус.
 *
 * Здесь то, чего jsdom не считает вовсе. Раскладка: номер в одну и две цифры
 * стоит квадратом клетки на каждом размере, а номер длиннее и текст растут с
 * тем же полем; высота у страниц, стрелок и пропуска одна — клетка темы
 * (`themes/oren/src/components/pagination/_pagination.scss`). Цвет: текущая
 * страница в режиме принудительных цветов — системная подсветка, и у
 * выключенной тоже. Фокус: каждая стрелка и каждая страница — своя остановка
 * Tab, а нажатая с клавиатуры страница остаётся тем же узлом под фокусом,
 * хотя окно сдвинулось. Модель проверяет ядро, проводку —
 * `ui/vue/__tests__/pagination.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Pagination } from '@soldy-ui/vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find, pixel, settled, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Схемы темы: палитру режима принудительных цветов выбирает браузер, но проверяем обе. */
const SCHEMES = ['oren', 'oren-dark'] as const

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const tab = () => userEvent.keyboard('{Tab}')

/**
 * Пагинация между двумя кнопками — чтобы было откуда войти по Tab и куда
 * уйти. Узел корня плагины получают кадром позже.
 */
const show = async (props: Record<string, unknown>) => {
	render(
		defineComponent({
			render: () =>
				h('div', { class: 'so-host', style: 'padding: 40px' }, [
					h('button', { class: 'so-test-before' }, 'До'),
					h(Pagination, { aria_label: 'Страницы', ...props }),
					h('button', { class: 'so-test-after' }, 'После'),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
}

const findAll = (selector: string): HTMLElement[] =>
	[...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/** Кнопки страниц по порядку окна. */
const pages = () => findAll('.so-pagination-item > .so-button')

/** Кнопка страницы по её тексту. */
const page = (text: string): HTMLElement => {
	const found = pages().find((button) => button.textContent?.trim() === text)

	if (!found) throw new Error(`страницы «${text}» нет`)

	return found
}

const rect = (element: Element) => element.getBoundingClientRect()

/** Текст элемента под фокусом — как его увидит пользователь. */
const focused = () =>
	document.activeElement?.textContent?.trim() || document.activeElement?.className

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(async () => {
	cleanup()
	await forcedColors('none')
})

describe('клетка', () => {
	/**
	 * Номер в одну и две цифры — квадрат клетки: поле страницы — остаток
	 * клетки от двух цифр, а цифры одной ширины (`tabular-nums`). Стрелки — тот
	 * же квадрат, пропуск — клетка той же ширины.
	 */
	it.each(COMPONENT_SIZES)('%s: номер в 1–2 цифры — квадрат, высоты равны', async (size) => {
		await show({ size, total: 990, value: 50 })

		const numbers = pages().map((button) => button.textContent?.trim())

		expect(numbers).toEqual(['1', '49', '50', '51', '99'])

		const cell = rect(page('1')).height

		for (const button of pages()) {
			expect(rect(button).width, button.textContent ?? '').toBeCloseTo(cell, 0)
			expect(Math.abs(rect(button).height - cell)).toBeLessThan(EPSILON)
		}

		for (const part of [
			find('.so-pagination__prev'),
			find('.so-pagination__next'),
			...findAll('.so-pagination__ellipsis'),
		]) {
			expect(Math.abs(rect(part).width - cell), part.className).toBeLessThan(EPSILON)
			expect(Math.abs(rect(part).height - cell), part.className).toBeLessThan(EPSILON)
		}
	})

	it('номер длиннее двух цифр и текст — шире клетки, той же высоты, в одну строку', async () => {
		await show({ total: 123_450, value: 12_345 })

		const cell = rect(page('1')).height
		const long = page(new Intl.NumberFormat('en-US').format(12_345))

		expect(rect(long).width).toBeGreaterThan(cell + EPSILON)
		expect(Math.abs(rect(long).height - cell)).toBeLessThan(EPSILON)

		cleanup()

		await show({
			pages: ['Админ', 'Записи', 'Конференция'].map((text) => ({ text })),
			value: 2,
		})

		const text = page('Конференция')

		expect(rect(text).width).toBeGreaterThan(cell + EPSILON)
		expect(Math.abs(rect(text).height - cell)).toBeLessThan(EPSILON)
	})

	it('ряд — одна строка: все клетки на одной высоте', async () => {
		await show({ total: 990, value: 50, middleCount: 7 })

		const tops = [
			find('.so-pagination__prev'),
			...findAll('.so-pagination__list > li'),
			find('.so-pagination__next'),
		].map((part) => Math.round(rect(part).top))

		expect(new Set(tops).size).toBe(1)
	})
})

describe('фокус', () => {
	it('каждая стрелка и каждая страница — своя остановка Tab', async () => {
		await show({ total: 100, value: 5 })

		find('.so-test-before').focus()

		const stops: unknown[] = []

		for (let step = 0; step < 8; step++) {
			await tab()
			stops.push(focused())
		}

		expect(stops).toEqual([
			expect.stringContaining('so-pagination__prev'),
			'1',
			'4',
			'5',
			'6',
			'10',
			expect.stringContaining('so-pagination__next'),
			'После',
		])
	})

	/**
	 * Окно сдвигается вокруг нажатой страницы, а она остаётся тем же
	 * экземпляром и тем же узлом: фокус с неё не слетает, и следующий Tab идёт
	 * от неё.
	 */
	it('Enter на странице: она текущая, тот же узел и под фокусом', async () => {
		await show({ total: 100, value: 5 })

		const six = page('6')

		six.focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(() => six.getAttribute('aria-current')).toBe('page')
		expect(pages().map((button) => button.textContent?.trim())).toEqual([
			'1',
			'5',
			'6',
			'7',
			'10',
		])
		expect(page('6')).toBe(six)
		expect(six.isConnected).toBe(true)
		expect(document.activeElement).toBe(six)

		await tab()

		expect(focused()).toBe('7')
	})

	it('Enter на стрелке листает, и фокус остаётся на ней', async () => {
		await show({ total: 100, value: 5 })

		const next = find('.so-pagination__next')

		next.focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(() => page('6').getAttribute('aria-current')).toBe('page')
		expect(document.activeElement).toBe(next)
	})
})

/**
 * Принудительные цвета (высокий контраст Windows): заливку текущей браузер
 * заменил бы цветом поверхности, и она стала бы как соседи. Текущую красит
 * системная подсветка — фон `Highlight`, текст `HighlightText`, как выбранную
 * строку списка, — и у выключенной пагинации тоже.
 */
describe('текущая в режиме принудительных цветов', () => {
	const expectHighlight = (element: Element): void => {
		const look = style(element)

		expect(pixel([look.backgroundColor]), 'фон').toEqual(pixel([systemColor('Highlight')]))
		expect(pixel([look.color]), 'текст').toEqual(pixel([systemColor('HighlightText')]))
	}

	it.each(SCHEMES)('%s: системная подсветка, у соседей — нет', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.soTheme = scheme
		await show({ total: 100, value: 5 })

		const current = page('5')

		await settled(current)

		expectHighlight(current)
		expect(pixel([style(page('4')).backgroundColor])).not.toEqual(
			pixel([systemColor('Highlight')]),
		)
	})

	it.each(SCHEMES)('%s: выключенная — подсветка остаётся', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.soTheme = scheme
		await show({ total: 100, value: 5, disabled: true })

		const current = page('5')

		await settled(current)

		expectHighlight(current)
	})
})
