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
	TPluginBundle,
} from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Собирает ListBox с коллекцией и клавиатурой без адаптера фреймворка. */
async function setup(texts: string[]) {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text.toLowerCase(), text }))

	facade.items = items as IListBoxItem[]

	const root = document.createElement('div')

	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const keyboard = new TListKeyboardPlugin()

	const ctx = createPluginContext(owner, [rootElement, bundles])

	bundles.install(ctx)
	keyboard.install(ctx)

	const itemPlugins = new Map<string | number, TListItemPlugin>()

	for (const item of items) {
		const bundle = new TPluginBundle(item)

		bundle.use(TListItemPlugin)
		itemPlugins.set(item.uid, required(bundle.get(TListItemPlugin), 'TListItemPlugin'))
		bundles.register(bundle, item)
	}

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()

	const press = (key: string) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

	return { owner, facade, items, keyboard, press, itemPlugins }
}

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

	it('недоступные элементы не пропускаются — в отличие от Select', async () => {
		// ListBox не combobox: выбор здесь может быть заблокирован самим
		// элементом, но навигация по списку остаётся сплошной
		const { keyboard, press, items } = await setup(['Один', 'Два', 'Три'])

		items[1].disabled = true

		press('ArrowDown')
		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[1].uid)
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
 *
 * Выключается элемент уже после подсветки: так проверка не зависит от того,
 * останавливается ли навигация на выключенных.
 */
describe('выключенный элемент не выбирается', () => {
	type TListBoxSetup = Awaited<ReturnType<typeof setup>>

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
