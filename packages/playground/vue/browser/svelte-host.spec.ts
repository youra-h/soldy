/**
 * Хост Svelte на странице стенда в настоящем браузере — раскладка, которой
 * jsdom не считает.
 *
 * Разметка Svelte написана по разметке Vue, и тема у них одна, но разойтись
 * они могут молча: пробел между соседними узлами Svelte оставляет текстом, а
 * Vue его вырезает, и вне флекса и сетки такой пробел сдвинул бы части.
 * Поэтому компонент Svelte стоит в ячейке так же, как компонент хоста Vue, —
 * то же место и тот же размер. У превью с обёрткой и содержимым так же стоят
 * и обёртка, и части: подпись вокруг контрола, элементы коллекций, теги,
 * поле Select с обёртками и стрелкой, панель активного таба, ручки и заливка
 * ползунка, звёзды оценки, кнопки и вьюпорт ленты, страницы и стрелки
 * пагинации, части и разделители поля даты, заголовок, кнопки листания,
 * подписи недели и дни календаря, — а у таблицы её окно, корень, заголовки и
 * строки; у окна Virtual — его ряд: список, Select и таблица.
 *
 * Оверлеи — дважды. В ячейке — то, что стоит на месте: корень поповера,
 * подсказки и меню с триггером, кнопки окна, выезжающей панели и тостов, поле
 * Select, поле DatePicker с кнопкой календаря. И открытые: панель поповера,
 * список Select с опциями, панель меню с группами, разделителями и пунктами,
 * окно и выезжающая панель с подложкой и частями, регион с тостом, панель
 * DatePicker с календарём — телепортированы в `body`, мимо сцены, — и панель
 * выбора месяца и года, которая остаётся в календаре; их рамки сверяются от
 * угла окна, когда доиграли переходы темы. Пробелы Svelte внутри панелей jsdom
 * не видит: раскладку считает только браузер.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { router } from '../src/router'
import { renderStand } from './stand'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
useTheme(oren)

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Строка страницы по имени пропа. */
const propRow = (name: string): HTMLElement => {
	const found = [...document.querySelectorAll('.pg-prop')].find(
		(node) => node.querySelector('.pg-prop__name')?.textContent?.trim() === name,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`строки «${name}» нет`)

	return found
}

/**
 * Рамки компонента и его нарисованных частей в первой колонке строки `row` —
 * от угла сцены колонки, в порядке документа: по ним видно и место каждой
 * части в ячейке, и её размер. Строка — `visible`, а у обёртки без
 * представления (Virtual) — её выключатель.
 */
async function boxesOf(framework: string, component: string, selector: string, row = 'visible') {
	await router.push(`/${framework}/${component}`)
	await settle()

	const stage = propRow(row).querySelector('.pg-col__stage')
	const parts = [...(stage?.querySelectorAll(selector) ?? [])].filter(
		(part) => part.getClientRects().length > 0,
	)

	if (!stage || parts.length === 0) {
		throw new Error(`${framework}/${component}: в сцене нет ${selector}`)
	}

	const outer = stage.getBoundingClientRect()

	return parts.map((part) => {
		const inner = part.getBoundingClientRect()

		return {
			x: Math.round(inner.left - outer.left),
			y: Math.round(inner.top - outer.top),
			width: Math.round(inner.width),
			height: Math.round(inner.height),
		}
	})
}

/** Что открывает оверлей в сцене: узел, по которому кликнуть, и его имя для ошибки. */
type TOpener = {
	readonly name: string
	readonly find: (stage: Element) => Element | undefined
}

/** Кнопка с текстом `text` — триггер поповера, кнопки окна, панели и тостов. */
const button = (text: string): TOpener => ({
	name: `кнопка «${text}»`,
	find: (stage) =>
		[...stage.querySelectorAll('.so-button')].find(
			(candidate) => candidate.textContent?.trim() === text,
		),
})

/**
 * Узел по селектору — стрелка Select: превью стенда — `editable`, и панель
 * там открывает клик по стрелке, а не по полю.
 */
const node = (selector: string): TOpener => ({
	name: selector,
	find: (stage) => stage.querySelector(selector) ?? undefined,
})

/**
 * Рамки открытого оверлея и его частей — от угла окна, в порядке документа:
 * панель телепортирована в `body`, мимо сцены, и стоит у триггера или у края
 * окна. Открывает её клик по узлу `opener` в первой колонке строки
 * `visible`; рамки снимаются, когда доиграли переходы темы — проявление,
 * въезд, место у якоря.
 */
async function openedBoxesOf(
	framework: string,
	component: string,
	opener: TOpener,
	selector: string,
) {
	await router.push(`/${framework}/${component}`)
	await settle()

	const stage = propRow('visible').querySelector('.pg-col__stage')
	const target = stage ? opener.find(stage) : undefined

	if (!(target instanceof HTMLElement)) {
		throw new Error(`${framework}/${component}: в сцене нет: ${opener.name}`)
	}

	target.click()
	await settle()
	await Promise.all(document.getAnimations().map((animation) => animation.finished))

	const parts = [...document.querySelectorAll(selector)].filter(
		(part) => part.getClientRects().length > 0,
	)

	if (parts.length === 0) throw new Error(`${framework}/${component}: открытого ${selector} нет`)

	return parts.map((part) => {
		const box = part.getBoundingClientRect()

		return {
			x: Math.round(box.left),
			y: Math.round(box.top),
			width: Math.round(box.width),
			height: Math.round(box.height),
		}
	})
}

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'

	await router.push('/vue')

	renderStand()

	await settle()
})

describe('хост Svelte', () => {
	// Селектор — компонент и его части: обёртка, элементы коллекций, панели,
	// нарисованные части разметки
	it.each([
		['button', '.so-button'],
		['icon', '.so-icon'],
		['skeleton', '.so-skeleton'],
		['input', '.so-input'],
		[
			'number-input',
			'.so-number-input, .so-number-input__input, .so-number-input__stepper, .so-number-input__decrement, .so-number-input__increment, .so-number-input svg',
		],
		['check-box', '.so-label, .so-check-box'],
		['switch', '.so-label, .so-switch'],
		['label', '.so-label, .so-check-box'],
		['field', '.so-field, .so-field__label, .so-field__control, .so-input, .so-field__helper'],
		['radio-group', '.so-radio-group, .so-radio-group-item'],
		['list-box', '.so-list-box, .so-list-box-item'],
		['tags', '.so-tags, .so-tags-item, .so-tags-item .so-button__text'],
		[
			'select',
			'.so-select, .so-select__field, .so-input__leading, .so-select__field input, .so-input__trailing, .so-select__arrow, .so-select__arrow svg',
		],
		['tabs', '.so-tabs, .so-tabs-item, .so-tabs__panel'],
		['accordion', '.so-accordion, .so-accordion-item'],
		['table', '.so-table__viewport, .so-table, .so-table-column, .so-table-row'],
		['progress-spinner', '.so-progress-spinner'],
		['progress-linear', '.so-progress-linear, .so-progress-linear__range'],
		[
			'slider',
			'.so-label, .so-slider, .so-slider__track, .so-slider__range, .so-slider__thumb',
		],
		[
			'rating',
			'.so-label, .so-rating, .so-rating__star, .so-rating__star-fill, .so-rating svg',
		],
		[
			'scroller',
			'.so-scroller, .so-scroller__prev, .so-scroller__viewport, .so-scroller__next, .so-scroller svg',
		],
		[
			'pagination',
			'.so-pagination, .so-pagination__prev, .so-pagination-item, .so-pagination__ellipsis, .so-pagination__next, .so-pagination svg',
		],
		[
			'date-input',
			'.so-date-input, .so-date-input__segments, .so-date-input__segment, .so-date-input__literal',
		],
		[
			'calendar',
			'.so-calendar, .so-calendar__month, .so-calendar__heading, .so-calendar__title, .so-calendar__prev, .so-calendar__next, .so-calendar svg, .so-calendar__grid, .so-calendar__weekday, .so-calendar-item, .so-calendar__filler',
		],
		// Панель DatePicker телепортирована мимо сцены: в ячейке — поле с кнопкой
		[
			'date-picker',
			'.so-date-picker, .so-date-picker__field, .so-date-input__segment, .so-date-input__literal, .so-date-input__trailing, .so-date-picker__trigger, .so-date-picker__trigger svg',
		],
		// Оверлеи в ячейке: корень с триггером, кнопки, которые открывают окно,
		// панель и тосты, — панели и регион телепортированы мимо сцены
		['popover', '.so-popover, .so-popover .so-button'],
		['tooltip', '.so-tooltip, .so-tooltip .so-button'],
		['menu', '.so-menu, .so-menu .so-button'],
		['dialog', '.so-button'],
		['drawer', '.so-button'],
		['toasts', '.so-button'],
	])('%s стоит в ячейке так же, как у Vue', async (component, selector) => {
		const vue = await boxesOf('vue', component, selector)
		const svelte = await boxesOf('svelte', component, selector)

		expect(svelte[0].width).toBeGreaterThan(0)
		expect(svelte).toEqual(vue)
	})

	/**
	 * Ряд окна: список с пределом строк, Select в колонке своей ширины и
	 * таблица в обёртке. Строки `visible` у обёртки нет — она без
	 * представления, — и сцена берётся из строки её выключателя.
	 */
	it('virtual: ряд окна стоит в ячейке так же, как у Vue', async () => {
		const selector =
			'.so-list-box, .so-list-box-item, .so-select, .so-select__field, .so-table__viewport, .so-table, .so-table-row'
		const vue = await boxesOf('vue', 'virtual', selector, 'enabled')
		const svelte = await boxesOf('svelte', 'virtual', selector, 'enabled')

		expect(svelte.length).toBeGreaterThan(3)
		expect(svelte[0].width).toBeGreaterThan(0)
		expect(svelte).toEqual(vue)
	})

	// Что открывает оверлей, его части и их число: панель, подложка,
	// заголовок, тело, подвал, крестик и содержимое; у Select — панель,
	// список и опции; у меню — панель, список, группы с подписями,
	// разделители, пункты со строками и видимые обёртки строк (отметки,
	// сочетания, стрелки); у тостов — регион с тостом (пустые регионы других
	// колонок стоят у того же края), тост, плашка, значок, текст, кнопка
	// «Отменить» и крестик; у календаря — панель выбора месяца и года, карточка,
	// список с 12 месяцами и шапка с годом и стрелками; у DatePicker — панель,
	// содержимое, календарь, месяц, заголовок с кнопкой, кнопки листания, сетка
	// и подписи недели — без дней: их число зависит от месяца. Число частей —
	// чтобы неоткрывшийся оверлей не сошёлся сам с собой
	it.each([
		[
			'popover',
			button('Открыть'),
			'.so-popover__panel, .so-popover__content, .so-popover__content > *, .so-popover__close',
			5,
		],
		[
			'select',
			node('.so-select__arrow'),
			'.so-select__panel, .so-select__list, .so-select-item',
			7,
		],
		[
			'menu',
			button('Действия'),
			'.so-menu__panel, .so-menu__list, .so-menu-group, .so-menu-group__label, .so-menu-separator, .so-menu-item, .so-menu-item > .so-button, .so-menu-item__indicator, .so-menu-item__shortcut, .so-menu-item__arrow',
			38,
		],
		[
			'dialog',
			button('Открыть окно'),
			'.so-dialog__backdrop, .so-dialog, .so-dialog__title, .so-dialog__body, .so-dialog__body > *, .so-dialog__footer, .so-dialog__footer > *, .so-dialog__close',
			10,
		],
		[
			'drawer',
			button('Открыть панель'),
			'.so-drawer__backdrop, .so-drawer, .so-drawer__title, .so-drawer__body, .so-drawer__body > *, .so-drawer__footer, .so-drawer__footer > *, .so-drawer__close',
			10,
		],
		[
			'toasts',
			button('обычное'),
			'.so-toasts:has(.so-toasts-item), .so-toasts-item, .so-toasts-item__card, .so-toasts-item__icon, .so-toasts-item__text, .so-toasts-item__content > *, .so-toasts-item__close',
			7,
		],
		// Панель выбора месяца и года — в календаре (`contained`), а не в `body`
		[
			'calendar',
			node('.so-calendar__title'),
			'.so-calendar .so-popover__panel, .so-calendar__picker, .so-calendar__picker-list, .so-calendar__picker .so-list-box-item, .so-calendar__picker-header, .so-calendar__picker-heading, .so-calendar__picker-prev, .so-calendar__picker-next',
			19,
		],
		[
			'date-picker',
			node('.so-date-picker__trigger'),
			'.so-date-picker__panel, .so-date-picker__content, .so-date-picker__calendar, .so-date-picker__panel .so-calendar__month, .so-date-picker__panel .so-calendar__heading, .so-date-picker__panel .so-calendar__title, .so-date-picker__panel .so-calendar__prev, .so-date-picker__panel .so-calendar__next, .so-date-picker__panel .so-calendar__grid, .so-date-picker__panel .so-calendar__weekday',
			16,
		],
	])('%s: открытый стоит так же, как у Vue', async (component, opener, selector, parts) => {
		const vue = await openedBoxesOf('vue', component, opener, selector)
		const svelte = await openedBoxesOf('svelte', component, opener, selector)

		expect(svelte).toHaveLength(parts)
		expect(svelte[0].width).toBeGreaterThan(0)
		expect(svelte).toEqual(vue)
	})
})
