/**
 * Tags in Svelte — a set of tags with the choice by mode, crosses and overflow.
 *
 * The scenarios are Vue's (`tags-close`, `tags-keyboard`, `tags-overflow`,
 * `tags-select`, `tags-variant`, Tags of `item-slots` and
 * `item-control-attrs`): the cross's markup, the roles and the Tab stop by
 * mode, the keyboard by APG Listbox, the choice by the row's `press`, the tag's
 * own variant, the consumer's layout of the shown tags in the `default` slot.
 * The engine, the extensions and the plugins moved over unchanged.
 *
 * Svelte's own is the cross. Svelte delegates a markup `onclick` to the app's
 * root, past the native `TActionPlugin` listeners on the roots of the tag and
 * the set. So the cross closes by a native listener of its node
 * (`clickAction`) and stops the event there, as in Tabs.
 *
 * And the slots. A snippet is opaque: the tag does not see what it drew, so a
 * cross relay given to the set stands at every tag in place of its own icon —
 * even where the snippet is empty. In Vue an empty slot gives way to the icon.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import {
	TTags,
	createEngineTags,
	type ITagsItem,
	type TComponentVariant,
	type TTagsOverflow,
} from '@soldy-ui/core'
import { Tags, TagsItem, type TagsItemProps, type TagsProps } from '@soldy-ui/svelte'
import Harness from './Tags.test.svelte'
import Slots from './TagsSlots.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

type THarnessProps = ComponentProps<typeof Harness>

/** Scope слотов: строки тега, проброса строки и проброса без своего scope. */
type TRowScope = { text: string; selected: boolean }
type TItemRowScope = TRowScope & { item: ITagsItem }
type TItemScope = { item: ITagsItem }

/** Строка тега — первая кнопка элемента: носитель роли, выбора и остановки Tab. */
const rows = () => [...document.querySelectorAll('.so-tags-item > .so-button:first-child')]

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

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

/** Фокус на узел: `focusin` слушает клавиатура набора. */
function focus(element: HTMLElement): void {
	element.focus()
	flushSync()
}

/**
 * Нажатие клавиши, как его шлёт браузер: keydown и keyup, всплывают и
 * отменяются. Пробел нажимает строку, когда его отпускают, — как `<button>`.
 */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
	flushSync()
}

/** Модификаторы варианта узла: по ним видно и что встало, и что снялось. */
const variantsOf = (element: Element, block: string): string[] =>
	[...element.classList].filter((name) => name.startsWith(`${block}--variant-`))

/** Модификаторы варианта тега по тексту строки. */
const tagVariants = (text: string): string[] => variantsOf(item(text), 'so-tags-item')

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
	multiple: (): THarnessProps => ({
		tags: { closable: true, mode: 'multiple' },
		items: [
			{ value: 'settings', text: 'Настройки', selected: true },
			{ value: 'mail', text: 'Почта' },
		],
	}),
	none: (): THarnessProps => ({
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
		mount(Harness, CLOSABLE[mode]())

		expect(rows()).toHaveLength(2)

		for (const row of rows()) {
			expect(row.getAttribute('role')).toBe(ROLES[mode])
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе тега сразу после строки', () => {
		mount(Harness, CLOSABLE[mode]())

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row?.getAttribute('role')).toBe(ROLES[mode])
		expect(close?.tagName).toBe('BUTTON')
		expect(close?.classList.contains('so-tags-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое тега не входит', () => {
		mount(Harness, CLOSABLE[mode]())

		const row = rowOf('Настройки')

		expect(row.textContent?.trim()).toBe('Настройки')
		expect(row.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	/** Строка и крестик стоят вплотную: пробел между ними Svelte оставил бы текстом. */
	it('между строкой и крестиком нет текста', () => {
		mount(Harness, CLOSABLE[mode]())

		const stray = [...item('Настройки').childNodes].filter(
			(child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '',
		)

		expect(stray).toEqual([])
	})
})

describe('кнопка закрытия: поведение', () => {
	it('без closable кнопки нет, в элементе одна строка', () => {
		mount(Harness, { items: [{ value: 'a', text: 'A' }] })

		expect(document.querySelector('.so-tags-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('клик закрывает тег и не выбирает его', async () => {
		mount(Tags, { closable: true, mode: 'multiple', items: ITEMS })

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

		mount(Harness, {
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
		mount(Tags, { closable: true, mode: 'multiple', items: ITEMS })

		// Строка выбирает по `press`, а слушатели `TActionPlugin` цепляются
		// через кадр после монтирования (`element:ready`)
		await nextFrame()

		click(rowOf('B'))

		expect(rowOf('B').getAttribute('aria-selected')).toBe('true')
		expect(rows()).toHaveLength(3)
	})

	it('размер кнопки — размер тега: от него считается кегль иконки', () => {
		mount(Harness, { tags: { closable: true, size: 'lg' }, items: [{ value: 'a', text: 'A' }] })

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` тега трёхзначен: `undefined` значит «как у набора». Снятый
	 * проп обязан вернуть тег к значению набора.
	 */
	it('false у тега прячет кнопку, снятие возвращает её от набора', () => {
		const view = (own?: boolean): THarnessProps => ({
			tags: { closable: true },
			items: [{ value: 'a', text: 'A', closable: own }],
		})
		const props = reactiveProps(view(false))

		mount(Harness, props)

		expect(item('A').querySelector('.so-tags-item__close')).toBeNull()

		props.items = view(undefined).items
		flushSync()

		expect(item('A').querySelector('.so-tags-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный тег не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного тега кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — `tagOff`, весь набор — `setOff`. */
	const view = ({ tagOff = false, setOff = false } = {}): THarnessProps => ({
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
		mount(Harness, view())

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const props = reactiveProps(view())

		mount(Harness, props)

		Object.assign(props, view({ tagOff: true }))
		flushSync()

		expect(withClose()).toEqual(['A'])

		Object.assign(props, view({ tagOff: false }))
		flushSync()

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного тега, включили — вернулись', () => {
		const props = reactiveProps(view())

		mount(Harness, props)

		Object.assign(props, view({ setOff: true }))
		flushSync()

		expect(withClose()).toEqual([])

		// `disabled` набора распространяется на всех: включение включает и «B»
		props.tags = view({ setOff: false }).tags
		flushSync()

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
		mount(Harness, {
			tags: { closable: true, view: 'ghost' },
			items: [{ value: 'a', text: 'A' }],
		})

		expect(set().classList.contains('so-tags--view-ghost')).toBe(true)

		// Строке и крестику вид даёт тема по контексту, разметка его не передаёт
		for (const part of [rowOf('A'), closeOf('A')]) {
			expect([...part.classList].filter((name) => name.includes('--view-'))).toEqual([])
		}
	})

	it('выбор отмечен на элементе тега, а строка его не несёт', () => {
		mount(Harness, CLOSABLE.multiple())

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
		mount(Harness, { tags: { closable: true, mode: 'multiple' }, items: ABC })

		const stops = document.querySelectorAll('[role="option"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(rowOf('B'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '0', '-1'])
	})

	it('без выбранного — у первой строки', () => {
		mount(Harness, {
			tags: { mode: 'single' },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
		})

		expect(rowTabindex(['A', 'B'])).toEqual(['0', '-1'])
	})

	it('кнопка закрытия — не остановка Tab: тег закрывает Delete', () => {
		mount(Harness, { tags: { closable: true, mode: 'multiple' }, items: ABC })

		expect(['A', 'B', 'C'].map((text) => closeOf(text).getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		])
	})

	it('набор объявляет горизонтальный listbox с множественным выбором', () => {
		mount(Harness, { tags: { mode: 'multiple' }, items: ABC })

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
		mount(Harness, { tags: { closable: true }, items: ABC })

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
		const props = reactiveProps<THarnessProps>({ tags: { closable: true }, items: ABC })

		mount(Harness, props)

		props.tags = { closable: true, mode: 'single' }
		flushSync()

		// `selected` у «B» пришёл, пока выбора не было, и не записался — выбранного нет
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
		expect(closeOf('A').getAttribute('tabindex')).toBe('-1')

		// Атрибут уходит из разметки: у строки его больше никто не пишет
		props.tags = { closable: true, mode: 'none' }
		flushSync()

		expect(rowTabindex(['A', 'B', 'C'])).toEqual([null, null, null])
		expect(rowOf('A').getAttribute('role')).toBe('listitem')
		expect(closeOf('A').hasAttribute('tabindex')).toBe(false)
	})
})

describe('клавиатура', () => {
	it('→ переносит фокус на строку следующего тега и остановку вместе с ним', async () => {
		mount(Harness, { tags: { mode: 'multiple' }, items: ABC })

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		focus(rowOf('B'))
		press(rowOf('B'), 'ArrowRight')

		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
		expect(rowOf('C').getAttribute('aria-selected')).toBe('false')
	})

	it('пробел выбирает тег под фокусом, остановка остаётся на нём', async () => {
		mount(Harness, { tags: { mode: 'multiple' }, items: ABC })
		await nextFrame()

		focus(rowOf('B'))
		press(rowOf('B'), 'ArrowRight')
		press(rowOf('C'), ' ')

		expect(rowOf('C').getAttribute('aria-selected')).toBe('true')
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
	})

	it('фокус на строке — кликом или из кода — переносит остановку на неё', async () => {
		mount(Harness, { tags: { mode: 'multiple' }, items: ABC })
		await nextFrame()

		focus(rowOf('A'))

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		mount(Tags, { closable: true, mode: 'multiple', items: ITEMS })
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
		mount(Tags, { mode: 'multiple', items: ITEMS })
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
	const view = ({ tagOff = false, setOff = false } = {}): THarnessProps => ({
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
			const props = reactiveProps(view(off))

			mount(Harness, props)
			await nextFrame()

			gesture(rowOf('B'))

			expect(selection()).toEqual(['false', 'false'])

			Object.assign(props, view(on))
			flushSync()
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

		mount(Tags, { ctrl, engine })
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
 * Слот `default` отдаёт показанные теги и заменяет петлю: так их раскладывают
 * в ленту или делят на ряд и панель, не трогая набор. Тег в своей разметке —
 * тот же элемент коллекции: закрывается и выбывает так же.
 */
describe('слот default: своя раскладка показанных тегов', () => {
	it('теги стоят в своей разметке, каждый — один раз', () => {
		mount(Slots, { case: 'own' })

		expect(textsIn(find(document, '.own', HTMLElement))).toEqual(['Москва', 'Тверь', 'Тула'])
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(3)
	})

	it('закрытый тег выбывает и из своей разметки', async () => {
		mount(Slots, { case: 'own' })
		await nextFrame()

		click(closeOf('Тверь', find(document, '.own', HTMLElement)))

		expect(textsIn(find(document, '.own', HTMLElement))).toEqual(['Москва', 'Тула'])
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
		const view = (owner?: TComponentVariant, own?: TComponentVariant): THarnessProps => ({
			tags: { variant: owner },
			items: [
				{ value: 'a', text: 'A', variant: own },
				{ value: 'b', text: 'B' },
			],
		})

		it('несёт свой модификатор варианта', () => {
			mount(Harness, view(undefined, 'danger'))

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена пропа меняет модификатор, прежний снимается', () => {
			const props = reactiveProps(view(undefined, 'danger'))

			mount(Harness, props)

			props.items = view(undefined, 'brand').items
			flushSync()

			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])

			// Снятый проп снимает модификатор: тег снова без своего варианта
			props.items = view().items
			flushSync()

			expect(tagVariants('A')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const props = reactiveProps(view('danger', 'danger'))

			mount(Harness, props)

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-danger'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			props.tags = view('brand').tags
			flushSync()

			// Вариант набора — на корне набора, и только там
			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			props.tags = view().tags
			flushSync()

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
			mount(Tags, { variant: 'brand', items: VARIANT_ITEMS })

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта в items меняет модификатор того же тега', () => {
			const props = reactiveProps<TagsProps>({
				variant: 'brand',
				items: VARIANT_ITEMS,
				trackBy: (tag) => tag.value,
			})

			mount(Tags, props)

			const before = item('A')

			props.items = [
				{ value: 'a', text: 'A', variant: 'brand' },
				{ value: 'b', text: 'B' },
			] satisfies TagsProps['items']
			flushSync()

			// Сверка по ключу обновила тот же тег, а не нарисовала новый
			expect(item('A')).toBe(before)
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])
			expect(tagVariants('B')).toEqual([])
		})

		it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', () => {
			const props = reactiveProps<TagsProps>({ variant: 'danger', items: VARIANT_ITEMS })

			mount(Tags, props)

			props.variant = 'brand'
			flushSync()

			expect(variantsOf(set(), 'so-tags')).toEqual(['so-tags--variant-brand'])
			expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
			expect(tagVariants('B')).toEqual([])

			props.variant = undefined
			flushSync()

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
		mount(Tags, {
			items: ITEMS.slice(0, 2),
			mode: 'multiple',
			item: scopeText<TItemRowScope>(
				({ item: tag, text, selected }) =>
					`${String(tag.value)}:${text}:${String(selected)}`,
			),
		})
		await nextFrame()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:false'])

		click(rowOf('b:B:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:true'])
	})

	it('children тега получает text и selected, без него — text', async () => {
		mount(Harness, {
			tags: { mode: 'multiple' },
			items: [
				{
					value: 'a',
					text: 'A',
					children: scopeText<TRowScope>(
						({ text, selected }) => `${text}:${String(selected)}`,
					),
				},
				{ value: 'b', text: 'B' },
			],
		})
		await nextFrame()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		click(rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	/**
	 * Сниппет непрозрачен: что он нарисовал у тега, тот не видит, — и заданный
	 * набору крестик стоит у каждого тега вместо своей иконки, даже где сниппет
	 * пуст. Иконку такому тегу рисует сам сниппет — веткой по `item`.
	 */
	it('item-close-icon задан — у каждого тега вместо своей иконки', () => {
		mount(Slots, { case: 'close-icon' })

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['empty', 'slot'])
	})

	it('без item-close-icon тег рисует свою иконку крестика', () => {
		mount(Tags, { closable: true, items: ITEMS.slice(0, 2) })

		expect(
			[...document.querySelectorAll('.so-tags-item__close')].map(
				(close) => close.querySelector('svg') !== null,
			),
		).toEqual([true, true])
	})
})

/**
 * Наборы ядра стоят на разных элементах: `attrs` и `dataset` — на корне тега,
 * `aria` — на строке. Строка — `div`: нативного `disabled` у неё нет, и
 * `aria-disabled` остаётся единственным способом сообщить состояние. Корень
 * рисуется по `tag`.
 */
describe('Tags.Item · обёртка и строка', () => {
	const draw = (tag?: string) =>
		mount(Harness, { items: [{ value: 'a', text: 'A', disabled: true, tag }] })

	it('нативного disabled на обёртке нет, состояние для темы — data-disabled', () => {
		draw()

		expect(item('A').hasAttribute('disabled')).toBe(false)
		expect(item('A').getAttribute('data-disabled')).toBe('true')
	})

	it('корень рисуется по tag: у fieldset нативный disabled появляется', () => {
		draw('fieldset')

		expect(item('A').tagName).toBe('FIELDSET')
		expect(item('A').hasAttribute('disabled')).toBe(true)
	})

	it('строка несёт aria-disabled без нативного дубля, тег корня её не переписывает', () => {
		draw('fieldset')

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
		mount(Harness, {
			tags: { mode: 'multiple', title: 'Метки' },
			items: [{ value: 'z', text: 'Z', selected: true, title: 'Тег' }],
		})

		expect(set().hasAttribute('mode')).toBe(false)
		expect(set().getAttribute('title')).toBe('Метки')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Тег')
		expect(item('Z').hasAttribute('title')).toBe(false)
	})
})

describe('типы', () => {
	it('Tags.Item — это TagsItem', () => {
		expect(Tags.Item).toBe(TagsItem)
		expectTypeOf(Tags.Item).toEqualTypeOf<typeof TagsItem>()
	})

	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[TItemRowScope]>>().toExtend<NonNullable<TagsProps['item']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<TagsProps['item-leading']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<TagsProps['item-close-icon']>>()
		expectTypeOf<Snippet<[{ shown: ReadonlyArray<ITagsItem> }]>>().toExtend<
			NonNullable<TagsProps['children']>
		>()
		expectTypeOf<Snippet<[TRowScope]>>().toExtend<NonNullable<TagsItemProps['children']>>()
		expectTypeOf<TagsItemProps['close-icon']>().toEqualTypeOf<Snippet | undefined>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<TagsProps>().toHaveProperty('onChangeValue')
		expectTypeOf<TagsProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeOrder')
		expectTypeOf<TagsItemProps>().toHaveProperty('onChangeClosable')
	})
})
