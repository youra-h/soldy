// @vitest-environment jsdom

/**
 * Клавиатура ListBox.
 *
 * Тесты появились вместе с выносом общей навигации в
 * `TListNavigationPlugin`: до этого плагин не был покрыт ничем, и рефакторинг
 * пришлось бы делать вслепую.
 *
 * ListBox — самостоятельный фокусируемый виджет: `keydown` слушается на его
 * корне, Enter и Space переключают выбор. Это и есть его отличие от Select,
 * где фокус остаётся на поле.
 *
 * Клавишу список берёт только с корня и со строки элемента, на которой фокус
 * остаётся после клика. До корня всплывают и клавиши полей и кнопок из шапки,
 * подвала и слотов элемента — их плагин не трогает.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { createPluginContext, required } from './helpers'
import { TListBox, TListBoxItem, TListBoxCollectionFacade } from '@soldy/core'
import type { IListBoxItem } from '@soldy/core'
import {
	TListKeyboardPlugin,
	TListItemPlugin,
	TElementPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TPluginBundle,
} from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * keydown, как его шлёт браузер: всплывает и отменяется. Без `cancelable`
 * `preventDefault()` ничего не делает, и `defaultPrevented` не прочитать.
 */
const keydown = (target: Element, key: string) => {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	target.dispatchEvent(event)

	return event
}

/**
 * Собирает ListBox с коллекцией и клавиатурой без адаптера фреймворка.
 *
 * Разметка — как у `ListBox.vue` и `Item.vue`: у каждого элемента свой узел
 * под корнем (`TElementPlugin` в его bundle, узлы отдаёт `TCollectionElements`),
 * внутри узла — строка с `tabindex="-1"`. В разметке атрибут приходит из
 * набора `aria` элемента, его пишет `TListBoxExtension`; по нему плагин и
 * узнаёт строку.
 */
async function setup(texts: string[]) {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text.toLowerCase(), text }))

	facade.items = items as IListBoxItem[]

	const root = document.createElement('div')

	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const elements = new TCollectionElements()
	const keyboard = new TListKeyboardPlugin()

	const ctx = createPluginContext(owner, [rootElement, bundles, elements])

	bundles.install(ctx)
	elements.install(ctx)
	keyboard.install(ctx)

	const itemPlugins = new Map<string | number, TListItemPlugin>()
	/** Строки элементов по порядку: после клика фокус остаётся на строке. */
	const rows: HTMLElement[] = []

	for (const item of items) {
		const node = document.createElement('div')
		const row = document.createElement('div')

		row.setAttribute('tabindex', '-1')
		node.appendChild(row)
		root.appendChild(node)
		rows.push(row)

		const bundle = new TPluginBundle(item)

		bundle.use(TElementPlugin)
		bundle.use(TListItemPlugin)

		required(bundle.get(TElementPlugin), 'TElementPlugin').element = node
		itemPlugins.set(item.uid, required(bundle.get(TListItemPlugin), 'TListItemPlugin'))
		bundles.register(bundle, item)
	}

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()

	/** Клавиша с корня — там фокус после Tab. */
	const press = (key: string) => keydown(root, key)

	return { owner, facade, items, keyboard, press, itemPlugins, root, rows }
}

type TListBoxSetup = Awaited<ReturnType<typeof setup>>

afterEach(() => {
	document.body.innerHTML = ''
})

describe('навигация', () => {
	it('стрелка вниз ставит подсветку на первый элемент', async () => {
		const { keyboard, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('стрелка вверх с пустой подсветки уводит на последний', async () => {
		const { keyboard, press, items } = await setup(['Один', 'Два', 'Три'])

		press('ArrowUp')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
	})

	it('навигация зациклена', async () => {
		const { keyboard, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press('ArrowDown')
		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('подсветка помечает элемент через его плагин и снимается с прежнего', async () => {
		const { press, items, itemPlugins } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press('ArrowDown')

		expect(required(itemPlugins.get(items[0].uid), 'плагин элемента').highlighted).toBe(false)
		expect(required(itemPlugins.get(items[1].uid), 'плагин элемента').highlighted).toBe(true)
	})
})

/**
 * Недоступный элемент навигация пропускает, как у Select, Tabs и Tags:
 * подсветить то, что нельзя выбрать, значит завести пользователя в тупик.
 * Раньше ListBox ходил и по выключенным — навигация по списку считалась
 * сплошной, а выбор блокировал сам элемент.
 */
describe('недоступные элементы пропускаются', () => {
	/** Как сделать элемент недоступным: выключить, скрыть, не рисовать. */
	const WAYS: ReadonlyArray<readonly [string, (item: TListBoxItem) => void]> = [
		[
			'выключен',
			(item) => {
				item.disabled = true
			},
		],
		[
			'скрыт',
			(item) => {
				item.visible = false
			},
		],
		[
			'не нарисован',
			(item) => {
				item.rendered = false
			},
		],
	]

	describe.each(WAYS)('элемент %s', (_way, makeUnavailable) => {
		it('стрелки перескакивают его', async () => {
			const { keyboard, press, items } = await setup(['Один', 'Два', 'Три'])

			makeUnavailable(items[1])

			press('ArrowDown')
			press('ArrowDown')

			expect(keyboard.highlightedUid).toBe(items[2].uid)

			press('ArrowUp')

			expect(keyboard.highlightedUid).toBe(items[0].uid)
		})

		it('с пустой подсветки и по кругу — тоже', async () => {
			const { keyboard, press, items } = await setup(['Один', 'Два', 'Три', 'Четыре'])

			makeUnavailable(items[0])
			makeUnavailable(items[3])

			// С пустой подсветки — на первый доступный
			press('ArrowDown')

			expect(keyboard.highlightedUid).toBe(items[1].uid)

			// Вверх с первого доступного — на последний доступный
			press('ArrowUp')

			expect(keyboard.highlightedUid).toBe(items[2].uid)

			// Вниз с последнего доступного — на первый доступный
			press('ArrowDown')

			expect(keyboard.highlightedUid).toBe(items[1].uid)
		})
	})

	it('список выключен — подсвечивать нечего', async () => {
		const { owner, keyboard, press } = await setup(['Один', 'Два'])

		owner.disabled = true

		press('ArrowDown')

		expect(keyboard.highlightedUid).toBeNull()
	})

	/**
	 * Шаг отсчитывается от места подсветки среди показанных, а не среди
	 * доступных. Подсвеченный элемент могли выключить, а позиция навигации
	 * встаёт и на выбранный элемент — выбрать выключенный из кода вправе
	 * приложение. Среди доступных такого нет, и стрелка уводила бы на край.
	 */
	describe.each([
		['вниз', 'ArrowDown', 2],
		['вверх', 'ArrowUp', 0],
	] as const)('стрелка %s с выключенного элемента — к его соседу', (_dir, key, neighbour) => {
		it('элемент выключили под подсветкой', async () => {
			const { keyboard, press, items } = await setup(['Один', 'Два', 'Три', 'Четыре'])

			press('ArrowDown')
			press('ArrowDown')
			items[1].disabled = true
			press(key)

			expect(keyboard.highlightedUid).toBe(items[neighbour].uid)
		})

		it('выключен выбранный элемент', async () => {
			const { facade, keyboard, press, items } = await setup(['Один', 'Два', 'Три', 'Четыре'])

			items[1].disabled = true
			facade.engine.extensions.selection.select(items[1] as IListBoxItem)
			press(key)

			expect(keyboard.highlightedUid).toBe(items[neighbour].uid)
		})
	})
})

describe('выбор', () => {
	it('Enter переключает выбор подсвеченного', async () => {
		const { facade, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press('Enter')

		expect(facade.selected).toEqual([items[0]])
	})

	it('Space делает то же самое', async () => {
		const { facade, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press(' ')

		expect(facade.selected).toEqual([items[0]])
	})

	it('повторное нажатие снимает выбор', async () => {
		const { facade, press } = await setup(['Один'])

		press('ArrowDown')
		press('Enter')
		press('Enter')

		expect(facade.selected).toEqual([])
	})

	it('без подсветки Enter ничего не делает', async () => {
		const { facade, press } = await setup(['Один'])

		press('Enter')

		expect(facade.selected).toEqual([])
	})
})

/**
 * Enter и пробел выбирают через расширение списка (`list.chooseItem`), тем же
 * путём, что клик по строке, и оно отказывает выключенному элементу.
 * `selection.toggle`, который плагин звал раньше, выключенность не проверяет.
 * Подсвеченный элемент плагин к тому же ищет среди доступных, и выключенный
 * до расширения не доходит.
 *
 * Выключается элемент уже после подсветки: навигация на выключенном не
 * останавливается, и иначе до Enter дело бы не дошло.
 */
describe('выключенный элемент не выбирается', () => {
	/** Как выключить подсвеченный первый элемент и как включить обратно. */
	const WAYS: ReadonlyArray<readonly [string, (listBox: TListBoxSetup, off: boolean) => void]> = [
		[
			'выключен сам',
			({ items }, off) => {
				items[0].disabled = off
			},
		],
		[
			'выключен список',
			({ owner }, off) => {
				owner.disabled = off
			},
		],
	]

	const KEYS = [
		['Enter', 'Enter'],
		['пробел', ' '],
	] as const

	describe.each(WAYS)('%s', (_way, switchOff) => {
		it.each(KEYS)('%s не выбирает, после включения — выбирает', async (_name, key) => {
			const listBox = await setup(['Один', 'Два'])
			const { facade, press, items } = listBox

			press('ArrowDown')
			switchOff(listBox, true)
			press(key)

			expect(facade.selected).toEqual([])

			switchOff(listBox, false)
			press(key)

			expect(facade.selected).toEqual([items[0]])
		})
	})
})

describe('подсветка следует за выбором', () => {
	it('встаёт на выбранный элемент при появлении коллекции', async () => {
		// Позиция запоминается без визуальной отметки: навигация ещё не началась
		const owner = new TListBox()
		const facade = new TListBoxCollectionFacade({}, { owner })
		const items = [
			new TListBoxItem({ value: 'a', text: 'A' }),
			new TListBoxItem({ value: 'b', text: 'B' }),
		]

		facade.items = items as IListBoxItem[]
		facade.engine.extensions.selection.select(items[1] as IListBoxItem)

		const bundles = new TCollectionBundlesPlugin()
		const keyboard = new TListKeyboardPlugin()
		const ctx = createPluginContext(owner, [bundles])

		bundles.install(ctx)
		keyboard.install(ctx)
		bundles.bindEngine(facade.engine)

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('переезжает, когда выбор меняют снаружи', async () => {
		const { facade, keyboard, items } = await setup(['Один', 'Два'])

		facade.engine.extensions.selection.select(items[1] as IListBoxItem)

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})
})

describe('событие change:highlight', () => {
	it('несёт соседей — по ним плагин прокрутки решает, куда скроллить', async () => {
		const { keyboard, press, items } = await setup(['Один', 'Два', 'Три'])
		const seen: unknown[] = []

		keyboard.events.on('change:highlight', (payload) => seen.push(payload))

		press('ArrowDown')
		press('ArrowDown')

		expect(seen).toHaveLength(2)
		expect(seen[1]).toEqual({
			item: items[1],
			prevItem: items[0],
			nextItem: items[2],
		})
	})
})

/** Стрелки: у списка они двигают подсветку. */
const ARROWS = [
	['стрелка вниз', 'ArrowDown'],
	['стрелка вверх', 'ArrowUp'],
] as const

/** Enter и пробел: у списка они переключают выбор подсвеченного. */
const ACTIVATION_KEYS = [
	['Enter', 'Enter'],
	['пробел', ' '],
] as const

/**
 * Слушатель висит на корне, и до него всплывают клавиши всего, что лежит под
 * корнем. Список берёт клавишу с корня — там фокус после Tab — и со строки
 * элемента: у строки `tabindex="-1"`, и после клика фокус остаётся на ней.
 * Свою клавишу список отменяет: пробел иначе прокрутил бы страницу.
 *
 * Строка — не первого элемента: так видно, что плагин узнаёт строку любого
 * показанного элемента, а не одну.
 */
describe.each([
	['с корня', ({ root }: TListBoxSetup) => root],
	['со строки элемента', ({ rows }: TListBoxSetup) => rows[1]],
] as const)('клавиша %s — списка', (_from, targetOf) => {
	it('стрелки двигают подсветку и отменяются', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { keyboard, items } = listBox

		const down = keydown(targetOf(listBox), 'ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
		expect(down.defaultPrevented).toBe(true)

		const up = keydown(targetOf(listBox), 'ArrowUp')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
		expect(up.defaultPrevented).toBe(true)
	})

	it.each(ACTIVATION_KEYS)('%s выбирает подсвеченное и отменяется', async (_name, key) => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { facade, items } = listBox

		keydown(targetOf(listBox), 'ArrowDown')

		const event = keydown(targetOf(listBox), key)

		expect(facade.selected).toEqual([items[0]])
		expect(event.defaultPrevented).toBe(true)
	})
})

/**
 * Строка выключенного элемента — тоже строка списка. Навигация элемент
 * пропускает, но фокус на его строке бывает: элемент могли выключить, пока
 * фокус на ней, а если тема не глушит мышь на выключенной строке, фокус на неё
 * ставит и клик. Если бы плагин искал строку только среди доступных, стрелки с
 * неё не работали бы.
 */
describe('клавиша со строки выключенного элемента — списка', () => {
	it('стрелки двигают подсветку мимо него и отменяются', async () => {
		const { keyboard, items, rows } = await setup(['Один', 'Два', 'Три'])

		items[1].disabled = true

		const down = keydown(rows[1], 'ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
		expect(down.defaultPrevented).toBe(true)

		const next = keydown(rows[1], 'ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
		expect(next.defaultPrevented).toBe(true)
	})

	it.each(ACTIVATION_KEYS)('%s выбирает подсвеченное и отменяется', async (_name, key) => {
		const { facade, items, rows } = await setup(['Один', 'Два', 'Три'])

		items[1].disabled = true
		keydown(rows[1], 'ArrowDown')

		const event = keydown(rows[1], key)

		expect(facade.selected).toEqual([items[0]])
		expect(event.defaultPrevented).toBe(true)
	})
})

/** Поле или кнопка первым или последним потомком узла — так лежит содержимое слота. */
const place = (parent: Element, tag: 'input' | 'button', where: 'first' | 'last' = 'last') => {
	const element = document.createElement(tag)

	parent.insertAdjacentElement(where === 'first' ? 'afterbegin' : 'beforeend', element)

	return element
}

/**
 * Клавиши полей и кнопок из шапки, подвала и слотов элемента всплывают до
 * корня, но они не списка: что с ними делать, эти элементы знают сами. Поле
 * печатает пробел, кнопка делает из Enter и пробела клик — если клавишу не
 * отменить. Раньше список отменял их и двигал подсветку стрелками из поля.
 *
 * Правило отвечает на вопрос «чья клавиша», а не «какая»: со слота не работают
 * ни стрелки, ни Enter с пробелом. Клика из клавиши jsdom не делает — что
 * пробел печатается и кнопка нажимается, проверяет
 * `playground/vue/browser/keyboard-activation.spec.ts`.
 */
describe.each([
	['поля в шапке', ({ root }: TListBoxSetup) => place(root, 'input', 'first')],
	['кнопки в подвале', ({ root }: TListBoxSetup) => place(root, 'button')],
	['кнопки в строке элемента', ({ rows }: TListBoxSetup) => place(rows[1], 'button')],
] as const)('клавиша %s — не списка', (_from, slotted) => {
	it.each([...ARROWS, ...ACTIVATION_KEYS])(
		'%s не отменяется, подсветка и выбор не меняются',
		async (_name, key) => {
			const listBox = await setup(['Один', 'Два', 'Три'])
			const { facade, keyboard, press, items } = listBox
			const target = slotted(listBox)

			// Подсветка — с корня: Enter и пробелу есть что выбрать
			press('ArrowDown')

			const event = keydown(target, key)

			expect(event.defaultPrevented).toBe(false)
			expect(keyboard.highlightedUid).toBe(items[0].uid)
			expect(facade.selected).toEqual([])
		},
	)
})
