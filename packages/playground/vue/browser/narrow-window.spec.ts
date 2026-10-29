/**
 * The stand in a narrow window: it doesn't scroll sideways, and the header is
 * a one-line strip.
 *
 * The stand's main area (`.pg__main`) scrolls by itself, and anything wider
 * than it scrolls it sideways. In a phone window (375 px) that happened in two
 * places. A prop row kept the name and the control side by side, in two
 * fixed-width columns, and with the gap they didn't fit. The showcase's wide
 * cell (`span 2`) in a one-track grid built a second, implicit track and
 * stretched the grid almost twice as wide as the window. The showcase has one
 * track in a window wider than narrow too — the menu stands as a column and
 * takes the grid's room, — so the case with the menu gets a window of its own,
 * and a wide window checks that the wide cell still spans two tracks there.
 *
 * The prop's name stands above an input or a select in any window — the
 * field's label on top, — and before a switch, in one line with it: under the
 * name the narrow Switch stood alone in an empty line. The test checks every
 * row of the page in phone windows from 360 to 414 px and in a 900 px window:
 * the name above the field or beside the switch, the hint under them, the name
 * and the hint from the row's start; the field stays in its row and has one
 * width in every window — across the whole window it would stretch almost to
 * 700 px at the edge of the narrow layout. A long name beside a switch doesn't
 * wrap in a phone window: the name's column is as wide as the name, not up to
 * 40 % of the row, as the theme's default is.
 *
 * In a phone window the header took half the screen: the controls wrapped into
 * several lines. In a narrow window it is now a one-line strip — the menu
 * button, the title, the settings button, — while the controls go into the
 * settings panel and the link to the tests into the menu panel, above the
 * list. The test checks the strip in the same phone windows. Under the title
 * is the library's version, as a caption, and neither is cut in the strip: as
 * a continuation of the title in one line, the version didn't fit a 360 px
 * window on a font wider than Windows' system one (DejaVu Sans), and pushed
 * the header of a 900 px window into a third row of controls. The panels are
 * checked by content and by closing: following a link closes the menu,
 * choosing a framework doesn't close the settings, a window that has become
 * wide closes both. The «движение выключено» banner in the panel wraps its
 * text instead of cutting it. In a window wider than narrow there are no
 * buttons, and the link and the controls are in the header, as before. The
 * panels' flags live in a module (`useSidebar`) and outlive the test, so the
 * test closes open panels itself, after every case.
 *
 * The width is set by the window (`page.viewport`), not by `body`: the stand's
 * layout is computed from the window by the `@media` rule in `src/styles.css`
 * and by `useSidebar` (see `tags-preview.spec.ts`). Every case also checks the
 * layout the window was taken for — otherwise the test would measure another.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { loadHost } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from './stand'

import { reducedMotion } from './media'
import { settled } from './transitions'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
useTheme(oren)

const HEIGHT = 800

/** Phone windows: in each the stand is in the narrow layout. */
const PHONES = [360, 375, 414]

/** The showcase grid's width from which two tracks fit in it: 2 × 280 + 16. */
const TWO_TRACKS = 576

/** The width of the field under the name in a prop row (`.pg-prop__head`) — one in any window. */
const CONTROL_WIDTH = 220

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Open a stand page in a window of the given width. */
const open = async (width: number, path: string) => {
	document.documentElement.dataset.soTheme = 'oren'

	await page.viewport(width, HEIGHT)
	await router.push(path)

	renderStand()

	await settle()
}

/** A node by selector — or an error naming it. */
const find = (selector: string): HTMLElement => {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`узла ${selector} нет`)

	return node
}

/** The menu went into a drawer — the narrow window's layout. */
const narrowLayout = () => document.querySelector('.pg--narrow') !== null

/** A node's name for a message: the tag and the classes. */
const label = (node: Element) => [node.tagName.toLowerCase(), ...node.classList].join('.')

/** The box's vertical middle. */
const middleOf = (box: DOMRect) => box.top + box.height / 2

/** The rectangles of a node's text — one per line. */
const textRects = (node: Element) => {
	const range = document.createRange()

	range.selectNodeContents(node)

	return [...range.getClientRects()]
}

/** How many lines a node's text takes. */
const linesOf = (node: Element) => new Set(textRects(node).map((rect) => Math.round(rect.top))).size

/** The width of a node's text as one line: a wrapped one — its lines in a row. */
const textWidthOf = (node: Element) => textRects(node).reduce((sum, rect) => sum + rect.width, 0)

/**
 * What sticks out past the edge of the area's content — only for the message
 * of a failed check: the outermost such nodes that nothing inside the area
 * clips.
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

/** The area doesn't scroll sideways: its content is no wider than its visible part. */
const expectNoSideScroll = () => {
	const main = find('.pg__main')

	expect(main.scrollWidth, `вылезает: ${overflowing(main)}`).toBeLessThanOrEqual(main.clientWidth)
}

/**
 * The head of every row of the props page — a `Field`: the prop's name, the
 * boxes of the head, the label, the control and the hint, the switch's track
 * if the editor is a Switch, and the field's gaps. Every row has a hint: a
 * prop's description is required (`shared/__tests__/manifest.spec.ts`). The
 * name's box is the label's, not that of the `<code>` in it: an inline box is
 * lower than the line, and the gap to the control would be off by half the
 * leading. The lines and the text width of the name are counted by the text of
 * `<code>`: the label's rectangles would also carry the box of `<code>`
 * itself, and the width would come out double.
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
			// The switch's visible part; a row with an input or a select has none
			track: track?.getBoundingClientRect() ?? null,
			// The label on top — a column without `row-gap`: the theme sets the gaps
			// to the control and to the hint as their top margins
			above: parseFloat(getComputedStyle(control).marginBlockStart),
			below: parseFloat(getComputedStyle(helper).marginBlockStart),
			// The label at the row's start — a grid: the column gap separates the
			// switch from the name, the row gap the hint from them
			beside: parseFloat(grid.columnGap),
			under: parseFloat(grid.rowGap),
		}
	})
}

type THead = ReturnType<typeof propHeads>[number]

/** A row with a Switch: it has the switch's track. */
const isToggle = (head: THead): head is THead & { track: DOMRect } => head.track !== null

/**
 * The heads of the page's rows. Rows of each kind are on the page — otherwise
 * a kind's check would pass for nothing.
 *
 * A row with a field is a column: the name above the control at the label's
 * gap, the hint under the control at its own, all three from the row's start.
 * The control stays in its row, and its width is one in any window.
 *
 * A row with a Switch: the name at the row's start, in one line of text, after
 * it at the column gap the switch, centred on the name's line; the hint under
 * them at the row gap — from the row's start, like the name, not from the
 * switch.
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

/** The widths of the showcase's wide and regular cells and the gap between the tracks. */
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
	 * By default the theme keeps the name's column of a row with a Switch no
	 * wider than 40 % of the field, and in a phone window a long name broke
	 * mid-word, though half the row was left after the switch. The names of
	 * Button are short — the long ones belong to Dialog's plugins
	 * (`hideOutside_enabled`, the longest switch name on the stand).
	 *
	 * The case holds only while the name is wider than 40 % of the row, and the
	 * name's width is the font's: the monospace of the Playwright image in Docker
	 * is half an em wide, narrower than Windows' and CI's, and at 360 px the name
	 * took 37 % of the row there. So the window is the narrowest phone's, 320 px:
	 * there the name takes 43 % of the row even on that font.
	 */
	it('320 px, страница свойств: длинное имя у переключателя — в одну строку', async () => {
		await open(320, '/vue/dialog')

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

/** The header's controls in markup order — in the header or in the settings panel. */
const SETTINGS = ['Фреймворк', 'Анимация движения', 'Язык', 'Тема', 'Иконки', 'Тёмная']

const header = () => find('.pg__header')

/** A header button by name — as a screen reader finds it; no button — `null`. */
const headerButton = (name: string) =>
	page.elementLocator(header()).getByRole('button', { name, exact: true }).query()

/** A narrow window's drawer by its title: «Меню» or «Настройки». */
const panel = (title: string): HTMLElement => {
	const found = [...document.querySelectorAll('.pg__drawer')].find(
		(node) => node.querySelector('.so-drawer__title')?.textContent?.trim() === title,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`панели «${title}» нет`)

	return found
}

/** The panel is on screen. Drawer hides a closed one rather than removing it. */
const shown = (node: HTMLElement) => getComputedStyle(node).display !== 'none'

/** Open a panel with its button in the header and wait until it has slid in. */
const openPanel = async (title: string): Promise<HTMLElement> => {
	const button = headerButton(title)

	if (!button) throw new Error(`в шапке нет кнопки «${title}»`)

	await userEvent.click(button)

	const node = panel(title)

	await expect.poll(() => shown(node), { message: `панель «${title}» открыта` }).toBe(true)
	await settled(node)

	return node
}

/** A control's caption — the label of its `Field`. */
const CAPTION = '.pg__control > .so-field__label'

/** The controls' captions in markup order. */
const labelsOf = (scope: Element) =>
	[...scope.querySelectorAll(CAPTION)].map((node) => node.textContent?.trim())

/** A control by its caption. */
const controlOf = (scope: Element, label: string): HTMLElement => {
	const found = [...scope.querySelectorAll('.pg__control')].find(
		(node) => node.querySelector(CAPTION)?.textContent?.trim() === label,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`контрола «${label}» нет`)

	return found
}

/** The box of a node inside a control — or an error with the selector. */
const boxIn = (control: Element, selector: string): DOMRect => {
	const node = control.querySelector(selector)

	if (!node) throw new Error(`в контроле нет ${selector}`)

	return node.getBoundingClientRect()
}

/** Choose an item of a control's Select, as a person does: open the list and press the item. */
const choose = async (control: Element, text: string) => {
	const field = control.querySelector('.so-select input')

	if (!(field instanceof HTMLElement)) throw new Error('у контрола нет поля Select')

	await userEvent.click(field)

	// The list is teleported — the item is found by the field's link to the list
	const list = document.getElementById(field.getAttribute('aria-controls') ?? '')
	const option = [...(list?.querySelectorAll('[role="option"]') ?? [])].find(
		(node) => node.textContent?.trim() === text,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`в списке нет «${text}»`)

	await userEvent.click(option)
}

describe('шапка в узком окне', () => {
	afterEach(async () => {
		// The panels' flags live in a module and outlive the test: an open one is
		// closed by its cross
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
			const name = brand?.querySelector('.pg__name')
			const version = brand?.querySelector('.pg__version')

			if (!menu || !settings || !brand || !name || !version) {
				throw new Error('в полоске нет меню, названия с версией или настроек')
			}

			expect(name.textContent?.replace(/\s+/g, ' ').trim()).toBe('soldy-ui · playground')
			expect(version.textContent?.trim()).toBe(`v${__SOLDY_VERSION__}`)
			expect(
				version.getBoundingClientRect().top,
				'версия — под названием',
			).toBeGreaterThanOrEqual(name.getBoundingClientRect().bottom)

			for (const text of [name, version]) {
				expect(text.scrollWidth, 'название и версия не обрезаны').toBeLessThanOrEqual(
					text.clientWidth,
				)
			}

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

		// A column: the caption above the control, the Select field across the
		// panel's width
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

		// The React host — beforehand, by the loader, the way the router loads it.
		// The router changes the address only once the host is loaded, and the
		// host's first load, with runs going on beside, takes longer than the wait
		// for the address below. The test is about the panel, not the load speed,
		// and the wait isn't stretched by a guess about the machine
		await loadHost('react')

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

		// The controls are the header's flex items, not a column of the settings
		// wrapper
		const framework = controlOf(bar, 'Фреймворк').getBoundingClientRect()
		const motion = controlOf(bar, 'Анимация движения').getBoundingClientRect()

		expect(middleOf(motion), 'контролы в строку').toBeCloseTo(middleOf(framework), 0)
	})
})
