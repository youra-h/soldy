/**
 * DatePicker в настоящем браузере: фокус панели, клавиши и раскладка.
 *
 * Порядок Tab, перенос фокуса нажатием мыши и раскладку jsdom не считает.
 * Модель проверяет ядро, переходы, которые делает сам плагин фокуса, — тест
 * плагинов (`plugins/__tests__/date-picker.plugin.spec.ts`), проводку —
 * `ui/vue/__tests__/date-picker.spec.ts`. Здесь — что они складываются с
 * браузером: фокус уходит на день сетки, Tab ходит по кругу в панели,
 * нажатие в соседнее поле отдаёт ему фокус с первого раза, а клавиши
 * календаря и поля — те же, что у них самих. Раскладка: коробка диапазона не
 * меняет ширину, пока даты набирают, а панель у правого края окна не
 * сжимается.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { TDatePicker } from '@soldy-ui/core'
import type { IDatePickerProps } from '@soldy-ui/core'
import { DatePicker } from '@soldy-ui/vue'

import { expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * DatePicker между текстом и полем страницы — чтобы было куда нажать мимо.
 * Узел корня плагины получают кадром позже.
 */
const show = async (
	props: Partial<IDatePickerProps> = {},
	style = 'padding: 16px',
): Promise<TDatePicker> => {
	const ctrl = new TDatePicker(props)

	render(
		defineComponent({
			render: () =>
				h('div', { class: 's-host', style }, [
					h(DatePicker, { ctrl, aria_label: 'Дата заезда' }),
					h('input', { class: 's-test-after', 'aria-label': 'После' }),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	return ctrl
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Ячейка дня по его имени — полной дате, как её прочтёт скринридер. */
const day = (date: string): HTMLElement => {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)

	return find(`.s-calendar-item[aria-label="${label}"]`)
}

const root = () => find('.s-date-picker')
const trigger = () => find('.s-date-picker__trigger')
const panel = () => find('.s-date-picker__panel')
const isOpen = () => getComputedStyle(panel()).display !== 'none'
const active = () => document.activeElement
const segment = (type: string, scope = '.s-date-picker') =>
	find(`${scope} .s-date-input__segment[data-type="${type}"]`)

const tab = () => userEvent.keyboard('{Tab}')
const shiftTab = () => userEvent.keyboard('{Shift>}{Tab}{/Shift}')

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('открытие', () => {
	it('кнопка открывает панель под полем, фокус — на выбранном дне', async () => {
		await show({ value: '2026-05-12' })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		const anchor = root().getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(isOpen()).toBe(true)
		expect(Math.round(box.top - anchor.bottom)).toBe(4)
		expect(Math.round(box.left)).toBe(Math.round(anchor.left))
	})

	it('Alt+↓ на поле открывает панель с фокусом на дне', async () => {
		await show({ value: '2026-05-12' })

		await userEvent.click(segment('month'))
		await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')

		await expect.poll(active).toBe(day('2026-05-12'))
	})

	it('ввод в поле панель не открывает', async () => {
		await show()

		await userEvent.click(segment('month'))
		await userEvent.keyboard('05')

		expect(isOpen()).toBe(false)
	})
})

describe('закрытие', () => {
	it('Enter выбирает день и закрывает панель, фокус — туда, откуда открыли', async () => {
		const ctrl = await show({ value: '2026-05-12' })

		await userEvent.click(segment('month'))
		await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
		await expect.poll(active).toBe(day('2026-05-12'))

		await userEvent.keyboard('{ArrowRight}{Enter}')

		await expect.poll(isOpen).toBe(false)
		expect(ctrl.value).toBe('2026-05-13')
		expect(segment('day').textContent).toBe('13')
		await expect.poll(active).toBe(segment('month'))
	})

	it('Escape закрывает и возвращает фокус на кнопку', async () => {
		await show({ value: '2026-05-12' })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		await expect.poll(active).toBe(trigger())
	})

	it('нажатие в соседнее поле закрывает панель и фокусирует поле с первого раза', async () => {
		await show({ value: '2026-05-12' })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		await userEvent.click(find('.s-test-after'))

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(find('.s-test-after'))
	})
})

describe('Tab в панели', () => {
	it('ходит по кругу: с дня — на «назад», с «назад» обратно — на день', async () => {
		await show({ value: '2026-05-12' })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		await tab()
		expect(active()).toBe(find('.s-calendar__prev'))

		await tab()
		expect(active()).toBe(find('.s-calendar__next'))

		await shiftTab()
		await shiftTab()
		expect(active()).toBe(day('2026-05-12'))
		expect(isOpen()).toBe(true)
	})
})

describe('диапазон', () => {
	it('панель открыта до второго дня; первый Escape снимает якорь, второй закрывает', async () => {
		const ctrl = await show({ mode: 'range', value: ['2026-05-12', '2026-05-12'] })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		await userEvent.keyboard('{Enter}')

		expect(ctrl.engine.extensions.selection.anchor).toBe('2026-05-12')
		expect(isOpen()).toBe(true)

		await userEvent.keyboard('{Escape}')

		expect(ctrl.engine.extensions.selection.anchor).toBeUndefined()
		expect(isOpen()).toBe(true)

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
	})

	it('второй день пишет пару в поля и закрывает панель', async () => {
		const ctrl = await show({ mode: 'range', value: ['2026-05-12', '2026-05-12'] })

		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		await userEvent.keyboard('{Enter}{ArrowRight}{ArrowRight}{Enter}')

		await expect.poll(isOpen).toBe(false)
		expect(ctrl.value).toEqual(['2026-05-12', '2026-05-14'])
		expect(segment('day', '.s-date-picker__end').textContent).toBe('14')
	})

	/**
	 * Ширина коробки диапазона. Раскладка субпиксельная, поэтому сверка — с
	 * допуском в долю пикселя; рост, который сторожится, крупнее — без минимума
	 * ряда поля начала коробка прыгала на 5–32 px между подсказкой и датой.
	 */
	it('коробка не меняет ширину, пока даты набирают', async () => {
		await show({ mode: 'range' })

		const width = () => root().getBoundingClientRect().width
		const empty = width()

		await userEvent.click(segment('month', '.s-date-picker__start'))

		for (const key of '05122026') {
			await userEvent.keyboard(key)
			await nextTick()
			expect(width(), `начало, после «${key}»`).toBeCloseTo(empty, 0)
		}

		await userEvent.click(segment('month', '.s-date-picker__end'))

		for (const key of '05202026') {
			await userEvent.keyboard(key)
			await nextTick()
			expect(width(), `конец, после «${key}»`).toBeCloseTo(empty, 0)
		}
	})
})

describe('панель у края окна', () => {
	it('у правого края панель в окне и не сжата', async () => {
		await show({ value: '2026-05-12' })
		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		const natural = panel().getBoundingClientRect().width

		cleanup()

		await show({ value: '2026-05-12' }, 'display: flex; flex-direction: row-reverse')
		await userEvent.click(trigger())
		await expect.poll(active).toBe(day('2026-05-12'))

		expectInsideWindow(panel(), 'панель')
		expect(panel().getBoundingClientRect().width).toBeCloseTo(natural, 0)
	})
})
