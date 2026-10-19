/**
 * Стенд в узком окне: не прокручивается вбок, а шапка — полоска в одну строку.
 *
 * Основная область стенда (`.pg__main`) прокручивается сама, и всё, что шире
 * неё, уводит её вбок. В окне телефона (375 px) так было в двух местах.
 * Строка свойства держала имя и контрол рядом, двумя колонками фиксированной
 * ширины, и вместе с зазором они не помещались. Широкая ячейка витрины
 * (`span 2`) в сетке из одной дорожки достраивала вторую, неявную, и
 * растягивала сетку почти вдвое шире окна. Одна дорожка у витрины бывает и в
 * окне шире узкого: меню стоит колонкой и забирает место у сетки, — поэтому
 * случай с меню идёт отдельным окном, а широкое окно сверяет, что там
 * широкая ячейка по-прежнему занимает две дорожки.
 *
 * Имя свойства стоит над полем ввода или выбора в любом окне — подпись поля
 * сверху, — а у переключателя слева от него, в одну строку с ним: под именем
 * узкий Switch стоял один в пустой строке. Строку тест сверяет в окнах
 * телефонов от 360 до 414 px и в окне 900 px, у каждой строки страницы: имя
 * над полем или рядом с переключателем, подсказка под ними, имя и подсказка —
 * от начала строки; поле не выходит из строки и шириной одно во всех окнах —
 * во всё окно оно у края узкой раскладки тянулось бы почти на 700 px. Длинное
 * имя рядом с переключателем в окне телефона не переносится: колонка имени —
 * по имени, а не до 40 % строки, как у темы по умолчанию.
 *
 * Шапка в окне телефона занимала полэкрана: контролы переносились в несколько
 * строк. В узком окне она теперь полоска в одну строку — кнопка меню,
 * название, кнопка настроек, — а контролы уезжают в панель настроек, ссылка
 * на тесты — в панель меню, над списком. Полоску тест сверяет в тех же окнах
 * телефонов. Панели — по содержимому и по закрытию: меню закрывает переход по
 * ссылке, настройки выбор фреймворка не закрывает, обе закрывает окно,
 * ставшее широким. Плашка «движение выключено» в панели переносит текст, а не
 * режет его. В окне шире узкого кнопок нет, ссылка и контролы — в шапке, как
 * прежде. Флаги панелей живут в модуле (`useSidebar`) и переживают тест,
 * поэтому открытые панели тест закрывает сам, после каждого случая.
 *
 * Ширину задаёт окно (`page.viewport`), а не `body`: раскладку стенда считают
 * от окна правило `@media` в `src/styles.css` и `useSidebar`
 * (см. `tags-preview.spec.ts`). Каждый случай сверяет и саму раскладку, ради
 * которой взято окно, — иначе тест мерил бы другую.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import { reducedMotion } from './media'
import { settled } from './transitions'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

setIcons(material)
useTheme(oren)

const HEIGHT = 800

/** Окна телефонов: в каждом стенд в узкой раскладке. */
const PHONES = [360, 375, 414]

/** Ширина сетки витрины, с которой в неё помещаются две дорожки: 2 × 280 + 16. */
const TWO_TRACKS = 576

/** Ширина поля под именем в строке свойства (`.pg-prop__head`) — одна в любом окне. */
const CONTROL_WIDTH = 220

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Открыть страницу стенда в окне заданной ширины. */
const open = async (width: number, path: string) => {
	document.documentElement.dataset.soTheme = 'oren'

	await page.viewport(width, HEIGHT)
	await router.push(path)

	render(App, { global: { plugins: [router] } })

	await settle()
}

/** Узел по селектору — или ошибка с его именем. */
const find = (selector: string): HTMLElement => {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`узла ${selector} нет`)

	return node
}

/** Меню ушло в выезжающую панель — раскладка узкого окна. */
const narrowLayout = () => document.querySelector('.pg--narrow') !== null

/** Имя узла для сообщения: тег и классы. */
const label = (node: Element) => [node.tagName.toLowerCase(), ...node.classList].join('.')

/** Середина коробки по вертикали. */
const middleOf = (box: DOMRect) => box.top + box.height / 2

/** Прямоугольники текста узла — по одному на строку. */
const textRects = (node: Element) => {
	const range = document.createRange()

	range.selectNodeContents(node)

	return [...range.getClientRects()]
}

/** Сколько строк занимает текст узла. */
const linesOf = (node: Element) => new Set(textRects(node).map((rect) => Math.round(rect.top))).size

/** Ширина текста узла одной строкой: перенесённый — его строки подряд. */
const textWidthOf = (node: Element) => textRects(node).reduce((sum, rect) => sum + rect.width, 0)

/**
 * Что вылезает за край содержимого области — только для сообщения упавшей
 * проверки: самые внешние такие узлы, которых ничто внутри области не
 * обрезает.
 */
const overflowing = (main: HTMLElement): string => {
	const edge =
		main.getBoundingClientRect().left +
		main.clientWidth -
		parseFloat(getComputedStyle(main).paddingRight) +
		0.5
	const beyond = (node: Element | null) =>
		node instanceof HTMLElement && node.getBoundingClientRect().right > edge
	const clipped = (node: Element) => {
		for (let up = node.parentElement; up && up !== main; up = up.parentElement) {
			if (getComputedStyle(up).overflowX !== 'visible') return true
		}

		return false
	}

	return [...main.querySelectorAll('*')]
		.filter((node) => beyond(node) && !beyond(node.parentElement) && !clipped(node))
		.slice(0, 5)
		.map(label)
		.join(', ')
}

/** Область не прокручивается вбок: содержимое не шире её видимой части. */
const expectNoSideScroll = () => {
	const main = find('.pg__main')

	expect(main.scrollWidth, `вылезает: ${overflowing(main)}`).toBeLessThanOrEqual(main.clientWidth)
}

/**
 * Шапка каждой строки страницы свойств — поле `Field`: имя свойства, коробки
 * шапки, подписи, контрола и подсказки, дорожка переключателя, если редактор
 * — Switch, и зазоры поля. Подсказка есть у каждой строки: описание пропа
 * обязательно (`shared/__tests__/manifest.spec.ts`). Коробка имени — у
 * подписи, а не у `<code>` в ней: строчная коробка ниже строки, и зазор до
 * контрола разошёлся бы на полуинтерлиньяж. Строки и ширину текста имени
 * тест считает по тексту `<code>`: прямоугольники подписи несли бы ещё и
 * коробку самого `<code>`, и ширина вышла бы вдвое.
 */
const propHeads = () => {
	const heads = [...document.querySelectorAll('.pg-prop__head')]

	if (heads.length === 0) throw new Error('строк свойств на странице нет')

	return heads.map((head) => {
		const name = head.querySelector(':scope > .so-field__label')
		const text = name?.querySelector('.pg-prop__name')
		const control = head.querySelector(':scope > .so-field__control')
		const helper = head.querySelector(':scope > .so-field__helper')

		if (!name || !text || !control || !helper)
			throw new Error(`в шапке строки нет имени, контрола или подсказки: ${label(head)}`)

		const track = control.querySelector(':scope > .so-switch > .so-switch__track')
		const grid = getComputedStyle(head)

		return {
			prop: name.textContent?.trim() ?? '',
			head: head.getBoundingClientRect(),
			name: name.getBoundingClientRect(),
			lines: linesOf(text),
			textWidth: textWidthOf(text),
			control: control.getBoundingClientRect(),
			helper: helper.getBoundingClientRect(),
			// Видимая часть переключателя; у строки с полем ввода или выбора его нет
			track: track?.getBoundingClientRect() ?? null,
			// Подпись сверху — столбец без `row-gap`: зазоры до контрола и до
			// подсказки тема ставит им отступом сверху
			above: parseFloat(getComputedStyle(control).marginBlockStart),
			below: parseFloat(getComputedStyle(helper).marginBlockStart),
			// Подпись в начале строки — сетка: переключатель от имени отделяет
			// зазор колонок, подсказку от них — зазор строк
			beside: parseFloat(grid.columnGap),
			under: parseFloat(grid.rowGap),
		}
	})
}

type THead = ReturnType<typeof propHeads>[number]

/** Строка со Switch: у неё есть дорожка переключателя. */
const isToggle = (head: THead): head is THead & { track: DOMRect } => head.track !== null

/**
 * Шапки строк страницы. Строки каждого вида на странице есть — иначе
 * проверка вида прошла бы впустую.
 *
 * Строка с полем — столбец: имя над контролом на зазоре подписи, подсказка
 * под контролом на своём, все три — от начала строки. Контрол не выходит из
 * строки, и ширина у него одна в любом окне.
 *
 * Строка со Switch — имя в начале строки, в одну строку текста, за ним на
 * зазоре колонок переключатель, по центру строки имени; подсказка под ними
 * на зазоре строк — от начала строки, как имя, а не от переключателя.
 */
const expectHeads = () => {
	const heads = propHeads()
	const toggles = heads.filter(isToggle)
	const fields = heads.filter((head) => !isToggle(head))

	expect(fields.length, 'строки с полем ввода или выбора').toBeGreaterThan(0)
	expect(toggles.length, 'строки со Switch').toBeGreaterThan(0)

	for (const { prop, head, name, control, helper, above, below } of fields) {
		expect(control.top - name.bottom, `${prop}: имя над контролом, зазор подписи`).toBeCloseTo(
			above,
			0,
		)
		expect(helper.top - control.bottom, `${prop}: подсказка под контролом`).toBeCloseTo(
			below,
			0,
		)

		expect(name.left, `${prop}: имя — от начала строки`).toBeCloseTo(head.left, 0)
		expect(control.left, `${prop}: контрол — от начала строки`).toBeCloseTo(head.left, 0)
		expect(helper.left, `${prop}: подсказка — от начала строки`).toBeCloseTo(head.left, 0)
		expect(control.right, `${prop}: контрол в своей строке`).toBeLessThanOrEqual(
			head.right + 0.5,
		)
		expect(control.width, `${prop}: ширина контрола`).toBeCloseTo(CONTROL_WIDTH, 0)
	}

	for (const { prop, head, name, lines, control, helper, track, beside, under } of toggles) {
		expect(name.left, `${prop}: имя — от начала строки`).toBeCloseTo(head.left, 0)
		expect(lines, `${prop}: имя — в одну строку`).toBe(1)
		expect(track.left - name.right, `${prop}: переключатель — за именем`).toBeCloseTo(beside, 0)
		expect(
			Math.abs(middleOf(track) - middleOf(name)),
			`${prop}: переключатель — на строке имени`,
		).toBeLessThanOrEqual(1)
		expect(track.right, `${prop}: переключатель в своей строке`).toBeLessThanOrEqual(
			head.right + 0.5,
		)

		expect(
			helper.top - Math.max(name.bottom, control.bottom),
			`${prop}: подсказка под именем и переключателем`,
		).toBeCloseTo(under, 0)
		expect(helper.left, `${prop}: подсказка — от начала строки`).toBeCloseTo(head.left, 0)
	}
}

/** Ширины широкой и обычной ячеек витрины и зазор между дорожками. */
const cells = () => {
	const gap = parseFloat(getComputedStyle(find('.pg-grid')).columnGap)
	const wide = find('.pg-cell--wide').getBoundingClientRect().width
	const regular = find('.pg-cell:not(.pg-cell--wide)').getBoundingClientRect().width

	return { gap, wide, regular }
}

describe('стенд в узком окне не прокручивается вбок', () => {
	it.each(PHONES)(
		'%i px, страница свойств: имя над полем, у переключателя — рядом, подсказка — от начала строки',
		async (width) => {
			await open(width, '/vue/button')

			expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

			expectNoSideScroll()
			expectHeads()
		},
	)

	it('900 px, страница свойств: шапки строк — как в узком окне', async () => {
		await open(900, '/vue/button')

		expect(narrowLayout(), 'меню колонкой').toBe(false)

		expectHeads()
	})

	/**
	 * Колонку имени у строки со Switch тема по умолчанию держит не шире 40 %
	 * поля, и в окне телефона длинное имя рвалось посреди слова, хотя за
	 * переключателем оставалось полстроки. Имена Button коротки — длинные есть
	 * у плагинов Dialog (`hideOutside_enabled`).
	 */
	it('360 px, страница свойств: длинное имя у переключателя — в одну строку', async () => {
		await open(360, '/vue/dialog')

		expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

		const widest = Math.max(
			...propHeads()
				.filter(isToggle)
				.map(({ head, textWidth }) => textWidth / head.width),
		)

		expect(widest, 'у переключателя есть имя шире 40 % строки').toBeGreaterThan(0.4)

		expectNoSideScroll()
		expectHeads()
	})

	it('375 px, витрина: широкая ячейка — в одну дорожку, превью не шире ячейки', async () => {
		await open(375, '/vue')

		expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

		expectNoSideScroll()

		const { wide, regular } = cells()

		expect(wide, 'широкая ячейка — как обычная').toBeCloseTo(regular, 0)
	})

	it('800 px, витрина: при меню колонкой дорожка одна, и широкая ячейка — в ней', async () => {
		await open(800, '/vue')

		expect(narrowLayout(), 'меню колонкой').toBe(false)
		expect(find('.pg-grid').clientWidth, 'сетка уже двух дорожек').toBeLessThan(TWO_TRACKS)

		expectNoSideScroll()

		const { wide, regular } = cells()

		expect(wide, 'широкая ячейка — как обычная').toBeCloseTo(regular, 0)
	})

	it('1280 px, витрина: широкая ячейка по-прежнему на две дорожки', async () => {
		await open(1280, '/vue')

		expect(
			find('.pg-grid').clientWidth,
			'сетка на две дорожки и больше',
		).toBeGreaterThanOrEqual(TWO_TRACKS)

		const { gap, wide, regular } = cells()

		expect(wide, 'две дорожки и зазор между ними').toBeCloseTo(regular * 2 + gap, 0)
	})
})

/** Контролы шапки в порядке разметки — в шапке или в панели настроек. */
const SETTINGS = ['Фреймворк', 'Анимация движения', 'Язык', 'Тема', 'Иконки', 'Тёмная']

const header = () => find('.pg__header')

/** Кнопка шапки по имени — как её находит скринридер; нет кнопки — `null`. */
const headerButton = (name: string) =>
	page.elementLocator(header()).getByRole('button', { name, exact: true }).query()

/** Выезжающая панель узкого окна по заголовку: «Меню» или «Настройки». */
const panel = (title: string): HTMLElement => {
	const found = [...document.querySelectorAll('.pg__drawer')].find(
		(node) => node.querySelector('.so-drawer__title')?.textContent?.trim() === title,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`панели «${title}» нет`)

	return found
}

/** Панель на экране. Закрытую Drawer прячет, а не снимает. */
const shown = (node: HTMLElement) => getComputedStyle(node).display !== 'none'

/** Открыть панель её кнопкой в шапке и дождаться, пока она въедет. */
const openPanel = async (title: string): Promise<HTMLElement> => {
	const button = headerButton(title)

	if (!button) throw new Error(`в шапке нет кнопки «${title}»`)

	await userEvent.click(button)

	const node = panel(title)

	await expect.poll(() => shown(node), { message: `панель «${title}» открыта` }).toBe(true)
	await settled(node)

	return node
}

/** Подпись контрола — подпись его поля `Field`. */
const CAPTION = '.pg__control > .so-field__label'

/** Подписи контролов в порядке разметки. */
const labelsOf = (scope: Element) =>
	[...scope.querySelectorAll(CAPTION)].map((node) => node.textContent?.trim())

/** Контрол по подписи. */
const controlOf = (scope: Element, label: string): HTMLElement => {
	const found = [...scope.querySelectorAll('.pg__control')].find(
		(node) => node.querySelector(CAPTION)?.textContent?.trim() === label,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`контрола «${label}» нет`)

	return found
}

/** Коробка узла внутри контрола — или ошибка с селектором. */
const boxIn = (control: Element, selector: string): DOMRect => {
	const node = control.querySelector(selector)

	if (!node) throw new Error(`в контроле нет ${selector}`)

	return node.getBoundingClientRect()
}

/** Выбрать пункт Select контрола, как человек: открыть список и нажать пункт. */
const choose = async (control: Element, text: string) => {
	const field = control.querySelector('.so-select input')

	if (!(field instanceof HTMLElement)) throw new Error('у контрола нет поля Select')

	await userEvent.click(field)

	// Список телепортирован — пункт ищется по связке поля со списком
	const list = document.getElementById(field.getAttribute('aria-controls') ?? '')
	const option = [...(list?.querySelectorAll('[role="option"]') ?? [])].find(
		(node) => node.textContent?.trim() === text,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`в списке нет «${text}»`)

	await userEvent.click(option)
}

describe('шапка в узком окне', () => {
	afterEach(async () => {
		// Флаги панелей — в модуле и переживают тест: открытую закрывает её крестик
		for (const node of document.querySelectorAll<HTMLElement>('.pg__drawer')) {
			if (!shown(node)) continue

			node.querySelector<HTMLElement>('.so-drawer__close')?.click()

			await expect.poll(() => shown(node), { message: 'панель закрылась' }).toBe(false)
		}

		await reducedMotion('no-preference')
	})

	it.each(PHONES)(
		'%i px: шапка — полоска в одну строку: меню, название, настройки',
		async (width) => {
			await open(width, '/vue/button')

			expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

			const bar = header()
			const menu = headerButton('Меню')
			const settings = headerButton('Настройки')
			const brand = bar.querySelector('.pg__brand')

			if (!menu || !settings || !brand) {
				throw new Error('в полоске нет меню, названия или настроек')
			}

			expect(brand.textContent?.replace(/\s+/g, ' ').trim()).toBe('soldy-ui · playground')
			expect(bar.querySelector('.pg__control'), 'контролы — не в шапке').toBeNull()
			expect(bar.querySelector('.pg__switch'), 'ссылка на тесты — не в шапке').toBeNull()

			const style = getComputedStyle(bar)
			const boxes = [menu, brand, settings].map((node) => node.getBoundingClientRect())
			const [first, middle, last] = boxes
			const line =
				bar.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
			const left = bar.getBoundingClientRect().left + bar.clientLeft
			const start = left + parseFloat(style.paddingLeft)
			const end = left + bar.clientWidth - parseFloat(style.paddingRight)

			expect(line, 'строка одна').toBeCloseTo(Math.max(...boxes.map((box) => box.height)), 0)
			expect(middleOf(middle), 'название на линии кнопок').toBeCloseTo(middleOf(first), 0)
			expect(middleOf(last), 'настройки на линии меню').toBeCloseTo(middleOf(first), 0)
			expect(first.left, 'меню — в начале полоски').toBeCloseTo(start, 0)
			expect(first.right, 'меню — перед названием').toBeLessThanOrEqual(middle.left)
			expect(middle.right, 'название — перед настройками').toBeLessThanOrEqual(last.left)
			expect(last.right, 'настройки — в конце полоски').toBeCloseTo(end, 0)
			expect(bar.scrollWidth, 'полоска не шире окна').toBeLessThanOrEqual(bar.clientWidth)

			for (const button of [menu, settings]) {
				const box = button.getBoundingClientRect()
				const glyph = button.querySelector('svg')?.getBoundingClientRect()

				if (!glyph) throw new Error('в кнопке нет глифа')

				expect(box.width, 'кнопка квадратная').toBeCloseTo(box.height, 0)
				expect(glyph.left + glyph.width / 2, 'глиф по центру').toBeCloseTo(
					box.left + box.width / 2,
					0,
				)
				expect(middleOf(glyph), 'глиф по центру').toBeCloseTo(middleOf(box), 0)
			}
		},
	)

	it('375 px: «Настройки» — панель с контролами шапки, выбор фреймворка её не закрывает', async () => {
		await open(375, '/vue/button')

		const settings = await openPanel('Настройки')
		const column = settings.querySelector('.pg__settings')

		if (!column) throw new Error('в панели нет настроек')

		expect(labelsOf(settings)).toEqual(SETTINGS)

		// Столбец: подпись над контролом, поле Select — во всю ширину панели
		const { width } = column.getBoundingClientRect()

		for (const label of SETTINGS) {
			const control = controlOf(settings, label)
			const caption = boxIn(control, CAPTION)
			const field = boxIn(control, ':is(.so-select, .so-switch)')

			expect(caption.bottom, `${label}: подпись над контролом`).toBeLessThanOrEqual(field.top)

			if (label !== 'Тёмная') {
				expect(field.width, `${label}: поле во всю ширину`).toBeCloseTo(width, 0)
			}
		}

		await choose(controlOf(settings, 'Фреймворк'), 'React')

		await expect.poll(() => router.currentRoute.value.path).toBe('/react/button')
		await settle()

		expect(shown(settings), 'панель настроек открыта').toBe(true)
		expect(settings.dataset.open).toBe('true')
	})

	it('375 px: «Меню» — панель со ссылкой на тесты над меню, переход по ссылке её закрывает', async () => {
		await open(375, '/vue/button')

		const menu = await openPanel('Меню')
		const link = page
			.elementLocator(menu)
			.getByRole('link', { name: 'Тесты', exact: true })
			.query()
		const list = menu.querySelector('.pg__sidebar .pg__menu')

		if (!link || !list) throw new Error('в панели меню нет ссылки или меню')

		expect(link.getBoundingClientRect().bottom, 'ссылка над меню').toBeLessThanOrEqual(
			list.getBoundingClientRect().top,
		)

		await userEvent.click(link)

		await expect.poll(() => router.currentRoute.value.path).toMatch(/^\/vue\/tests(\/|$)/)
		await expect.poll(() => shown(menu), { message: 'панель меню закрылась' }).toBe(false)
	})

	it.each(['Меню', 'Настройки'])(
		'«%s»: открытая в узком окне, закрыта, когда окно побывало широким',
		async (title) => {
			await open(375, '/vue/button')
			await openPanel(title)

			await page.viewport(900, HEIGHT)
			await expect.poll(narrowLayout, { message: 'окно широкое' }).toBe(false)

			expect(document.querySelector('.pg__drawer'), 'панелей у широкого окна нет').toBeNull()

			await page.viewport(375, HEIGHT)
			await expect.poll(narrowLayout, { message: 'окно снова узкое' }).toBe(true)
			await settle()

			expect(shown(panel(title)), `«${title}» закрыта`).toBe(false)
		},
	)

	it('375 px: плашка «движение выключено» в панели — над своим переключателем, текст переносится', async () => {
		await reducedMotion('reduce')
		await open(375, '/vue/button')

		const settings = await openPanel('Настройки')
		const banner = settings.querySelector('.pg__motion-off')
		const column = settings.querySelector('.pg__settings')

		if (!banner || !column) throw new Error('в панели нет плашки движения')

		const box = banner.getBoundingClientRect()

		expect(box.bottom, 'над переключателем движения').toBeLessThanOrEqual(
			controlOf(settings, 'Анимация движения').getBoundingClientRect().top,
		)
		expect(box.right, 'в столбце').toBeLessThanOrEqual(
			column.getBoundingClientRect().right + 0.5,
		)
		expect(banner.scrollWidth, 'текст не обрезан').toBeLessThanOrEqual(banner.clientWidth)
		expect(linesOf(banner), 'текст перенесён на новую строку').toBeGreaterThan(1)
	})

	it('900 px: кнопок с глифами нет, ссылка и контролы — в шапке, как прежде', async () => {
		await open(900, '/vue/button')

		expect(narrowLayout(), 'меню колонкой').toBe(false)

		const bar = header()

		expect(headerButton('Меню'), 'кнопки меню нет').toBeNull()
		expect(headerButton('Настройки'), 'кнопки настроек нет').toBeNull()
		expect(document.querySelector('.pg__drawer'), 'панелей нет').toBeNull()
		expect(bar.querySelector('.pg__switch')?.textContent?.trim()).toBe('Тесты')
		expect(labelsOf(bar)).toEqual(SETTINGS)

		// Контролы — flex-элементы шапки, а не столбец обёртки настроек
		const framework = controlOf(bar, 'Фреймворк').getBoundingClientRect()
		const motion = controlOf(bar, 'Анимация движения').getBoundingClientRect()

		expect(middleOf(motion), 'контролы в строку').toBeCloseTo(middleOf(framework), 0)
	})
})
