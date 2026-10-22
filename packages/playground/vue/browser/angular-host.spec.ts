/**
 * Хост Angular на странице стенда в настоящем браузере.
 *
 * jsdom проверяет хост целиком, но пакеты Angular идут там через
 * преобразование Vite (`server.deps.inline`), а в браузере — через его
 * предсборку зависимостей. Линкер стоит и в ней (`src/vite-angular.ts`): без
 * него страница Angular упала бы на первом же импорте пакета Angular, требуя
 * компилятор в рантайме.
 *
 * Здесь же — раскладка, которой jsdom не считает. Корень хоста
 * (`pg-angular-root`) в раскладке не участвует (`display: contents`), и
 * компонент стоит в ячейке так же, как компонент хоста Vue, — то же место и
 * тот же размер. У превью с обёрткой и содержимым так же стоят и обёртка, и
 * части: подпись вокруг флажка, ползунка и оценки, ручки и звёзды, элементы
 * коллекций, теги, поле Select с обёртками и стрелкой, страницы пагинации,
 * панель активного таба, части и разделители поля даты, заголовок, кнопки
 * листания, подписи недели и дни календаря, поле DatePicker с кнопкой
 * календаря, — а у таблицы её окно, корень, заголовки и строки:
 * ширину колонок плагин раскладки мерит по окну, и раскладка совпадает, только
 * если окно он нашёл; у окна Virtual — его ряд: список, Select и таблица.
 *
 * Панели поповера, подсказки и список Select увезены в `body`, мимо ячейки, и
 * стоят у якоря — корня, который Angular отдаёт панели значением
 * (`rootElement()` базы). Открытая панель с частями сверяется с Vue от угла
 * триггера, а список Select с опциями — от угла корня Select (`panel-boxes.ts`,
 * как у Web Components): превью обоих хостов — в одном блоке, по очереди. Окно и выезжающая панель — тоже в `body`, с
 * подложкой-спутником перед собой, и стоят у края или по центру окна: в ячейке
 * от них остаётся кнопка, а открытые, с подложкой и частями, сверяются с Vue от
 * угла окна. Регион тостов — тоже в `body`: в ячейке от менеджера без коробки
 * остаётся ряд кнопок, а регион с тостом, которого показала кнопка, сверяется с
 * Vue от угла окна. Панель DatePicker с календарём — в `body`, у корня, и
 * сверяется от его угла, как список Select, а панель выбора месяца и года
 * остаётся в календаре (`contained`) и сверяется от угла заголовка месяца.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { loadHost } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from './stand'
import {
	BOX,
	DIALOG_PARTS,
	DRAWER_PARTS,
	POPOVER_PARTS,
	TOOLTIP_PARTS,
	measure,
	measureLayer,
	type TBox,
} from './panel-boxes'

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
 * Рамки компонента и его нарисованных частей в первой колонке строки — от угла
 * сцены колонки, в порядке документа: по ним видно и место каждой части в
 * ячейке, и её размер. Скрытая часть рамок не имеет и не считается: панель
 * неактивного таба Angular держит в разметке скрытой — это элемент
 * потребителя, — а Vue её не рисует.
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

describe('хост Angular', () => {
	beforeEach(async () => {
		document.documentElement.dataset.soTheme = 'oren'

		await router.push('/vue')

		renderStand()

		await settle()
	})

	// Селектор — компонент и его части: обёртка, элементы коллекций, панели
	it.each([
		['button', '.so-button'],
		['icon', '.so-icon'],
		['skeleton', '.so-skeleton'],
		['input', '.so-input'],
		// Коробка поля и её части: ввод, ряд кнопок шага, сами кнопки и их значки
		[
			'number-input',
			'.so-number-input, .so-number-input__input, .so-number-input__stepper, .so-number-input__decrement, .so-number-input__increment, .so-number-input svg',
		],
		// Корень и поле внутри: корень — `<div so-textarea>`, как `div` у Vue, а
		// рамкой его делает тема
		['textarea', '.so-textarea, .so-textarea textarea'],
		['check-box', '.so-label, .so-check-box'],
		['switch', '.so-label, .so-switch'],
		// Ползунок и оценка — в подписи сверху: дорожка, заливка, ручка с полем;
		// звёзды и их значки
		[
			'slider',
			'.so-label, .so-slider, .so-slider__track, .so-slider__range, .so-slider__thumb, .so-slider__input',
		],
		['rating', '.so-label, .so-rating, .so-rating__star, .so-rating__icon, .so-rating__thumb'],
		['label', '.so-label, .so-check-box'],
		['field', '.so-field, .so-field__label, .so-field__control, .so-input, .so-field__helper'],
		['radio-group', '.so-radio-group, .so-radio-group-item'],
		['list-box', '.so-list-box, .so-list-box-item'],
		['tags', '.so-tags, .so-tags-item, .so-tags-item .so-button__text'],
		// Поле Select с обёртками по сторонам и стрелкой: список увезён в `body`
		[
			'select',
			'.so-select, .so-select__field, .so-input__leading, .so-select__field input, .so-input__trailing, .so-select__arrow, .so-select__arrow svg',
		],
		['tabs', '.so-tabs, .so-tabs-item, .so-tabs__panel'],
		['accordion', '.so-accordion, .so-accordion-item'],
		// Стрелки, страницы и пропуски — в одну строку
		[
			'pagination',
			'.so-pagination, .so-pagination__prev, .so-pagination-item, .so-pagination__ellipsis, .so-pagination__next',
		],
		// Лента и полоса — во всю ширину рамки: кнопки, вьюпорт и его
		// содержимое; дорожка и заливка доли
		[
			'scroller',
			'.so-scroller, .so-scroller__prev, .so-scroller__viewport, .so-scroller__viewport > *, .so-scroller__next',
		],
		['progress-linear', '.so-progress-linear, .so-progress-linear__range'],
		// Таблица — окно, корень, заголовки и строки: рамку превью задаёт хост
		['table', '.so-table__viewport, .so-table, .so-table-column, .so-table-row'],
		// Поле даты — части и разделители в ряду; календарь — заголовок, кнопки
		// листания со значками, сетка, подписи недели, дни и заполнители
		[
			'date-input',
			'.so-date-input, .so-date-input__segments, .so-date-input__segment, .so-date-input__literal',
		],
		[
			'calendar',
			'.so-calendar, .so-calendar__month, .so-calendar__heading, .so-calendar__title, .so-calendar__prev, .so-calendar__next, .so-calendar svg, .so-calendar__grid, .so-calendar__weekday, .so-calendar-item, .so-calendar__filler',
		],
		// Панель DatePicker увезена в `body`: в ячейке — поле с кнопкой календаря
		[
			'date-picker',
			'.so-date-picker, .so-date-picker__field, .so-date-input__segment, .so-date-input__literal, .so-date-input__trailing, .so-date-picker__trigger, .so-date-picker__trigger svg',
		],
		// Корень и триггер в нём: панели в ячейке нет — она увезена в `body`
		['popover', '.so-popover, .so-popover > .so-button'],
		['tooltip', '.so-tooltip, .so-tooltip > .so-button'],
		['menu', '.so-menu, .so-menu > .so-button'],
		// Кнопка, которая открывает окно и панель: сами они увезены в `body`.
		// У тостов — ряд кнопок, которые их показывают: менеджер без коробки, а
		// регион увезён
		['dialog', '.so-button'],
		['drawer', '.so-button'],
		['toasts', '.so-button'],
	])('%s стоит в ячейке так же, как у Vue', async (component, selector) => {
		const vue = await boxesOf('vue', component, selector)
		const angular = await boxesOf('angular', component, selector)

		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})

	/**
	 * Ряд окна: список с пределом строк, Select в колонке своей ширины и
	 * таблица в обёртке. Строки `visible` у окна нет — оно без представления, —
	 * и сцена берётся из строки его выключателя.
	 */
	it('virtual: ряд окна стоит в ячейке так же, как у Vue', async () => {
		const selector =
			'.so-list-box, .so-list-box-item, .so-select, .so-select__field, .so-table__viewport, .so-table, .so-table-row'
		const vue = await boxesOf('vue', 'virtual', selector, 'enabled')
		const angular = await boxesOf('angular', 'virtual', selector, 'enabled')

		expect(angular.length).toBeGreaterThan(3)
		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * Превью хоста в блоке — открытым: рамки триггера и панели с её частями от
 * угла триггера. Меряется и снимается — следующей отрисовке оно не мешает.
 * Страницы стенда здесь нет: её превью — тоже панели в `body`, а бесконечные
 * анимации витрины замер ждал бы вечно.
 */
async function panelOf(
	framework: string,
	component: string,
	props: Readonly<Record<string, unknown>>,
	parts: string,
): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props })

	try {
		return await measure(() => node.querySelector(`.so-${component} > .so-button`), parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панель у триггера', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// Части: у поповера — панель, обёртка содержимого, абзац и кнопка в ней,
	// крестик и иконка в нём; у подсказки — панель и обёртка текста
	it.each([
		['popover', { open: true, aria_label: 'Пример поповера' }, POPOVER_PARTS, 7],
		['tooltip', { open: true }, TOOLTIP_PARTS, 3],
	])(
		'%s: открытая панель с частями стоит у триггера так же, как у Vue',
		async (component, props, parts, count) => {
			const vue = await panelOf('vue', component, props, parts)
			const angular = await panelOf('angular', component, props, parts)

			expect(angular).toHaveLength(count)
			expect(angular[1].height).toBeGreaterThan(0)
			expect(angular).toEqual(vue)
		},
	)
})

/** Части открытого списка Select: панель, список и опции со строками. */
const SELECT_PARTS =
	'.so-select__panel, .so-select__list, .so-select-item, .so-select-item > .so-button'

/**
 * Превью Select хоста в блоке — открытым (`open`): рамки корня и списка с
 * опциями от угла корня — якоря панели. Меряется и снимается — следующей
 * отрисовке оно не мешает.
 */
async function selectOf(framework: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'select', props: { open: true } })

	try {
		return await measure(() => node.querySelector('.so-select'), SELECT_PARTS)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · список Select', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('открытый список с опциями стоит у поля так же, как у Vue', async () => {
		const vue = await selectOf('vue')
		const angular = await selectOf('angular')

		// Корень, панель, список и пять опций со строками
		expect(angular).toHaveLength(13)
		expect(angular[1].height).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * Части открытой панели выбора месяца и года: панель поповера места, карточка,
 * список с 12 месяцами и шапка с годом и стрелками.
 */
const PICKER_PARTS =
	'.so-calendar .so-popover__panel, .so-calendar__picker, .so-calendar__picker-list, .so-calendar__picker .so-list-box-item, .so-calendar__picker-header, .so-calendar__picker-heading, .so-calendar__picker-prev, .so-calendar__picker-next'

/**
 * Части открытой панели DatePicker: панель, содержимое, календарь, месяц,
 * заголовок с кнопкой, кнопки листания, сетка и подписи недели — без дней:
 * их число зависит от месяца.
 */
const DATE_PICKER_PARTS =
	'.so-date-picker__panel, .so-date-picker__content, .so-date-picker__calendar, .so-date-picker__panel .so-calendar__month, .so-date-picker__panel .so-calendar__heading, .so-date-picker__panel .so-calendar__title, .so-date-picker__panel .so-calendar__prev, .so-date-picker__panel .so-calendar__next, .so-date-picker__panel .so-calendar__grid, .so-date-picker__panel .so-calendar__weekday'

/** Кадр: плагины получают корень кадром после отрисовки. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Превью дат хоста в блоке — открытым: рамки якоря и панели с её частями от
 * угла якоря. У DatePicker панель открыта пропом (`open`) и увезена в `body`,
 * якорь — корень, как у Select; у календаря панель выбора открывает нажатие на
 * заголовок месяца — кадром позже, когда плагины получили корень, — и она
 * остаётся в календаре (`contained`), а сверяется от угла заголовка. Меряется
 * и снимается — следующей отрисовке оно не мешает.
 */
async function datesOf(
	framework: string,
	component: string,
	props: Readonly<Record<string, unknown>>,
	anchor: string,
	parts: string,
): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props })
	const target = () => node.querySelector(anchor)

	try {
		if (component === 'calendar') {
			await nextFrame()
			await nextFrame()

			const title = target()

			if (!(title instanceof HTMLElement)) throw new Error(`${framework}: заголовка нет`)

			title.click()
		}

		return await measure(target, parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панели дат', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// Число частей с якорем: у календаря — заголовок и 19 частей панели выбора,
	// у DatePicker — корень и 16 частей панели. Число — чтобы неоткрывшаяся
	// панель не сошлась сама с собой
	it.each([
		['calendar', {}, '.so-calendar__title', PICKER_PARTS, 20],
		['date-picker', { open: true }, '.so-date-picker', DATE_PICKER_PARTS, 17],
	])(
		'%s: открытая панель с частями стоит у якоря так же, как у Vue',
		async (component, props, anchor, parts, count) => {
			const vue = await datesOf('vue', component, props, anchor, parts)
			const angular = await datesOf('angular', component, props, anchor, parts)

			expect(angular).toHaveLength(count)
			expect(angular[1].width).toBeGreaterThan(0)
			expect(angular).toEqual(vue)
		},
	)
})

/** Части панели меню — группы с подписью, разделители, пункты со строками и их колонки. */
const MENU_PARTS = [
	'.so-menu__list',
	'.so-menu-group',
	'.so-menu-group__label',
	'.so-menu-separator',
	'.so-menu-item',
	'.so-menu-item > .so-button',
	'.so-menu-item__indicator',
	'.so-menu-item__icon',
	'.so-menu-item__shortcut',
	'.so-menu-item__arrow',
]

/** Селектор панели якоря и её частей — по её `id`, на который ссылается якорь. */
function menuPartsOf(anchor: Element | null): string {
	const panel = `#${CSS.escape(anchor?.getAttribute('aria-controls') ?? '')}`

	return [panel, ...MENU_PARTS.map((part) => `${panel} ${part}`)].join(', ')
}

/**
 * Превью меню хоста в блоке — открытым (`open`): рамки панели меню с частями от
 * угла триггера, а с `submenu` — ещё и подменю «Поделиться», открытого кликом
 * по его строке, от угла строки. Панелей на экране тогда две, и части каждой
 * ищутся по её `id`. Меряется и снимается — следующей отрисовке оно не мешает.
 */
async function menuOf(framework: string, submenu: boolean): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'menu', props: { open: true } })
	const trigger = () => node.querySelector('.so-menu > .so-button')

	try {
		if (!submenu) return await measure(trigger, menuPartsOf(trigger()))

		const panel = `#${CSS.escape(trigger()?.getAttribute('aria-controls') ?? '')}`
		const row = () => document.querySelector(`${panel} .so-menu-item > [aria-haspopup="menu"]`)

		await measure(trigger, menuPartsOf(trigger()))

		const share = row()

		if (!(share instanceof HTMLElement)) throw new Error(`${framework}: строки подменю нет`)

		share.click()

		return await measure(row, menuPartsOf(row()))
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панели меню и подменю', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('открытая панель меню и её части стоят у триггера так же, как у Vue', async () => {
		const vue = await menuOf('vue', false)
		const angular = await menuOf('angular', false)

		// Триггер, панель, список, группы с подписями, разделители, десять пунктов
		// со строками и их части
		expect(angular.length).toBeGreaterThan(20)
		expect(angular[1].height).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})

	it('открытая панель подменю и её пункты стоят у его строки так же, как у Vue', async () => {
		const vue = await menuOf('vue', true)
		const angular = await menuOf('angular', true)

		// Строка, панель подменю, список, три пункта со строками, стрелка подменю
		expect(angular.length).toBeGreaterThan(5)
		expect(angular[1].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * Превью хоста в блоке — открытым (`visible`): рамки слоя с подложкой и
 * частями от угла окна. Меряется и снимается — следующей отрисовке оно не
 * мешает, а снятое окно отпускает замок прокрутки.
 */
async function layerOf(framework: string, component: string, parts: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props: { visible: true } })

	try {
		return await measureLayer(parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · окно и выезжающая панель', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// Части: подложка, окно или панель, заголовок, тело, абзац и поле в нём,
	// подвал, две кнопки в нём, крестик
	it.each([
		['dialog', DIALOG_PARTS],
		['drawer', DRAWER_PARTS],
	])('%s: открытый с подложкой и частями стоит так же, как у Vue', async (component, parts) => {
		const vue = await layerOf('vue', component, parts)
		const angular = await layerOf('angular', component, parts)

		expect(angular).toHaveLength(10)
		expect(angular[1].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * Части региона с тостом: регион, тост, плашка, коробка значка, текст, кнопка
 * «Отменить» своего содержимого и крестик. Кнопка — потомком части, а не её
 * ребёнком: у Angular своё содержимое — компонент со своим элементом без
 * коробки, и кнопка лежит в нём.
 */
const TOASTS_PARTS =
	'.so-toasts:has(.so-toasts-item), .so-toasts-item, .so-toasts-item__card, .so-toasts-item__icon, .so-toasts-item__text, .so-toasts-item__content .so-button, .so-toasts-item__close'

/**
 * Превью тостов хоста в блоке: кнопка «обычное» показывает тост — с кнопкой
 * «Отменить», — и рамки региона с его частями снимаются от угла окна, когда
 * тост встал. Меряется и снимается — снятое превью уносит регион.
 */
async function toastOf(framework: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'toasts', props: {} })

	try {
		const button = [...node.querySelectorAll('.so-button')].find(
			(candidate) => candidate.textContent?.trim() === 'обычное',
		)

		if (!(button instanceof HTMLElement)) throw new Error(`${framework}: кнопки «обычное» нет`)

		button.click()

		return await measureLayer(TOASTS_PARTS)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · регион тостов', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('регион с тостом стоит у края окна так же, как у Vue', async () => {
		const vue = await toastOf('vue')
		const angular = await toastOf('angular')

		expect(angular).toHaveLength(7)
		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})
