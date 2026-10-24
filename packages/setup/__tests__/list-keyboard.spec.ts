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
 * Корень — рамка: шапка, узел списка и подвал. Клавишу список берёт только с
 * узла списка — остановки Tab с ролью `listbox` — и со строки элемента, на
 * которой фокус остаётся после клика. Клавиша со строки — клавиша списка с
 * места этой строки: позиция встаёт на её элемент, фокус возвращается узлу
 * списка. До корня всплывают и клавиши полей и кнопок из шапки, подвала и
 * слотов элемента — их плагин не трогает.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { createPluginContext, required } from './helpers'
import { TListBox, TListBoxItem, TListBoxCollectionFacade } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import {
	TListKeyboardPlugin,
	TListItemPlugin,
	TElementPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TOptionIdsPlugin,
	TPluginBundle,
} from '@soldy-ui/plugins'

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
 * Клавиша со строки, на которой фокус, — как после клика по ней: у строки
 * `tabindex="-1"`, и клик оставляет фокус на ней.
 */
const pressOnRow = (row: HTMLElement, key: string) => {
	row.focus()

	return keydown(row, key)
}

/**
 * Собирает ListBox с коллекцией и клавиатурой без адаптера фреймворка.
 *
 * Разметка — как у `ListBox.vue` и `Item.vue`: в корне — узел списка с ролью
 * `listbox` и `tabindex="0"` (набор `aria` списка разметка кладёт на него), в
 * нём у каждого элемента свой узел (`TElementPlugin` в его bundle, узлы отдаёт
 * `TCollectionElements`), внутри узла — строка с `tabindex="-1"`. В разметке
 * атрибут приходит из набора `aria` элемента, его пишет `TListBoxExtension`;
 * по нему плагин и узнаёт строку. `id` элементу пишет его плагин `id`
 * (`TOptionIdsPlugin`) — от монтирования, как у адаптера.
 */
async function setup(texts: string[]) {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text.toLowerCase(), text }))

	facade.items = items as IListBoxItem[]

	const root = document.createElement('div')
	const list = document.createElement('div')

	list.setAttribute('role', 'listbox')
	list.setAttribute('tabindex', '0')
	root.appendChild(list)
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

	for (const [index, item] of items.entries()) {
		const node = document.createElement('div')
		const row = document.createElement('div')

		row.setAttribute('tabindex', '-1')
		node.appendChild(row)
		list.appendChild(node)
		rows.push(row)

		const bundle = new TPluginBundle(item, `m${index + 1}`)

		bundle.use(TElementPlugin)
		bundle.use(TListItemPlugin)
		bundle.use(TOptionIdsPlugin)

		required(bundle.get(TElementPlugin), 'TElementPlugin').element = node
		itemPlugins.set(item.uid, required(bundle.get(TListItemPlugin), 'TListItemPlugin'))
		bundles.register(bundle, item)
	}

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()

	/** Клавиша с узла списка — там фокус после Tab. */
	const press = (key: string) => keydown(list, key)

	return { owner, facade, items, keyboard, press, itemPlugins, root, list, rows }
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

/** Стрелка и то, куда она ведёт со строки второго из трёх элементов. */
const ARROWS_FROM_SECOND = [
	['стрелка вниз', 'ArrowDown', 2],
	['стрелка вверх', 'ArrowUp', 0],
] as const

/** Отметки подсветки всех элементов по порядку — их пишет `TListItemPlugin`. */
const marks = ({ items, itemPlugins }: TListBoxSetup) =>
	items.map((item) => required(itemPlugins.get(item.uid), 'плагин элемента').highlighted)

/**
 * Слушатель висит на корне, и до него всплывают клавиши всего, что лежит под
 * корнем. Список берёт клавишу с узла списка — там фокус после Tab. Свою
 * клавишу список отменяет: пробел иначе прокрутил бы страницу.
 */
describe('клавиша с узла списка — списка', () => {
	it('стрелки двигают подсветку и отменяются', async () => {
		const { keyboard, press, items } = await setup(['Один', 'Два', 'Три'])

		const down = press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
		expect(down.defaultPrevented).toBe(true)

		const up = press('ArrowUp')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
		expect(up.defaultPrevented).toBe(true)
	})

	it.each(ACTIVATION_KEYS)('%s выбирает подсвеченное и отменяется', async (_name, key) => {
		const { facade, press, items } = await setup(['Один', 'Два', 'Три'])

		press('ArrowDown')

		const event = press(key)

		expect(facade.selected).toEqual([items[0]])
		expect(event.defaultPrevented).toBe(true)
	})
})

/**
 * Клавиша со строки — клавиша списка с места этой строки. У строки
 * `tabindex="-1"`, и после клика фокус остаётся на ней. Клавиша ставит позицию
 * на элемент строки, возвращает фокус узлу списка и идёт дальше так же, как с
 * узла. Раньше фокус оставался на строке, и после клавиши браузер включал ей
 * `:focus-visible`: кольцо висело на строке до ухода из списка, пока подсветка
 * ходила по другим элементам (браузерный прогон —
 * `playground/vue/browser/keyboard-activation.spec.ts`). А стрелка шла от
 * позиции списка — с края или, в `multiple`, от первого выбранного.
 *
 * Строка — не первого элемента: так видно, что плагин узнаёт строку любого
 * показанного элемента и шагает от неё, а не от края.
 */
describe('клавиша со строки элемента — списка, с места строки', () => {
	/**
	 * Правило — для любой клавиши, не только для своих клавиш списка: Tab и
	 * буква тоже возвращают фокус узлу.
	 */
	it.each([...ARROWS, ...ACTIVATION_KEYS, ['Tab', 'Tab'], ['буква', 'a']] as const)(
		'%s возвращает фокус узлу списка',
		async (_name, key) => {
			const { list, rows } = await setup(['Один', 'Два', 'Три'])

			pressOnRow(rows[1], key)

			expect(document.activeElement).toBe(list)
		},
	)

	it.each(ARROWS_FROM_SECOND)('%s шагает от строки и отменяется', async (_name, key, target) => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { keyboard, items, rows } = listBox

		const event = pressOnRow(rows[1], key)

		expect(keyboard.highlightedUid).toBe(items[target].uid)
		expect(event.defaultPrevented).toBe(true)
		// Отметка — только у элемента под стрелкой: позиция на строке её не ставит
		expect(marks(listBox)).toEqual(items.map((_item, index) => index === target))
	})

	it.each(ACTIVATION_KEYS)('%s переключает элемент строки и отменяется', async (_name, key) => {
		const { facade, items, rows } = await setup(['Один', 'Два', 'Три'])

		const event = pressOnRow(rows[1], key)

		expect(facade.selected).toEqual([items[1]])
		expect(event.defaultPrevented).toBe(true)

		pressOnRow(rows[1], key)

		expect(facade.selected).toEqual([])
	})

	it('следующая клавиша — уже с узла — идёт от новой подсветки', async () => {
		const { keyboard, press, items, rows } = await setup(['Один', 'Два', 'Три', 'Четыре'])

		pressOnRow(rows[1], 'ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[2].uid)

		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[3].uid)
	})

	/**
	 * Позиция следует за выбором и в `multiple` стоит на первом выбранном, а
	 * клик по строке оставляет фокус на этой строке: стрелка с неё шла от
	 * первого выбранного.
	 */
	it('в multiple стрелка шагает от строки, а не от первого выбранного', async () => {
		const { facade, keyboard, items, rows } = await setup(['Один', 'Два', 'Три', 'Четыре'])

		facade.mode = 'multiple'
		facade.engine.extensions.selection.select(items[0] as IListBoxItem)

		// Без этого проверка ниже не отличила бы строку от позиции списка
		expect(keyboard.highlightedUid).toBe(items[0].uid)

		pressOnRow(rows[2], 'ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[3].uid)
	})

	/**
	 * Tab список не отменяет: фокус переводит браузер, но уже от узла списка, —
	 * и Tab выводит из ListBox одним нажатием, а Shift+Tab не останавливается
	 * на самом узле, предке строки. Самого перехода jsdom не делает — его
	 * проверяет браузерный прогон.
	 */
	it('Tab не отменяется: фокус до перехода — на узле списка', async () => {
		const { list, rows } = await setup(['Один', 'Два'])

		const event = pressOnRow(rows[1], 'Tab')

		expect(document.activeElement).toBe(list)
		expect(event.defaultPrevented).toBe(false)
	})
})

/**
 * Строка выключенного элемента — тоже строка списка. Навигация элемент
 * пропускает, но фокус на его строке бывает: элемент могли выключить, пока
 * фокус на ней, а если тема не глушит мышь на выключенной строке, фокус на неё
 * ставит и клик. Если бы плагин искал строку только среди доступных, клавиши с
 * неё не работали бы. Клавиша идёт от места строки: стрелка — к соседнему
 * доступному, а Enter и пробел ничего не выбирают — выключенному элементу
 * отказывает список.
 */
describe('клавиша со строки выключенного элемента — списка', () => {
	it.each(ARROWS_FROM_SECOND)(
		'%s ведёт к соседнему доступному и отменяется',
		async (_name, key, target) => {
			const { keyboard, list, items, rows } = await setup(['Один', 'Два', 'Три'])

			items[1].disabled = true

			const event = pressOnRow(rows[1], key)

			expect(keyboard.highlightedUid).toBe(items[target].uid)
			expect(event.defaultPrevented).toBe(true)
			expect(document.activeElement).toBe(list)
		},
	)

	it.each(ACTIVATION_KEYS)('%s ничего не выбирает и отменяется', async (_name, key) => {
		const { facade, press, items, rows } = await setup(['Один', 'Два', 'Три'])

		// Подсветка — на доступном элементе: клавиша с узла выбрала бы его
		press('ArrowDown')
		items[1].disabled = true

		const event = pressOnRow(rows[1], key)

		expect(facade.selected).toEqual([])
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
 * Кнопка на `div` в шапке — остановка Tab, как узел списка: `Button` на
 * чужом теге пишет себе `tabindex="0"`. Стоит в корне раньше узла списка, и
 * правило «первый ребёнок корня с `tabindex`» приняло бы её за список.
 */
const placeDivButton = (root: Element) => {
	const element = document.createElement('div')

	element.setAttribute('role', 'button')
	element.setAttribute('tabindex', '0')
	root.insertAdjacentElement('afterbegin', element)

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
 *
 * Шапка и подвал — дети корня рядом с узлом списка, а не внутри него: в
 * `listbox` ARIA пускает только опции. Сам корень — только рамка: клавиша с
 * него тоже не списка. Фокус такая клавиша не трогает: узлу списка его
 * возвращает только клавиша со строки, а из поля в шапке он увёл бы ввод.
 */
describe.each([
	['поля в шапке', ({ root }: TListBoxSetup) => place(root, 'input', 'first')],
	['кнопки на div в шапке', ({ root }: TListBoxSetup) => placeDivButton(root)],
	['кнопки в подвале', ({ root }: TListBoxSetup) => place(root, 'button')],
	['кнопки в строке элемента', ({ rows }: TListBoxSetup) => place(rows[1], 'button')],
	['самого корня', ({ root }: TListBoxSetup) => root],
] as const)('клавиша %s — не списка', (_from, slotted) => {
	it.each([...ARROWS, ...ACTIVATION_KEYS])(
		'%s не отменяется, подсветка, выбор и фокус не меняются',
		async (_name, key) => {
			const listBox = await setup(['Один', 'Два', 'Три'])
			const { facade, keyboard, press, items } = listBox
			const target = slotted(listBox)

			// Подсветка — с узла списка: Enter и пробелу есть что выбрать
			press('ArrowDown')

			// Корень без `tabindex` фокуса не берёт — тогда он остаётся у `body`
			target.focus()

			const focused = document.activeElement
			const event = keydown(target, key)

			expect(event.defaultPrevented).toBe(false)
			expect(keyboard.highlightedUid).toBe(items[0].uid)
			expect(facade.selected).toEqual([])
			expect(document.activeElement).toBe(focused)
		},
	)
})

/**
 * Фокус ListBox — на узле списка, элемент под стрелками — отметка, и по APG
 * его называет `aria-activedescendant` узла с фокусом: без ссылки стрелки для
 * скринридера немые. Ссылку клавиатура пишет в набор `aria` списка — разметка
 * кладёт его на узел списка, — на `id` элемента из его набора
 * (`TOptionIdsPlugin`). Ссылка повторяет экран: есть, пока у элемента видна
 * отметка и он в документе. Позиция без отметки — за выбором или на строке, с
 * которой пришла клавиша, — ссылкой не становится.
 */
describe('ссылка на элемент под стрелками', () => {
	/** Ссылка узла списка — из набора `aria` списка. */
	const activeDescendant = ({ owner }: TListBoxSetup) =>
		owner.aria.get('aria-activedescendant') ?? null

	/** `id` элемента — из его набора, как его кладёт разметка. */
	const idOf = ({ facade }: TListBoxSetup, index: number) =>
		facade.engine.extensions.batch.items[index]?.aria.get('id') ?? null

	it('до клавиш ссылки нет — и когда позиция стоит на выбранном', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { facade, keyboard } = listBox

		expect(activeDescendant(listBox)).toBeNull()

		facade.engine.extensions.selection.select(facade.engine.extensions.batch.items[1])

		expect(keyboard.highlightedUid).toBe(facade.engine.extensions.batch.items[1].uid)
		expect(activeDescendant(listBox)).toBeNull()
	})

	it('↓ — на `id` подсвеченного, следующая ↓ — на следующий', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])

		listBox.press('ArrowDown')

		expect(idOf(listBox, 0)).toBe('m1-option')
		expect(activeDescendant(listBox)).toBe(idOf(listBox, 0))

		listBox.press('ArrowDown')

		expect(activeDescendant(listBox)).toBe(idOf(listBox, 1))
	})

	it('стрелка со строки — на элемент, следующий за строкой', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])

		pressOnRow(listBox.rows[0], 'ArrowDown')

		expect(activeDescendant(listBox)).toBe(idOf(listBox, 1))
	})

	/**
	 * Клавиша со строки ставит позицию на её элемент без отметки, и отметка
	 * прежнего элемента гаснет. Tab шага не делает — позиция без отметки, и
	 * ссылки нет.
	 */
	it('Tab со строки — отметка погасла, и ссылка снята', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])

		listBox.press('ArrowDown')
		pressOnRow(listBox.rows[2], 'Tab')

		expect(marks(listBox)).toEqual([false, false, false])
		expect(activeDescendant(listBox)).toBeNull()
	})

	it('выбор из кода уводит позицию без отметки — ссылка снята', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { facade } = listBox

		listBox.press('ArrowDown')
		facade.engine.extensions.selection.select(facade.engine.extensions.batch.items[2])

		expect(marks(listBox)).toEqual([false, false, false])
		expect(activeDescendant(listBox)).toBeNull()
	})

	it('подсвеченный убрали из данных — ссылка снята', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { batch } = listBox.facade.engine.extensions

		listBox.press('ArrowDown')
		batch.remove([batch.items[0]])

		expect(activeDescendant(listBox)).toBeNull()
	})

	it('убрали другой элемент — ссылка на месте', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])
		const { batch } = listBox.facade.engine.extensions

		listBox.press('ArrowDown')

		const reference = activeDescendant(listBox)

		batch.remove([batch.items[2]])

		expect(activeDescendant(listBox)).toBe(reference)
	})

	it('клавиатуру уничтожили — ссылка снята вместе с отметкой', async () => {
		const listBox = await setup(['Один', 'Два', 'Три'])

		listBox.press('ArrowDown')
		listBox.keyboard.destroy()

		expect(marks(listBox)).toEqual([false, false, false])
		expect(activeDescendant(listBox)).toBeNull()
	})
})
