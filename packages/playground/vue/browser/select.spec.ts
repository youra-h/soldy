/**
 * Select in a real browser: the panel appearing and disappearing, the shape of
 * the clear button and of the arrow's area, focus after a press on the arrow
 * and on a tag, the opacity of a disabled option.
 *
 * The panel is a Frame teleported to `body`, and its layer writes the open
 * state for the theme on it: `data-open` of the Select root doesn't reach the
 * teleported panel. The theme holds the transition
 * (`themes/oren/src/mixins/_anchored.scss`), the code has no animation hooks,
 * and jsdom doesn't run transitions — they can be seen only here, on the node
 * itself. The layout of the field with tags is guarded by
 * `select-tags.spec.ts`, the panel's side at the window's edge — by
 * `anchor.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { ListBox, ListBoxItem, Select, SelectItem } from '@soldy-ui/vue'

import { expectClearSquare } from './clear-button'
import { expectFadesInPlace, ownTransitionRuns, settled, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань']

/**
 * Select on the page, its root declared to the plugins: `TElementPlugin` waits
 * a frame. `below` — empty space under the field, a CSS height: with it the
 * page is taller than the window.
 */
const show = async (props: Record<string, unknown> = {}, below?: string) => {
	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { style: 'padding: 40px; width: 320px' }, [
						h(Select, props, {
							default: () =>
								CITIES.map((text, index) =>
									h(SelectItem, { key: text, value: String(index), text }),
								),
						}),
					]),
					below ? h('div', { style: { height: below } }) : null,
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/**
 * Select with a chosen value and the clear button: the field's end slot holds
 * the clear button and the arrow.
 */
const showClearable = (
	size?: (typeof COMPONENT_SIZES)[number],
	props: Record<string, unknown> = {},
) => show({ clearable: true, size, value: '0', ...props })

/** A node by selector inside a root; without it the test fails here, not on reading a property. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const field = () => find('.so-select__field input')
const panel = () => find('.so-select__panel')

/** The panel's option nodes. */
const options = (): HTMLElement[] => [...panel().querySelectorAll<HTMLElement>('.so-select-item')]

/**
 * The texts of the options the filter hasn't hidden. The filter hides an option
 * from markup by its `visible` (`display: none`) rather than removing it from
 * markup, and an option has its own `display` value even when the whole panel
 * is gone.
 */
const shownOptions = (): string[] =>
	options()
		.filter((option) => getComputedStyle(option).display !== 'none')
		.map((option) => option.textContent?.trim() ?? '')

/** The option with a text; without it the test fails here, not on the press. */
const option = (text: string): HTMLElement => {
	const found = options().find((element) => element.textContent?.trim() === text)

	if (!found) throw new Error(`${text}: опции нет`)

	return found
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
	// The window a test scrolled goes back to the start
	window.scrollTo(0, 0)
})

/**
 * Appearing and disappearing are the theme's transition by the panel's
 * `data-open`, as with a popover at its trigger without a gesture: the panel
 * fades in and out in place, by opacity alone, and a closed one catches no
 * presses while it fades.
 */
describe('появление и исчезание', () => {
	it('открытие — панель проявляется, закрытие — гаснет на месте и до конца нажатий не ловит', async () => {
		await show()

		const runs = ownTransitionRuns(panel())

		await userEvent.click(field())

		// The browser sends `transitionrun` a frame after the style recalc
		await expect.poll(() => runs).toContain('opacity')
		expect(panel().dataset.open).toBe('true')

		await settled(panel())

		// Focus stays on the field — Escape closes the panel from there
		expect(document.activeElement).toBe(field())

		await expectFadesInPlace(panel(), () => userEvent.keyboard('{Escape}'))
	})
})

/**
 * Typing with a filter usually ends by closing the panel — a choice in
 * `single`, Tab from the field, a press outside, — and the input plugin clears
 * the typed text by the same action. It clears the filter only once the closed
 * panel has faded (`TEditablePlugin`): otherwise the fading panel would show
 * the whole list for a moment and stretch to its height — a flash. A closed
 * panel shows what it showed.
 */
describe('отбор: гаснущая панель держит отобранное', () => {
	it.each<[string, () => Promise<unknown>]>([
		['выбор кликом', () => userEvent.click(option('Москва'))],
		['Tab с поля', () => userEvent.keyboard('{Tab}')],
	])(
		'%s — пока панель гаснет, в ней одна опция и высота прежняя, догасла — отбор снят',
		async (_, close) => {
			await show({ editable: true, editableMode: 'filter' })

			await userEvent.click(field())
			await userEvent.keyboard('Мо')
			await expect.poll(() => panel().dataset.open).toBe('true')
			await settled(panel())

			expect(shownOptions()).toEqual(['Москва'])

			const { height } = panel().getBoundingClientRect()

			await whileLeaving(panel(), close, () => {
				expect(shownOptions(), 'опции гаснущей панели').toEqual(['Москва'])
				expect(
					Math.abs(panel().getBoundingClientRect().height - height),
					'высота гаснущей панели',
				).toBeLessThan(1)
			})

			// Faded — the filter is cleared on the closed panel, and the panel
			// opened again shows the whole list
			await expect.poll(shownOptions).toEqual(CITIES)

			await userEvent.click(find('.so-select__arrow'))
			await expect.poll(() => panel().dataset.open).toBe('true')

			expect(shownOptions()).toEqual(CITIES)
		},
	)
})

/**
 * The clear button is drawn by the field — the Input inside Select, — and its
 * shape is the same: a square with a side of the slot's row at any size
 * (`clear-button.ts`). Earlier Select drew the button itself, and at large
 * sizes it came out low and wide. A click clears the field and doesn't open the
 * panel: it doesn't bubble up to the root that toggles the panel.
 */
describe('кнопка очистки', () => {
	it.each(COMPONENT_SIZES)('%s: квадрат высотой в строку слота, иконка внутри', async (size) => {
		await showClearable(size)

		expectClearSquare(
			find('.so-select__field .so-input__clear'),
			find('.so-select__field .so-input__trailing'),
			size,
		)
	})

	it('клик очищает поле и панель не открывает', async () => {
		await showClearable()

		const input = field()

		if (!(input instanceof HTMLInputElement)) throw new Error('поле — не <input>')

		await expect.poll(() => input.value).toBe('Москва')

		await userEvent.click(find('.so-select__field .so-input__clear'))

		await expect.poll(() => input.value).toBe('')
		expect(find('.so-select').dataset.open).not.toBe('true')
	})
})

/** The node's width and height are the sample's, within a subpixel tolerance. */
const expectSameSize = (element: Element, sample: Element, label: string) => {
	const own = element.getBoundingClientRect()
	const other = sample.getBoundingClientRect()

	expect(own.width, `${label}: ширина`).toBeCloseTo(other.width, 0)
	expect(own.height, `${label}: высота`).toBeCloseTo(other.height, 0)
}

/** The icon inside the node; without it the test fails here, not on measuring. */
const glyph = (element: Element): SVGSVGElement => {
	const icon = element.querySelector('svg')

	if (!icon) throw new Error('значка нет')

	return icon
}

/**
 * The arrow's press area is its whole wrapper (`TSelectPointerPlugin` looks for
 * it from the press target), and in `editable` the field's text doesn't open
 * the panel, so the arrow is the only place that opens it. The wrapper had no
 * box of its own: the area matched the icon, and the icon took the page's font
 * size at any size — at `2xl` in a 44px field the arrow was a 23px target. Now
 * the wrapper is the square of the clear button next to it, the slot's row
 * high, and its icon is the clear button's: the field's font size by size
 * (`themes/base/src/components/select.css`).
 */
describe('стрелка', () => {
	it.each(COMPONENT_SIZES)('%s: область — квадрат очистки, значок — её значка', async (size) => {
		await showClearable(size)

		const clear = find('.so-select__field .so-input__clear')
		const arrow = find('.so-select__arrow')

		expectClearSquare(clear, find('.so-select__field .so-input__trailing'), size)
		expectSameSize(arrow, clear, `${size}: область стрелки`)
		expectSameSize(glyph(arrow), glyph(clear), `${size}: значок стрелки`)
	})

	/**
	 * The area is the slot's whole row high: a press at the row's top edge above
	 * the arrow's middle opens the panel. While the area was the icon, it stood
	 * in the row's middle, such a press went to the slot, and the panel stayed
	 * closed.
	 */
	it.each(COMPONENT_SIZES)(
		'%s: в editable нажатие у края строки над стрелкой открывает панель',
		async (size) => {
			await showClearable(size, { editable: true })

			const slot = find('.so-select__field .so-input__trailing')
			const arrow = find('.so-select__arrow').getBoundingClientRect()
			const row = slot.getBoundingClientRect()

			await userEvent.click(slot, {
				position: { x: arrow.left + arrow.width / 2 - row.left, y: 1 },
			})

			await expect.poll(() => panel().dataset.open).toBe('true')
		},
	)
})

/** The text of the option the field's `aria-activedescendant` points to; no reference — `null`. */
const highlighted = (): string | null => {
	const id = field().getAttribute('aria-activedescendant')

	return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null
}

/**
 * The combobox's DOM focus is always on the field, and Select takes keys only
 * from it. The arrow is a mute node, and a `mousedown` on it carried focus to
 * `body`: the panel opened, but ↓ from `body` didn't reach the Select root —
 * the highlight stood still, and the page scrolled. `TSelectPointerPlugin`
 * cancels a press outside the field's Tab stops in both modes and puts focus in
 * the field, as a native `<select>` does.
 */
describe('нажатие по стрелке', () => {
	it.each<[string, Record<string, unknown>]>([
		['select-only', {}],
		['editable', { editable: true }],
	])(
		'%s: открывает панель с фокусом в поле, и ↓ ходит по опциям, а страница стоит',
		async (_, props) => {
			await show(props, '300vh')

			// The page is taller than the window — otherwise ↓ on `body` has
			// nothing to scroll, and the guard would pass by itself
			expect(
				document.documentElement.scrollHeight,
				'высота страницы против окна',
			).toBeGreaterThan(window.innerHeight)

			await userEvent.click(find('.so-select__arrow'))
			await expect.poll(() => panel().dataset.open).toBe('true')

			expect(document.activeElement, 'фокус после нажатия по стрелке').toBe(field())

			// The window after the click: before clicking, Playwright scrolls the target into it
			const scrollY = window.scrollY
			const scrolls: number[] = []
			const record = () => scrolls.push(window.scrollY)

			window.addEventListener('scroll', record)

			try {
				await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
				await expect.poll(highlighted).toBe('Тула')

				// The browser sends `scroll` in a frame's step: scrolling by the keys
				// shows up later
				await nextFrame()
				await nextFrame()
				await nextFrame()
			} finally {
				window.removeEventListener('scroll', record)
			}

			expect(scrolls, 'прокрутка окна от ↓').toEqual([])
			expect(window.scrollY, 'окно после ↓').toBe(scrollY)
		},
	)

	it.each<[string, Record<string, unknown>]>([
		['select-only', {}],
		['editable', { editable: true }],
	])('%s: фокус уже в поле — нажатие по стрелке его не уводит', async (_, props) => {
		await show(props)

		field().focus()

		const lost: string[] = []
		const record = (event: FocusEvent) => lost.push(event.type)

		field().addEventListener('focusout', record)

		try {
			await userEvent.click(find('.so-select__arrow'))
			await expect.poll(() => panel().dataset.open).toBe('true')
		} finally {
			field().removeEventListener('focusout', record)
		}

		expect(lost, 'уход фокуса с поля').toEqual([])
		expect(document.activeElement).toBe(field())
	})
})

/**
 * A tag's row in the field is a `Button` on a `div`, whose `tabindex="-1"` only
 * removes its own Tab stop: the row has no action, yet it took focus from a
 * press. `TSelectPointerPlugin` didn't cancel a press on it — the row counted
 * as a control, — and focus left the field for it: in select-only a click on a
 * tag opened the panel, but ↓ from the row didn't reach the Select keyboard,
 * and the page scrolled. The field's rule asks about a Tab stop, and a tag's
 * row is no stop but part of the field: a press on it is cancelled, and focus
 * goes to the field. A tag's close button is a stop, and the rule leaves its
 * press alone.
 */
describe('нажатие по тегу', () => {
	/** A selection of two tags; `below` — empty space under the field, as for `show`. */
	const showTags = async (props: Record<string, unknown>, below?: string) => {
		await show({ mode: 'multiple', value: ['0', '1'], ...props }, below)

		// The value turns into tags once the options have joined the collection
		await expect
			.poll(() => document.querySelectorAll('.so-select__tags .so-tags-item').length)
			.toBe(2)
	}

	/** The text of the first tag's row — not the close button. */
	const tagText = () =>
		find(
			'.so-select__tags .so-tags-item > .so-button:not(.so-tags-item__close) .so-button__text',
		)

	it.each<[string, Record<string, unknown>, boolean]>([
		['select-only', {}, true],
		['editable', { editable: true }, false],
	])('%s: фокус — в поле, и ↓ ходит по опциям, а страница стоит', async (_, props, opens) => {
		await showTags(props, '300vh')

		// The page is taller than the window — otherwise ↓ has nothing to
		// scroll, and the guard would pass by itself
		expect(
			document.documentElement.scrollHeight,
			'высота страницы против окна',
		).toBeGreaterThan(window.innerHeight)

		await userEvent.click(tagText())

		// A click on the field toggles the panel only in select-only: in
		// `editable` the arrow opens it. The frames let a panel opened by mistake
		// declare itself
		await nextFrame()
		await nextFrame()

		expect(field().getAttribute('aria-expanded'), 'панель после нажатия по тегу').toBe(
			String(opens),
		)
		expect(document.activeElement, 'фокус после нажатия по тегу').toBe(field())

		// The window after the click: before clicking, Playwright scrolls the target into it
		const scrollY = window.scrollY
		const scrolls: number[] = []
		const record = () => scrolls.push(window.scrollY)

		window.addEventListener('scroll', record)

		try {
			// The first ↓ highlights the first chosen option, in `editable` it also
			// opens the panel; the next ones move the highlight
			await userEvent.keyboard('{ArrowDown}')
			await expect.poll(highlighted).toBe('Москва')

			await userEvent.keyboard('{ArrowDown}{ArrowDown}')
			await expect.poll(highlighted).toBe('Тула')

			// The browser sends `scroll` in a frame's step: scrolling by the keys
			// shows up later
			await nextFrame()
			await nextFrame()
			await nextFrame()
		} finally {
			window.removeEventListener('scroll', record)
		}

		expect(scrolls, 'прокрутка окна от ↓').toEqual([])
		expect(window.scrollY, 'окно после ↓').toBe(scrollY)
	})

	it.each<[string, Record<string, unknown>]>([
		['select-only', {}],
		['editable', { editable: true }],
	])('%s: фокус уже в поле — нажатие по тегу его не уводит', async (_, props) => {
		await showTags(props)

		field().focus()

		const lost: string[] = []
		const record = (event: FocusEvent) => lost.push(event.type)

		field().addEventListener('focusout', record)

		try {
			await userEvent.click(tagText())
			await nextFrame()
			await nextFrame()
		} finally {
			field().removeEventListener('focusout', record)
		}

		expect(lost, 'уход фокуса с поля').toEqual([])
		expect(document.activeElement).toBe(field())
	})
})

/**
 * A tag's close button is a Tab stop of the field, and the field's rule leaves
 * a press on it alone: focus goes to the button. The tag leaves together with
 * it, and focus used to fall to the page: ↓ from `body` didn't reach the Select
 * keyboard and scrolled the page. A closed tag gives focus to its neighbour's
 * close button, and the last one — to the field: the row of tags stands before
 * it, and Select has no rule of its own for that.
 */
describe('закрытие тега крестиком', () => {
	const tagCount = () => document.querySelectorAll('.so-select__tags .so-tags-item').length

	/** A tag's close button by the tag's text — by the button's name from the locale. */
	const closeOf = (text: string) =>
		find(`.so-select__tags .so-tags-item__close[aria-label="Close ${text}"]`)

	it.each<[string, Record<string, unknown>]>([
		['select-only', {}],
		['editable', { editable: true }],
	])(
		'%s: у единственного тега — фокус в поле, и ↓ ходит по опциям, а страница стоит',
		async (_, props) => {
			await show({ mode: 'multiple', value: ['0'], ...props }, '300vh')
			await expect.poll(tagCount).toBe(1)

			// The page is taller than the window — otherwise ↓ has nothing to
			// scroll, and the guard would pass by itself
			expect(
				document.documentElement.scrollHeight,
				'высота страницы против окна',
			).toBeGreaterThan(window.innerHeight)

			await userEvent.click(closeOf('Москва'))
			await expect.poll(tagCount).toBe(0)

			expect(document.activeElement, 'фокус после закрытия тега').toBe(field())

			// The window after the click: before clicking, Playwright scrolls the target into it
			const scrollY = window.scrollY
			const scrolls: number[] = []
			const record = () => scrolls.push(window.scrollY)

			window.addEventListener('scroll', record)

			try {
				// The first ↓ opens the panel and highlights the first option — no
				// chosen ones are left, — the next ones move the highlight
				await userEvent.keyboard('{ArrowDown}')
				await expect.poll(highlighted).toBe('Москва')

				await userEvent.keyboard('{ArrowDown}{ArrowDown}')
				await expect.poll(highlighted).toBe('Тула')

				// The browser sends `scroll` in a frame's step: scrolling by the keys
				// shows up later
				await nextFrame()
				await nextFrame()
				await nextFrame()
			} finally {
				window.removeEventListener('scroll', record)
			}

			expect(scrolls, 'прокрутка окна от ↓').toEqual([])
			expect(window.scrollY, 'окно после ↓').toBe(scrollY)
		},
	)

	it('у тега с соседом — фокус на крестике соседа, а не в поле', async () => {
		await show({ mode: 'multiple', value: ['0', '1'] })
		await expect.poll(tagCount).toBe(2)

		await userEvent.click(closeOf('Москва'))
		await expect.poll(tagCount).toBe(1)

		expect(document.activeElement).toBe(closeOf('Тверь'))
	})
})

/**
 * The opacity the node is seen with on the page: its own times the opacity of
 * all its ancestors. The panel is teleported to `body`, and an option's
 * ancestors are the panel and its list, not the field.
 */
const visibleOpacity = (element: Element): number => {
	let opacity = 1

	for (let node: Element | null = element; node; node = node.parentElement) {
		opacity *= parseFloat(getComputedStyle(node).opacity)
	}

	return opacity
}

/**
 * A disabled option dims by its row alone, like a ListBox item: the row is a
 * Button and dims itself by its own `data-disabled`, while the option's wrapper
 * leaves the opacity alone. Earlier the wrapper dimmed too, and the option came
 * out twice as pale as the same ListBox item
 * (`themes/base/src/components/select.css`). The check knows no theme numbers:
 * the sample is a disabled ListBox item next to it.
 */
describe('выключенная опция', () => {
	it('гаснет так же, как выключенный пункт ListBox', async () => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px; width: 320px' }, [
						h(ListBox, {}, () => [
							h(ListBoxItem, { key: 'a', value: 'a', text: 'Москва' }),
							h(ListBoxItem, { key: 'b', value: 'b', text: 'Тверь', disabled: true }),
						]),
						h(Select, {}, () => [
							h(SelectItem, { key: 'a', value: 'a', text: 'Москва' }),
							h(SelectItem, { key: 'b', value: 'b', text: 'Тверь', disabled: true }),
						]),
					]),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()

		await userEvent.click(field())
		await expect.poll(() => panel().dataset.open).toBe('true')
		// The panel fades in by an opacity transition: measure once it has played out
		await settled(panel())

		const sample = visibleOpacity(
			find('.so-list-box-item[data-disabled="true"] .so-button__text'),
		)

		expect(sample, 'пункт ListBox гаснет').toBeLessThan(1)
		expect(
			visibleOpacity(find('.so-button__text', option('Тверь'))),
			'опция Select',
		).toBeCloseTo(sample, 2)
	})
})
