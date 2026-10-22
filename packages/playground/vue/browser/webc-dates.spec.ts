/**
 * Даты Web Components в настоящем браузере: `<div is="so-date-input">`,
 * `<div is="so-calendar">` и `<div is="so-date-picker">` рядом с Vue.
 *
 * jsdom раскладки не считает, а тема видит у дат Web Components те же классы
 * и ту же разметку внутри корня, что у Vue: поле даты каждого размера с
 * частями и кнопкой очистки, сетка месяца с заголовком, кнопками листания и
 * днями, открытая панель выбора месяца и года — карточка у верхнего края
 * календаря, — и открытая панель DatePicker с календарём у поля стоят так же.
 * Рамки сверяются от угла корня компонента: панель DatePicker уехала в `body`,
 * а встаёт у корня. Разметку, наборы и проводку сторожат
 * `ui/webc/__tests__/date-input.spec.ts`, `calendar.spec.ts` и
 * `date-picker.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { useIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { Calendar, DateInput, DatePicker } from '@soldy-ui/vue'
import '@soldy-ui/webc'
import { BOX, measure, type TBox } from './panel-boxes'

import '@soldy-ui/theme-oren'

useIcons(material)

/** Узлы теста — снимаются после каждого. */
const nodes: Element[] = []

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	for (const node of nodes.splice(0)) node.remove()

	cleanup()
})

/** Кадр: корень плагины получают через `requestAnimationFrame`. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Корень компонента теста — у обеих отрисовок свой класс блока. */
const rootOf = (block: string) => () => document.querySelector(`.${block}`)

/** Vue: компонент в блоке, меряется и снимается — следующей отрисовке он не мешает. */
async function measureVue(
	content: () => VNode,
	block: string,
	parts: string,
	act: () => void = () => {},
): Promise<TBox[]> {
	render(defineComponent({ render: () => h('div', { style: BOX }, [content()]) }))
	await nextTick()
	// Действие — когда плагины встали на корень: узел они получают кадром позже
	await nextFrame()
	await nextFrame()
	act()

	const boxes = await measure(rootOf(block), parts)

	cleanup()

	return boxes
}

/** Web Components: разметка в блоке — как её пишет потребитель. */
async function measureWebc(
	html: string,
	block: string,
	parts: string,
	act: () => void = () => {},
	prepare: (root: HTMLElement) => void = () => {},
): Promise<TBox[]> {
	const root = document.createElement('div')

	root.style.cssText = BOX
	root.innerHTML = html
	prepare(root)
	document.body.appendChild(root)
	nodes.push(root)
	await nextFrame()
	await nextFrame()
	act()

	return measure(rootOf(block), parts)
}

/** Нажать по заголовку месяца — так открывается панель выбора месяца и года. */
function openPicker(): void {
	const title = document.querySelector('.so-calendar__title')

	if (!(title instanceof HTMLElement)) throw new Error('заголовка месяца нет')

	title.click()
}

/** Части поля даты: ряд, части, разделители и кнопка очистки. */
const DATE_INPUT_PARTS =
	'.so-date-input__segments, .so-date-input__segment, .so-date-input__literal, .so-date-input__trailing, .so-date-input__clear'

describe.each(COMPONENT_SIZES)('DateInput, размер %s — как у Vue', (scale) => {
	it('корень, ряд, части и кнопка очистки', async () => {
		const vue = await measureVue(
			() => h(DateInput, { size: scale, value: '2026-05-12', clearable: true }),
			'so-date-input',
			DATE_INPUT_PARTS,
		)
		const webc = await measureWebc(
			`<div is="so-date-input" size="${scale}" value="2026-05-12" clearable></div>`,
			'so-date-input',
			DATE_INPUT_PARTS,
		)

		// Корень, ряд, три части, два разделителя, обёртка у конца и кнопка
		expect(webc).toHaveLength(9)
		expect(webc[0]?.width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})

/** Части календаря: ряд месяцев, месяц, заголовок, кнопки листания, сетка, дни недели и дни. */
const CALENDAR_PARTS =
	'.so-calendar__months, .so-calendar__month, .so-calendar__heading, .so-calendar__title, .so-calendar__prev, .so-calendar__next, .so-calendar__grid, .so-calendar__weekday, .so-calendar-item, .so-calendar__filler'

/** Части открытой панели выбора месяца и года: подложка, карточка, список, плитки и шапка. */
const PICKER_PARTS =
	'.so-popover__panel, .so-calendar__picker, .so-calendar__picker-list, .so-calendar__picker-list .so-list-box-item, .so-calendar__picker-header, .so-calendar__picker-heading, .so-calendar__picker-prev, .so-calendar__picker-next'

describe('Calendar — как у Vue', () => {
	it('сетка месяца: заголовок, кнопки листания, дни недели и дни', async () => {
		const vue = await measureVue(
			() => h(Calendar, { months: ['2026-09-01'] }),
			'so-calendar',
			CALENDAR_PARTS,
		)
		const webc = await measureWebc(
			`<div is="so-calendar" months='["2026-09-01"]'></div>`,
			'so-calendar',
			CALENDAR_PARTS,
		)

		// Сентябрь 2026 с воскресенья: 30 дней и 5 заполнителей
		expect(webc.filter((box) => box.width > 0).length).toBeGreaterThan(40)
		expect(webc).toEqual(vue)
	})

	it('два месяца в ряд — сетки и пара кнопок у первого', async () => {
		const months = ['2026-09-01', '2026-10-01']
		const vue = await measureVue(() => h(Calendar, { months }), 'so-calendar', CALENDAR_PARTS)
		const webc = await measureWebc(
			`<div is="so-calendar" months='${JSON.stringify(months)}'></div>`,
			'so-calendar',
			CALENDAR_PARTS,
		)

		expect(webc).toEqual(vue)
	})

	it('открытая панель выбора месяца и года — карточка у верхнего края календаря', async () => {
		const vue = await measureVue(
			() => h(Calendar, { months: ['2026-09-01'] }),
			'so-calendar',
			PICKER_PARTS,
			openPicker,
		)
		const webc = await measureWebc(
			`<div is="so-calendar" months='["2026-09-01"]'></div>`,
			'so-calendar',
			PICKER_PARTS,
			openPicker,
		)

		// Корень, подложка, карточка, список, 12 плиток, шапка, год и две стрелки
		expect(webc).toHaveLength(20)
		expect(webc[2]?.height).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})

/** Части DatePicker одной даты: поле, кнопки, открытая панель и календарь в ней. */
const DATE_PICKER_PARTS =
	'.so-date-picker__field, .so-date-picker__clear, .so-date-picker__trigger, .so-date-picker__panel, .so-date-picker__content, .so-date-picker__calendar, .so-date-picker__panel .so-calendar__title, .so-date-picker__panel .so-calendar__prev, .so-date-picker__panel .so-calendar__grid, .so-date-picker__panel .so-calendar-item'

/** Части диапазона: поля концов, тире и кнопки — в коробке корня. */
const RANGE_PARTS =
	'.so-date-picker__start, .so-date-picker__dash, .so-date-picker__end, .so-date-picker__clear, .so-date-picker__trigger'

/** Подвал подтверждения в открытой панели. */
const FOOTER_PARTS =
	'.so-date-picker__panel, .so-calendar__footer, .so-date-picker__cancel, .so-date-picker__confirm'

describe('DatePicker — как у Vue', () => {
	it('одна дата: открытая панель с календарём встаёт у поля', async () => {
		const vue = await measureVue(
			() =>
				h(DatePicker, {
					open: true,
					clearable: true,
					value: '2026-09-10',
					aria_label: 'Дата',
				}),
			'so-date-picker',
			DATE_PICKER_PARTS,
		)
		const webc = await measureWebc(
			'<div is="so-date-picker" open clearable value="2026-09-10" aria_label="Дата"></div>',
			'so-date-picker',
			DATE_PICKER_PARTS,
		)

		expect(webc.filter((box) => box.width > 0).length).toBeGreaterThan(30)
		expect(webc).toEqual(vue)
	})

	/**
	 * Значение диапазона — свойством: тип `value` — строка или пара, и атрибут
	 * строку принимает первым — дату, а не пару.
	 */
	it('диапазон: поля концов, тире и кнопки — в коробке корня', async () => {
		const vue = await measureVue(
			() =>
				h(DatePicker, {
					mode: 'range',
					clearable: true,
					value: ['2026-09-10', '2026-09-14'],
					aria_label: 'Поездка',
				}),
			'so-date-picker',
			RANGE_PARTS,
		)
		const webc = await measureWebc(
			'<div is="so-date-picker" mode="range" clearable aria_label="Поездка"></div>',
			'so-date-picker',
			RANGE_PARTS,
			() => {},
			(root) => {
				const picker = root.firstElementChild

				if (picker) Reflect.set(picker, 'value', ['2026-09-10', '2026-09-14'])
			},
		)

		// Корень, два поля, тире и две кнопки
		expect(webc).toHaveLength(6)
		expect(webc).toEqual(vue)
	})

	it('подвал подтверждения — «Отмена» и «OK» под сетками', async () => {
		const vue = await measureVue(
			() => h(DatePicker, { open: true, confirmable: true, value: '2026-09-10' }),
			'so-date-picker',
			FOOTER_PARTS,
		)
		const webc = await measureWebc(
			'<div is="so-date-picker" open confirmable value="2026-09-10"></div>',
			'so-date-picker',
			FOOTER_PARTS,
		)

		// Корень, панель, подвал и две кнопки
		expect(webc).toHaveLength(5)
		expect(webc).toEqual(vue)
	})
})
