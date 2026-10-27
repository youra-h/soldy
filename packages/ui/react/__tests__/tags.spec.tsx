/**
 * Tags in React — a set of tags with the choice by mode, crosses and overflow.
 *
 * The scenarios are Vue's (`tags-close`, `tags-keyboard`, `tags-overflow`,
 * `tags-select`, `tags-variant`, Tags of `item-slots` and
 * `item-control-attrs`) and Solid's (`tags.spec.tsx`): the cross's markup,
 * the roles and the Tab stop by mode, the keyboard by APG Listbox, the choice by
 * the row's `press`, the tag's own variant, the consumer's layout of the shown
 * tags in children as a function. The engine, the extensions and the plugins
 * moved over unchanged.
 *
 * React's own are the cross and the moment of entry. The cross closes by a
 * native listener of its node (`useClickAction`) and stops the event there, as
 * in Tabs: a synthetic `stopPropagation` comes after the native `TActionPlugin`
 * listeners on the roots of the tag and the set. Markup tags enter the
 * collection at the commit, not at the render: the server markup of a markup
 * tag lacks what the collection writes to it, the hydration matches, after the
 * commit everything is in place; a set of data the server draws in full. Hence
 * the group «React»: StrictMode, the server and the hydration. Updates go
 * inside `act`: an event that changed the state past it fails the test by the
 * console guard.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { StrictMode, act, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import {
	TTags,
	createEngineTags,
	type ITagsItem,
	type TComponentVariant,
	type TTagsCollection,
	type TTagsOverflow,
} from '@soldy-ui/core'
import { Tags, TagsItem, type TagsItemProps, type TagsProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Пропсы набора и теги разметки — пропсы каждого `Tags.Item`. */
type THarness = {
	tags?: TagsProps
	items?: TagsItemProps[]
}

/**
 * Набор с тегами разметки, как `Tags.test.svelte`. Теги — по пропсам из
 * `items`, по месту (ключ — номер): смена пропсов тега — смена пропсов того же
 * компонента.
 */
function view({ tags = {}, items = [] }: THarness): ReactElement {
	return (
		<Tags {...tags}>
			{items.map((item, index) => (
				<Tags.Item key={index} {...item} />
			))}
		</Tags>
	)
}

/** Набор с тегами разметки, пропсы — один раз. */
const draw = (harness: THarness) => mount(view(harness))

/** Набор с тегами разметки и перерисовка родителя с новыми пропсами. */
function drawLive(initial: THarness): (next: THarness) => void {
	const { render } = mount(view(initial))

	return (next) => render(view(next))
}

/** Scope слотов: строки тега, проброса строки и проброса без своего scope. */
type TRowScope = { text: string; selected: boolean }
type TItemRowScope = TRowScope & { item: ITagsItem }
type TItemScope = { item: ITagsItem }

/** Строка тега — первая кнопка элемента: носитель роли, выбора и остановки Tab. */
const rows = () => [
	...document.querySelectorAll<HTMLElement>('.so-tags-item > .so-button:first-child'),
]

/** Элемент тега по тексту строки; нет его — тест падает здесь. */
function item(text: string, scope: ParentNode = document): HTMLElement {
	const found = [...scope.querySelectorAll('.so-tags-item')].find(
		(candidate) => candidate.firstElementChild?.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`тега «${text}» нет`)

	return found
}

/** Строка тега по тексту; нет её — тест падает здесь. */
function rowOf(text: string, scope?: ParentNode): HTMLElement {
	const row = item(text, scope).firstElementChild

	if (!(row instanceof HTMLElement)) throw new Error(`у тега «${text}» нет строки`)

	return row
}

/** Кнопка закрытия тега; нет её — тест падает здесь. */
function closeOf(text: string, scope?: ParentNode): HTMLElement {
	const close = item(text, scope).querySelector('.so-tags-item__close')

	if (!(close instanceof HTMLElement)) throw new Error(`у тега «${text}» нет кнопки закрытия`)

	return close
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

/** `tabindex` строк тегов по порядку текстов. */
const rowTabindex = (texts: string[], scope?: ParentNode) =>
	texts.map((text) => rowOf(text, scope).getAttribute('tabindex'))

/** Тексты тегов внутри узла по порядку. */
const textsIn = (scope: ParentNode) =>
	[...scope.querySelectorAll('.so-tags-item')].map((node) => node.textContent?.trim())

/** Корень набора: на нём роль ряда, режим переполнения и модификаторы набора. */
const set = () => find(document, '.so-tags', HTMLElement)

/** Клик меняет состояние компонентов — внутри `act`. */
function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Фокус на узел: `focusin` слушает клавиатура набора, и он меняет остановку. */
function focus(element: HTMLElement): void {
	act(() => element.focus())
}

/**
 * Нажатие клавиши, как его шлёт браузер: keydown и keyup, всплывают и
 * отменяются. Пробел нажимает строку, когда его отпускают, — как `<button>`.
 */
function press(target: Element, key: string): void {
	act(() => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
		target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
	})
}

/** Модификаторы варианта узла: по ним видно и что встало, и что снялось. */
const variantsOf = (element: Element, block: string): string[] =>
	[...element.classList].filter((name) => name.startsWith(`${block}--variant-`))

/** Модификаторы варианта тега по тексту строки. */
const tagVariants = (text: string): string[] => variantsOf(item(text), 'so-tags-item')

/** Узлы сверяются по ссылке: `toEqual` сравнил бы узлы по разметке. */
function expectNodes(actual: readonly Element[], expected: readonly Element[]): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

const ABC: TagsItemProps[] = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B', selected: true },
	{ value: 'c', text: 'C' },
]

const ITEMS = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/** Закрываемые теги в режиме выбора и без него: разметка обязана быть одной. */
const CLOSABLE = {
	multiple: (): THarness => ({
		tags: { closable: true, mode: 'multiple' },
		items: [
			{ value: 'settings', text: 'Настройки', selected: true },
			{ value: 'mail', text: 'Почта' },
		],
	}),
	none: (): THarness => ({
		tags: { closable: true },
		items: [
			{ value: 'settings', text: 'Настройки' },
			{ value: 'mail', text: 'Почта' },
		],
	}),
}

const ROLES = { multiple: 'option', none: 'listitem' } as const

const MODES = ['multiple', 'none'] as const

/**
 * Кнопка закрытия тега — сосед строки, а не её потомок: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Разметка одна на все режимы.
 */
describe.each(MODES)('кнопка закрытия: разметка, mode="%s"', (mode) => {
	it('у строки тега нет интерактивного потомка', () => {
		draw(CLOSABLE[mode]())

		expect(rows()).toHaveLength(2)

		for (const row of rows()) {
			expect(row.getAttribute('role')).toBe(ROLES[mode])
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе тега сразу после строки', () => {
		draw(CLOSABLE[mode]())

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row?.getAttribute('role')).toBe(ROLES[mode])
		expect(close?.tagName).toBe('BUTTON')
		expect(close?.classList.contains('so-tags-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое тега не входит', () => {
		draw(CLOSABLE[mode]())

		const row = rowOf('Настройки')

		expect(row.textContent?.trim()).toBe('Настройки')
		expect(row.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})
})

describe('кнопка закрытия: поведение', () => {
	it('без closable кнопки нет, в элементе одна строка', () => {
		draw({ items: [{ value: 'a', text: 'A' }] })

		expect(document.querySelector('.so-tags-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('клик закрывает тег и не выбирает его', async () => {
		mount(<Tags closable mode="multiple" items={ITEMS} />)

		// Крестик закрывает по клику своего TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		click(closeOf('B'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(selection()).toEqual(['false', 'false'])
	})

	/**
	 * Нажатие по крестику — не нажатие по тегу и не по набору: корни обоих
	 * слушают нативный клик (`TActionPlugin`), и всплывший до них клик дал бы
	 * им `action:press`.
	 */
	it('клик по крестику не вызывает onActionPress ни у тега, ни у набора', async () => {
		const tagPress = vi.fn()
		const setPress = vi.fn()

		draw({
			tags: { closable: true, onActionPress: setPress },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', onActionPress: tagPress },
			],
		})
		await nextFrame()

		click(closeOf('B'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A'])
		expect(tagPress).not.toHaveBeenCalled()
		expect(setPress).not.toHaveBeenCalled()

		// Клик по строке до корней доходит: слушатели на месте
		click(rowOf('A'))

		expect(setPress).toHaveBeenCalledTimes(1)
	})

	it('клик по строке по-прежнему выбирает тег', async () => {
		mount(<Tags closable mode="multiple" items={ITEMS} />)

		// Строка выбирает по `press`, а слушатели `TActionPlugin` цепляются
		// через кадр после монтирования (`element:ready`)
		await nextFrame()

		click(rowOf('B'))

		expect(rowOf('B').getAttribute('aria-selected')).toBe('true')
		expect(rows()).toHaveLength(3)
	})

	it('размер кнопки — размер тега: от него считается кегль иконки', () => {
		draw({ tags: { closable: true, size: 'lg' }, items: [{ value: 'a', text: 'A' }] })

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` тега трёхзначен: `undefined` значит «как у набора». Снятый
	 * проп обязан вернуть тег к значению набора.
	 */
	it('false у тега прячет кнопку, снятие возвращает её от набора', () => {
		const harness = (own?: boolean): THarness => ({
			tags: { closable: true },
			items: [{ value: 'a', text: 'A', closable: own }],
		})
		const update = drawLive(harness(false))

		expect(item('A').querySelector('.so-tags-item__close')).toBeNull()

		update(harness(undefined))

		expect(item('A').querySelector('.so-tags-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный тег не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного тега кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — `tagOff`, весь набор — `setOff`. */
	const harness = ({ tagOff = false, setOff = false } = {}): THarness => ({
		tags: { closable: true, disabled: setOff },
		items: [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', disabled: true },
			{ value: 'c', text: 'C', disabled: tagOff },
		],
	})

	/** Теги, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tags-item__close'))

	it('выключенный со старта', () => {
		draw(harness())

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const update = drawLive(harness())

		update(harness({ tagOff: true }))

		expect(withClose()).toEqual(['A'])

		update(harness({ tagOff: false }))

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного тега, включили — вернулись', () => {
		const update = drawLive(harness())

		update(harness({ setOff: true }))

		expect(withClose()).toEqual([])

		// `disabled` набора распространяется на всех: включение включает и «B»
		update(harness({ setOff: false }))

		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

/**
 * Пилюлю рисует элемент тега целиком: строка — только содержимое, иначе фон и
 * состояния не покрыли бы кнопку закрытия. Вид тема читает с класса набора,
 * состояние — с `data-*` элемента.
 */
describe('вид — у пилюли, а не у строки', () => {
	it('строка вида не рисует, вид набора — классом на наборе', () => {
		draw({ tags: { closable: true, view: 'ghost' }, items: [{ value: 'a', text: 'A' }] })

		expect(set().classList.contains('so-tags--view-ghost')).toBe(true)

		// Строке и крестику вид даёт тема по контексту, разметка его не передаёт
		for (const part of [rowOf('A'), closeOf('A')]) {
			expect([...part.classList].filter((name) => name.includes('--view-'))).toEqual([])
		}
	})

	it('выбор отмечен на элементе тега, а строка его не несёт', () => {
		draw(CLOSABLE.multiple())

		expect(item('Настройки').getAttribute('data-selected')).toBe('true')
		expect(rowOf('Настройки').hasAttribute('data-selected')).toBe(false)
		expect(rowOf('Настройки').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Клавиатура по APG Listbox на roving tabindex: ядро пишет `tabindex` строк и
 * крестика в наборы, `TTagsKeyboardPlugin` ловит клавиши и `focusin` на корне.
 * Здесь — что наборы доехали до своих элементов и перекрыли собственную
 * остановку строки-`Button` на `div`, а плагин ходит по настоящей разметке.
 */
describe('с выбором — одна остановка Tab на весь набор', () => {
	it('tabindex="0" ровно у одной строки — у выбранной', () => {
		draw({ tags: { closable: true, mode: 'multiple' }, items: ABC })

		const stops = document.querySelectorAll('[role="option"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(rowOf('B'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '0', '-1'])
	})

	it('без выбранного — у первой строки', () => {
		draw({
			tags: { mode: 'single' },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
		})

		expect(rowTabindex(['A', 'B'])).toEqual(['0', '-1'])
	})

	it('кнопка закрытия — не остановка Tab: тег закрывает Delete', () => {
		draw({ tags: { closable: true, mode: 'multiple' }, items: ABC })

		expect(['A', 'B', 'C'].map((text) => closeOf(text).getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		])
	})

	it('набор объявляет горизонтальный listbox с множественным выбором', () => {
		draw({ tags: { mode: 'multiple' }, items: ABC })

		expect(set().getAttribute('role')).toBe('listbox')
		expect(set().getAttribute('aria-orientation')).toBe('horizontal')
		expect(set().getAttribute('aria-multiselectable')).toBe('true')
	})
})

/**
 * Без выбора у строки нет действия: ни остановка, ни фокус от клика ей не
 * нужны, — `tabindex` у неё нет вовсе, а крестик — единственный путь закрыть
 * тег с клавиатуры.
 */
describe('без выбора строки Tab не ловят, крестик ловит', () => {
	it('у строк и у крестика tabindex нет — крестик нативная остановка', () => {
		draw({ tags: { closable: true }, items: ABC })

		expect(rowTabindex(['A', 'B', 'C'])).toEqual([null, null, null])
		expect(rowOf('A').getAttribute('role')).toBe('listitem')
		expect(['A', 'B', 'C'].map((text) => closeOf(text).hasAttribute('tabindex'))).toEqual([
			false,
			false,
			false,
		])
		expect(set().hasAttribute('aria-orientation')).toBe(false)
		expect(set().getAttribute('role')).toBe('list')
	})

	it('включили выбор — остановка появилась, выключили — ушла', () => {
		const update = drawLive({ tags: { closable: true }, items: ABC })

		update({ tags: { closable: true, mode: 'single' }, items: ABC })

		// `selected` у «B» пришёл, пока выбора не было, и не записался — выбранного нет
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
		expect(closeOf('A').getAttribute('tabindex')).toBe('-1')

		// Атрибут уходит из разметки: у строки его больше никто не пишет
		update({ tags: { closable: true, mode: 'none' }, items: ABC })

		expect(rowTabindex(['A', 'B', 'C'])).toEqual([null, null, null])
		expect(rowOf('A').getAttribute('role')).toBe('listitem')
		expect(closeOf('A').hasAttribute('tabindex')).toBe(false)
	})
})

describe('клавиатура', () => {
	it('→ переносит фокус на строку следующего тега и остановку вместе с ним', async () => {
		draw({ tags: { mode: 'multiple' }, items: ABC })

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		focus(rowOf('B'))
		press(rowOf('B'), 'ArrowRight')

		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
		expect(rowOf('C').getAttribute('aria-selected')).toBe('false')
	})

	it('пробел выбирает тег под фокусом, остановка остаётся на нём', async () => {
		draw({ tags: { mode: 'multiple' }, items: ABC })
		await nextFrame()

		focus(rowOf('B'))
		press(rowOf('B'), 'ArrowRight')
		press(rowOf('C'), ' ')

		expect(rowOf('C').getAttribute('aria-selected')).toBe('true')
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
	})

	it('фокус на строке — кликом или из кода — переносит остановку на неё', async () => {
		draw({ tags: { mode: 'multiple' }, items: ABC })
		await nextFrame()

		focus(rowOf('A'))

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		mount(<Tags closable mode="multiple" items={ITEMS} />)
		await nextFrame()

		focus(rowOf('B'))
		press(rowOf('B'), 'Delete')

		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(2)
		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'C'])).toEqual(['-1', '0'])
	})
})

/**
 * Строка выбирает тег по `press`, а не по `click`: `press` её `TActionPlugin`
 * приходит и на клик, и на Enter или пробел с фокусом на строке, и не
 * приходит на выключенный тег, а `TSelectionExtension.toggle` выключенность
 * не проверяет.
 */
describe('выбор: Enter и пробел на строке переключают его', () => {
	it.each([
		['Enter', 'Enter'],
		['пробел', ' '],
	] as const)('%s выбирает тег, повтор снимает выбор', async (_name, key) => {
		mount(<Tags mode="multiple" items={ITEMS} />)
		await nextFrame()

		press(rowOf('B'), key)

		expect(selection()).toEqual(['false', 'true', 'false'])

		press(rowOf('B'), key)

		expect(selection()).toEqual(['false', 'false', 'false'])
	})
})

/**
 * Выключенный тег не выбирается ни кликом, ни клавишей — выключен ли он сам
 * или весь набор. Включённый обратно — выбирается тем же жестом: так видно, что
 * слушатели на месте и отказ даёт именно выключенность.
 */
describe('выключенный тег не выбирается', () => {
	/** «B» выключается `tagOff`, весь набор — `setOff`. */
	const harness = ({ tagOff = false, setOff = false } = {}): THarness => ({
		tags: { mode: 'multiple', disabled: setOff },
		items: [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', disabled: tagOff },
		],
	})

	const GESTURES = [
		['клик', (row: HTMLElement) => click(row)],
		['Enter', (row: HTMLElement) => press(row, 'Enter')],
		['пробел', (row: HTMLElement) => press(row, ' ')],
	] as const

	const WAYS = [
		['выключен сам', { tagOff: true }, { tagOff: false }],
		['выключен набор', { setOff: true }, { setOff: false }],
	] as const

	describe.each(WAYS)('%s', (_way, off, on) => {
		it.each(GESTURES)('%s не выбирает, после включения — выбирает', async (_name, gesture) => {
			const update = drawLive(harness(off))

			await nextFrame()

			gesture(rowOf('B'))

			expect(selection()).toEqual(['false', 'false'])

			update(harness(on))
			await nextFrame()

			gesture(rowOf('B'))

			expect(selection()).toEqual(['false', 'true'])
		})
	})
})

/**
 * У набора два режима, `wrap` и `scroll`, и оба — раскладка темы: разметка
 * отдаёт режим через `data-overflow` и рисует все показанные теги.
 */
describe('переполнение', () => {
	const TEXTS = ['Москва', 'Тверь', 'Тула']

	const mountTags = (overflow: TTagsOverflow) => {
		const ctrl = new TTags({ overflow, closable: true })
		const engine = createEngineTags({
			owner: ctrl,
			items: TEXTS.map((text) => ({ value: text, text })),
		})

		mount(<Tags ctrl={ctrl} engine={engine} />)
	}

	it.each(['wrap', 'scroll'] as const)('%s: все теги в ряду', (overflow) => {
		mountTags(overflow)

		expect(textsIn(set())).toEqual(TEXTS)
	})

	it('режим уезжает в тему через data-overflow', () => {
		mountTags('scroll')

		expect(set().dataset['overflow']).toBe('scroll')
	})
})

/**
 * Дети-функция получают показанные теги и заменяют петлю: так их раскладывают
 * в ленту или делят на ряд и панель, не трогая набор. Тег в своей разметке —
 * тот же элемент коллекции: закрывается и выбывает так же. Раскладка — в слое
 * набора, и теги, оставшиеся после закрытия соседа, — те же узлы: React
 * сверяет разметку по ключу.
 */
describe('дети-функция: своя раскладка показанных тегов', () => {
	const CITIES = ['Москва', 'Тверь', 'Тула'].map((text) => ({ value: text, text }))
	const own = () => find(document, '.own', HTMLElement)

	/** Своя раскладка: обёртка `.own` и в ней по `Tags.Item` на тег. */
	const layout = ({ shown }: { shown: ReadonlyArray<ITagsItem> }): ReactNode => (
		<div className="own">
			{shown.map((tag) => (
				<Tags.Item key={tag.uid} ctrl={tag} />
			))}
		</div>
	)

	it('теги стоят в своей разметке, каждый — один раз', () => {
		mount(
			<Tags closable items={CITIES}>
				{layout}
			</Tags>,
		)

		expect(textsIn(own())).toEqual(['Москва', 'Тверь', 'Тула'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(3)
	})

	it('закрытый тег выбывает и из своей разметки; остальные — те же узлы', async () => {
		mount(
			<Tags closable items={CITIES}>
				{layout}
			</Tags>,
		)
		await nextFrame()

		const kept = [item('Москва', own()), item('Тула', own())]

		click(closeOf('Тверь', own()))

		expect(textsIn(own())).toEqual(['Москва', 'Тула'])
		expectNodes([item('Москва', own()), item('Тула', own())], kept)
	})

	/** Тег своей раскладки — элемент коллекции набора: выбор тот же, что у петли набора. */
	it('тег своей раскладки — в коллекции набора: выбор по клику', async () => {
		mount(
			<Tags mode="multiple" items={CITIES}>
				{layout}
			</Tags>,
		)
		await nextFrame()

		click(rowOf('Тверь', own()))

		expect(selection()).toEqual(['false', 'true', 'false'])
		expect(set().getAttribute('role')).toBe('listbox')
	})
})

/**
 * Вариант тега — свой, а не набора: в одном наборе теги бывают разного цвета.
 * Вариант набора остаётся модификатором корня набора: по нему тема красит тег
 * без своего варианта, а сам тег значения набора не получает.
 */
describe('вариант тега', () => {
	describe('тег из разметки', () => {
		/** У «A» вариант свой, у «B» — нет. */
		const harness = (owner?: TComponentVariant, own?: TComponentVariant): THarness => ({
			tags: { variant: owner },
			items: [
				{ value: 'a', text: 'A', variant: own },
				{ value: 'b', text: 'B' },
			],
		})

		it('несёт свой модификатор варианта', () => {
			draw(harness(undefined, 'danger'))

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена пропа меняет модификатор, прежний снимается', () => {
			const update = drawLive(harness(undefined, 'danger'))

			update(harness(undefined, 'brand'))

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])

			// Снятый проп снимает модификатор: тег снова без своего варианта
			update(harness())

			expect(tagVariants('A')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const update = drawLive(harness('danger', 'danger'))

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-danger'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			update(harness('brand', 'danger'))

			// Вариант набора — на корне набора, и только там
			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			update(harness(undefined, 'danger'))

			expect(variantsOf(set(), 'so-tags')).toEqual([])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
		})
	})

	describe('тег из items', () => {
		const VARIANT_ITEMS: TagsProps['items'] = [
			{ value: 'a', text: 'A', variant: 'danger' },
			{ value: 'b', text: 'B' },
		]

		it('несёт свой модификатор варианта, тег без своего — никакого', () => {
			mount(<Tags variant="brand" items={VARIANT_ITEMS} />)

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта в items меняет модификатор того же тега', () => {
			const trackBy = (tag: object) => Reflect.get(tag, 'value')
			const { render } = mount(
				<Tags variant="brand" items={VARIANT_ITEMS} trackBy={trackBy} />,
			)
			const before = item('A')

			render(
				<Tags
					variant="brand"
					items={[
						{ value: 'a', text: 'A', variant: 'brand' },
						{ value: 'b', text: 'B' },
					]}
					trackBy={trackBy}
				/>,
			)

			// Сверка по ключу обновила тот же тег, а не нарисовала новый
			expect(item('A')).toBe(before)
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const { render } = mount(<Tags variant="danger" items={VARIANT_ITEMS} />)

			render(<Tags variant="brand" items={VARIANT_ITEMS} />)

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			render(<Tags items={VARIANT_ITEMS} />)

			expect(variantsOf(set(), 'so-tags')).toEqual([])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})
	})
})

/**
 * Проброс целиком: у каждого слота тега есть `item-<слот>`, и его scope —
 * scope слота тега плюс сам тег.
 */
describe('слоты', () => {
	it('item получает text и selected тега, selected следует за выбором', async () => {
		mount(
			<Tags
				items={ITEMS.slice(0, 2)}
				mode="multiple"
				item={({ item: tag, text, selected }: TItemRowScope) =>
					`${String(tag.value)}:${text}:${String(selected)}`
				}
			/>,
		)
		await nextFrame()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:false'])

		click(rowOf('b:B:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:true'])
	})

	it('children тега получает text и selected, без него — text', async () => {
		mount(
			<Tags mode="multiple">
				<Tags.Item value="a" text="A">
					{({ text, selected }: TRowScope) => `${text}:${String(selected)}`}
				</Tags.Item>
				<Tags.Item value="b" text="B" />
			</Tags>,
		)
		await nextFrame()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		click(rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	/**
	 * Слот, нарисованный тегом заново со сменившимся scope, React сверяет с
	 * прежним: узлы слота переживают выбор, а текст в них новый — и у проброса
	 * набора тоже.
	 */
	it('item набора, читающий scope в разметке, — те же узлы после выбора', async () => {
		mount(
			<Tags
				items={ITEMS.slice(0, 2)}
				mode="multiple"
				item={(scope: TItemRowScope) => (
					<b className="probe">
						{String(scope.item.value)}:{String(scope.selected)}
					</b>
				)}
			/>,
		)
		await nextFrame()

		const probes = [...document.querySelectorAll('.probe')]

		click(rowOf('b:false'))

		expectNodes([...document.querySelectorAll('.probe')], probes)
		expect(probes.map((probe) => probe.textContent)).toEqual(['a:false', 'b:true'])
	})

	/**
	 * Пустое, что вернул проброс набора, тег видит и рисует своё — как у Vue:
	 * крестик-проброс одному тегу, у остальных — своя иконка.
	 */
	it('item-close-icon подменяет иконку одному тегу, у остальных — своя', () => {
		mount(
			<Tags
				closable
				items={ITEMS.slice(0, 2)}
				item-close-icon={({ item: tag }: TItemScope) =>
					tag.value === 'b' ? <b className="probe">×</b> : null
				}
			/>,
		)

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['icon', 'slot'])
	})

	it('без item-close-icon тег рисует свою иконку крестика', () => {
		mount(<Tags closable items={ITEMS.slice(0, 2)} />)

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map(
				(close) => close.querySelector('svg') !== null,
			),
		).toEqual([true, true])
	})

	it('item-leading и item-trailing получают тег через scope', () => {
		mount(
			<Tags
				items={ITEMS.slice(0, 2)}
				item-leading={({ item: tag }: TItemScope) => (
					<u className="lead">{String(tag.value)}</u>
				)}
				item-trailing={({ item: tag }: TItemScope) => (
					<s className="trail">{String(tag.value)}</s>
				)}
			/>,
		)

		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
	})
})

/**
 * Наборы ядра стоят на разных элементах: `attrs` и `dataset` — на корне тега,
 * `aria` — на строке. Строка — `div`: нативного `disabled` у неё нет, и
 * `aria-disabled` остаётся единственным способом сообщить состояние. Корень
 * рисуется по `tag`.
 */
describe('Tags.Item · обёртка и строка', () => {
	const drawItem = (tag?: string) =>
		draw({ items: [{ value: 'a', text: 'A', disabled: true, tag }] })

	it('нативного disabled на обёртке нет, состояние для темы — data-disabled', () => {
		drawItem()

		expect(item('A').hasAttribute('disabled')).toBe(false)
		expect(item('A').getAttribute('data-disabled')).toBe('true')
	})

	it('корень рисуется по tag: у fieldset нативный disabled появляется', () => {
		drawItem('fieldset')

		expect(item('A').tagName).toBe('FIELDSET')
		expect(item('A').hasAttribute('disabled')).toBe(true)
	})

	it('строка несёт aria-disabled без нативного дубля, тег корня её не переписывает', () => {
		drawItem('fieldset')

		expect(rowOf('A').tagName).toBe('DIV')
		expect(rowOf('A').getAttribute('aria-disabled')).toBe('true')
		expect(rowOf('A').hasAttribute('disabled')).toBe(false)
	})

	/**
	 * Пропсы фасада — `mode`, `items`, `engine` у набора и `selected` у тега —
	 * съедает связка фасада, и атрибутами в DOM они не уходят. Что не съели ни
	 * компонент, ни фасад, — уходит: у набора — корню, у тега — строке.
	 */
	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		draw({
			tags: { mode: 'multiple', title: 'Метки' },
			items: [{ value: 'z', text: 'Z', selected: true, title: 'Тег' }],
		})

		expect(set().hasAttribute('mode')).toBe(false)
		expect(set().getAttribute('title')).toBe('Метки')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Тег')
		expect(item('Z').hasAttribute('title')).toBe(false)
	})

	it('класс и стиль потребителя — корню тега, остальное — строке', () => {
		draw({
			items: [
				{ value: 'a', text: 'A', className: 'mine', style: { color: 'red' }, id: 'row-a' },
			],
		})

		expect(item('A').classList.contains('mine')).toBe(true)
		expect(item('A').style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})
})

/**
 * Своё у React: сборка идёт на рендере, теги разметки входят в коллекцию при
 * коммите, а пересобранный набор — новый движок, и теги пересобираются вслед
 * за ним.
 */
describe('React', () => {
	/** Значения тегов движка по порядку. */
	const values = (engine: TTagsCollection) =>
		engine.extensions.batch.items.map((tag) => tag.value)

	/**
	 * StrictMode пересобирает набор, а с ним и теги разметки: в живом движке
	 * они по одному разу и в порядке разметки, а клик и крестик работают над
	 * экземплярами текущей сборки.
	 */
	it('StrictMode: теги разметки — в коллекции по разу, выбор и закрытие работают', async () => {
		const engine = createEngineTags()

		mount(
			<StrictMode>
				<Tags engine={engine} mode="multiple" closable>
					<Tags.Item value="a" text="A" />
					<Tags.Item value="b" text="B" />
					<Tags.Item value="c" text="C" />
				</Tags>
			</StrictMode>,
		)
		await nextFrame()

		expect(values(engine)).toEqual(['a', 'b', 'c'])
		expect(document.querySelectorAll('.so-tags')).toHaveLength(1)

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true', 'false'])

		click(closeOf('A'))

		expect(values(engine)).toEqual(['b', 'c'])
		expect(rows().map((row) => row.textContent?.trim())).toEqual(['B', 'C'])
	})

	/**
	 * Строка — своё монтирование `ItemRow` с размером тега в пропсах. StrictMode
	 * пересобирает тег без `ctrl` новым экземпляром, и размер, который набор
	 * пишет тегу текущей сборки, доходит до видимой строки.
	 */
	it('StrictMode: размер набора доходит до строки текущей сборки тега', () => {
		const tree = (size: 'sm' | 'lg') => (
			<StrictMode>
				<Tags size={size}>
					<Tags.Item value="a" text="A" />
				</Tags>
			</StrictMode>
		)
		const { render } = mount(tree('sm'))

		render(tree('lg'))

		expect(rows()).toHaveLength(1)
		expect(rowOf('A').classList.contains('so-button--size-lg')).toBe(true)
		expect(rowOf('A').classList.contains('so-button--size-sm')).toBe(false)
	})

	it('серверная разметка набора из данных — полная: роли, выбор и остановка Tab', () => {
		const host = document.createElement('div')

		host.innerHTML = renderToString(<Tags items={ITEMS} mode="multiple" value={['b']} />)

		const serverRows = [...host.querySelectorAll('.so-tags-item > .so-button:first-child')].map(
			(row) => [
				row.getAttribute('role'),
				row.getAttribute('aria-selected'),
				row.getAttribute('tabindex'),
			],
		)

		expect(host.querySelector('.so-tags')?.getAttribute('role')).toBe('listbox')
		expect(serverRows).toEqual([
			['option', 'false', '-1'],
			['option', 'true', '0'],
			['option', 'false', '-1'],
		])
	})

	/**
	 * Теги разметки сервер рисует без того, что пишет им коллекция: роль и
	 * остановку Tab строки получают, когда войдут в неё при коммите. Гидратация
	 * сходится, а после неё теги в коллекции и выбираются кликом.
	 */
	it('теги разметки гидратируются без расхождений, в коллекцию входят после неё', async () => {
		const engine = createEngineTags()
		const element = (
			<Tags engine={engine} mode="multiple">
				<Tags.Item value="a" text="A" />
				<Tags.Item value="b" text="B" />
			</Tags>
		)
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		const serverRow = rowOf('A')

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})
		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(rowOf('A')).toBe(serverRow)
		expect(values(engine)).toEqual(['a', 'b'])
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
	})
})

describe('типы', () => {
	it('Tags.Item — это TagsItem', () => {
		expect(Tags.Item).toBe(TagsItem)
		expectTypeOf(Tags.Item).toEqualTypeOf<typeof TagsItem>()
	})

	/** Тип проверяет не vitest, а шаг CI «Типы — React». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<(scope: TItemRowScope) => ReactNode>().toExtend<
			NonNullable<TagsProps['item']>
		>()
		expectTypeOf<(scope: TItemScope) => ReactNode>().toExtend<
			NonNullable<TagsProps['item-leading']>
		>()
		expectTypeOf<(scope: TItemScope) => ReactNode>().toExtend<
			NonNullable<TagsProps['item-close-icon']>
		>()
		expectTypeOf<(scope: { shown: ReadonlyArray<ITagsItem> }) => ReactNode>().toExtend<
			NonNullable<TagsProps['children']>
		>()
		expectTypeOf<(scope: TRowScope) => ReactNode>().toExtend<
			NonNullable<TagsItemProps['children']>
		>()
		expectTypeOf<TagsItemProps['close-icon']>().toEqualTypeOf<ReactNode>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<TagsProps>().toHaveProperty('onChangeValue')
		expectTypeOf<TagsProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeOrder')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeClosable')
	})
})
