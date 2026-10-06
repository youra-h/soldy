/**
 * Жест панелей у поля в настоящем браузере: Select и DatePicker — смахнуть
 * панель, чтобы закрыть.
 *
 * Правила жеста — порог, путь, скорость, сопротивление — проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`) на разметке, которую строит сам,
 * а jsdom ни раскладки, ни захвата указателя не выполняет. Здесь — что из
 * разметки и темы выходит на экране, по образцу поповера у триггера
 * (`popover-swipe.spec.ts`): полоса у края со стороны поля и не накрывает
 * содержимое, `touch-action` на панели, настоящая мышь закрывает панель от
 * поля — вниз под ним, вверх над ним, — а к полю возвращает её на место, и
 * смахнутая уходит дальше от поля, пока гаснет.
 *
 * Своё у каждого: у Select фокус всё время на поле, и нажатие на полосу его
 * не уводит; у DatePicker закрытие жестом возвращает фокус туда, откуда
 * открыли, как Escape, а прокручивается содержимое панели, и из него жест за
 * всю панель не начинается.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type Ref, type VNode } from 'vue'
import { DatePicker, Select, SelectItem } from '@soldy-ui/vue'
import type { TSwipe } from '@soldy-ui/core'

import { settled, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

/** Зона захвата полосы жеста — не меньше 24px: минимум цели по WCAG 2.5.8. */
const GRIP_ZONE = 24

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const active = () => document.activeElement

type TShowOptions = {
	/** За что тянуть; не задан — жеста нет */
	swipe?: TSwipe
	/** Панель над полем: снизу места мало */
	above?: boolean
}

/** Компонент с панелью у поля — всё, что общим проверкам нужно о нём знать. */
type TCase = {
	readonly name: string
	/** Страница с компонентом на `v-model:open` */
	readonly show: (options?: TShowOptions) => Promise<{ opened: Ref<boolean> }>
	/** Открыть, как пользователь, и дождаться, пока панель встанет на место */
	readonly open: () => Promise<void>
	readonly panel: string
	readonly handle: string
	/** Содержимое панели, которое полоса не накрывает */
	readonly content: string
}

/**
 * Страница: компонент в обёртке с отступом сверху. У Select панель над полем
 * ставит `placement: 'top'`, у DatePicker стороны на выбор нет — поле стоит у
 * низа окна, и flip ставит её над ним сам.
 */
const mountPage = async (top: number, scene: () => VNode): Promise<void> => {
	render(
		defineComponent({
			render: () =>
				h('div', { style: `padding: ${top}px 40px 40px; width: 320px` }, [scene()]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Модель открытости — как `v-model:open` у потребителя. */
const openModel = () => {
	const opened = ref(false)

	return {
		opened,
		bind: () => ({
			open: opened.value,
			'onUpdate:open': (value: boolean) => {
				opened.value = value
			},
		}),
	}
}

const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань']

const SELECT: TCase = {
	name: 'Select',
	async show({ swipe, above = false } = {}) {
		const { opened, bind } = openModel()

		await mountPage(above ? 400 : 40, () =>
			h(Select, { swipe, placement: above ? 'top' : 'auto', ...bind() }, () =>
				CITIES.map((text, index) =>
					h(SelectItem, { key: text, value: String(index), text }),
				),
			),
		)

		return { opened }
	},
	async open() {
		await userEvent.click(find('.s-select__field input'))
		await expect.poll(() => find('.s-select__panel').dataset.open).toBe('true')
		await settled(find('.s-select__panel'))
	},
	panel: '.s-select__panel',
	handle: '.s-select__handle',
	content: '.s-select__list',
}

const DATE_PICKER: TCase = {
	name: 'DatePicker',
	async show({ swipe, above = false } = {}) {
		const { opened, bind } = openModel()

		await mountPage(above ? 560 : 40, () =>
			h(DatePicker, { swipe, value: '2026-05-12', aria_label: 'Дата', ...bind() }),
		)

		return { opened }
	},
	async open() {
		await userEvent.click(find('.s-date-picker__trigger'))
		// Фокус уходит на день сетки кадром позже — панель уже на месте
		await expect.poll(() => active()?.classList.contains('s-calendar-item')).toBe(true)
		await settled(find('.s-date-picker__panel'))
	},
	panel: '.s-date-picker__panel',
	handle: '.s-date-picker__handle',
	content: '.s-date-picker__content',
}

/** Протянуть мышью от середины узла на `dy` по вертикали — настоящими событиями, по шагам. */
const drag = (from: HTMLElement, dy: number, steps = 10) => {
	const box = from.getBoundingClientRect()
	const x = box.width / 2
	const y = box.height / 2

	// `force`: точка отпускания — за пределами узла, и проверка попадания
	// Playwright ждала бы, пока узел окажется под ней
	return userEvent.dragAndDrop(from, from, {
		sourcePosition: { x, y },
		targetPosition: { x, y: y + dy },
		steps,
		force: true,
	})
}

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
})

describe.each([SELECT, DATE_PICKER])('$name', ({ show, open, ...selectors }) => {
	const panel = () => find(selectors.panel)
	const handle = () => find(selectors.handle)
	const isOpen = () => getComputedStyle(panel()).display !== 'none'

	describe('полоса', () => {
		it('без жеста полосы нет и сдвига у панели нет: translate не делает её контейнером', async () => {
			await show()
			await open()

			expect(document.querySelector(selectors.handle)).toBeNull()
			expect(getComputedStyle(panel()).translate).toBe('none')
		})

		it('под полем — у верхнего края панели, зона захвата не меньше 24px, во всю ширину', async () => {
			await show({ swipe: 'handle' })
			await open()

			const grip = handle().getBoundingClientRect()
			const box = panel().getBoundingClientRect()

			expect(panel().dataset.placement).toBe('bottom-start')
			expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
			expect(Math.abs(grip.top - box.top)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.width - box.width)).toBeLessThanOrEqual(EPSILON)
		})

		it('над полем — у нижнего края панели', async () => {
			await show({ swipe: 'handle', above: true })
			await open()

			const grip = handle().getBoundingClientRect()
			const box = panel().getBoundingClientRect()

			expect(panel().dataset.placement).toBe('top-start')
			expect(Math.abs(grip.bottom - box.bottom)).toBeLessThanOrEqual(EPSILON)
		})

		it('содержимое полоса не накрывает — ни под полем, ни над ним', async () => {
			await show({ swipe: 'handle' })
			await open()

			expect(find(selectors.content).getBoundingClientRect().top).toBeGreaterThanOrEqual(
				handle().getBoundingClientRect().bottom - EPSILON,
			)

			cleanup()

			await show({ swipe: 'handle', above: true })
			await open()

			expect(find(selectors.content).getBoundingClientRect().bottom).toBeLessThanOrEqual(
				handle().getBoundingClientRect().top + EPSILON,
			)
		})

		it('пока жест включён, касание по вертикали — жесту: touch-action на панели', async () => {
			await show({ swipe: 'handle' })
			await open()

			expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
		})
	})

	describe('жест', () => {
		it('под полем смахнули вниз — закрыта, v-model видит закрытие', async () => {
			const { opened } = await show({ swipe: 'handle' })

			await open()
			await drag(handle(), 150)

			await expect.poll(isOpen).toBe(false)
			expect(opened.value).toBe(false)
		})

		it('над полем — вверх', async () => {
			const { opened } = await show({ swipe: 'handle', above: true })

			await open()
			await drag(handle(), -150)

			await expect.poll(isOpen).toBe(false)
			expect(opened.value).toBe(false)
		})

		it('к полю — не закрытие: панель возвращается на место', async () => {
			const { opened } = await show({ swipe: 'handle' })

			await open()

			const top = panel().getBoundingClientRect().top

			await drag(handle(), -150)

			// Сдвиг уходит кадром позже, и панель едет на место переходом
			await expect
				.poll(() => Math.abs(panel().getBoundingClientRect().top - top) < EPSILON)
				.toBe(true)

			expect(isOpen()).toBe(true)
			expect(opened.value).toBe(true)
			expect(panel().style.getPropertyValue('--s-swipe-offset')).toBe('')
		})
	})

	/**
	 * Смахнутая панель не моргает: плагин сдвиг на закрытии не снимает, а тема
	 * уводит закрытую панель дальше от поля, как поповер у триггера, — уход
	 * начинается с места, где её отпустили, и идёт дальше, пока панель гаснет.
	 * Обе панели выше пути жеста, и до своей высоты закрытой есть куда ехать:
	 * встань она там, где её отпустили, — уход не сработал.
	 */
	it('уход смахнутой панели — от места, где отпустили, дальше от поля, гаснет на ходу', async () => {
		await show({ swipe: 'handle' })
		await open()

		const start = panel().getBoundingClientRect().top

		await drag(handle(), 150)

		const positions: number[] = []
		const seen = await whileLeaving(panel(), () => {
			positions.push(panel().getBoundingClientRect().top)
		})

		expect(seen).toBeGreaterThan(1)
		expect(positions[0]).toBeGreaterThan(start + EPSILON)
		expect(positions[positions.length - 1]).toBeGreaterThan(positions[0] + EPSILON)

		for (let index = 1; index < positions.length; index += 1) {
			expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(-EPSILON)
		}
	})
})

describe('Select', () => {
	const field = () => find('.s-select__field input')

	it('нажатие на полосу фокус с поля не уводит и панель не закрывает', async () => {
		await SELECT.show({ swipe: 'handle' })
		await SELECT.open()

		expect(active()).toBe(field())

		await userEvent.click(find('.s-select__handle'))

		expect(active()).toBe(field())
		expect(getComputedStyle(find('.s-select__panel')).display).not.toBe('none')
	})

	it('смахнутая панель оставляет фокус на поле', async () => {
		await SELECT.show({ swipe: 'handle' })
		await SELECT.open()
		await drag(find('.s-select__handle'), 150)

		await expect.poll(() => find('.s-select__panel').dataset.open).toBe('false')
		expect(active()).toBe(field())
	})
})

describe('DatePicker', () => {
	const panel = () => find('.s-date-picker__panel')
	const content = () => find('.s-date-picker__content')
	const isOpen = () => getComputedStyle(panel()).display !== 'none'

	it('после закрытия жестом фокус возвращается на кнопку, как после Escape', async () => {
		await DATE_PICKER.show({ swipe: 'handle' })
		await DATE_PICKER.open()
		await drag(find('.s-date-picker__handle'), 150)

		await expect.poll(isOpen).toBe(false)
		await expect.poll(active).toBe(find('.s-date-picker__trigger'))
	})

	it('за всю панель — тянут за место без контролов: шапку дней недели', async () => {
		const { opened } = await DATE_PICKER.show({ swipe: 'panel' })

		await DATE_PICKER.open()
		await drag(find('.s-calendar__weekday'), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
	})

	/**
	 * В низком окне календарь выше панели. Прокручивается содержимое, а не
	 * панель: плагин жеста отдаёт касание вдоль оси панели жесту, и
	 * прокручиваемую саму панель палец бы не прокрутил, а у содержимого
	 * прокрутка своя. Из неё жест за всю панель не начинается — она
	 * прокручивается сама.
	 */
	it('прокручивается содержимое, а не панель, и из него жест не начинается', async () => {
		await page.viewport(1000, 300)

		const { opened } = await DATE_PICKER.show({ swipe: 'panel' })

		await DATE_PICKER.open()

		expect(getComputedStyle(panel()).overflowY).toBe('hidden')
		expect(panel().scrollHeight).toBeLessThanOrEqual(panel().clientHeight)
		expect(getComputedStyle(content()).overflowY).toBe('auto')
		expect(content().scrollHeight).toBeGreaterThan(content().clientHeight)
		expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
		expect(getComputedStyle(content()).touchAction).toBe('auto')

		// Дальше четверти высоты панели: начнись жест — панель закрылась бы. И в
		// пределах окна: ниже его края указатель странице уже не попадает
		await drag(find('.s-calendar__weekday'), 100)
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(opened.value).toBe(true)
		expect(panel().dataset.swiping).toBe('false')
		expect(panel().style.getPropertyValue('--s-swipe-offset')).toBe('')
	})
})
