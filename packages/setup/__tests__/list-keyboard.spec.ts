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
	const collection = new TListBoxCollectionFacade({}, { owner })
	const items = texts.map((text) => new TListBoxItem({ value: text.toLowerCase(), text }))

	collection.items = items as IListBoxItem[]

	const root = document.createElement('div')

	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const keyboard = new TListKeyboardPlugin()

	const ctx = {
		getInstance: () => owner,
		get: (ctor: unknown) => {
			if (ctor === TElementPlugin) return rootElement
			if (ctor === TCollectionBundlesPlugin) return bundles

			return undefined
		},
	} as any

	bundles.install(ctx)
	keyboard.install(ctx)

	const itemPlugins = new Map<string | number, TListItemPlugin>()

	for (const item of items) {
		const bundle = new TPluginBundle(item)

		bundle.use(TListItemPlugin as any)
		itemPlugins.set(item.uid, bundle.get(TListItemPlugin) as TListItemPlugin)
		bundles.register(bundle, item)
	}

	bundles.bindEngine(collection.engine as any)

	rootElement.element = root
	await nextFrame()

	const press = (key: string) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

	return { owner, collection, items, keyboard, press, itemPlugins }
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

		expect(itemPlugins.get(items[0].uid)!.highlighted).toBe(false)
		expect(itemPlugins.get(items[1].uid)!.highlighted).toBe(true)
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
		const { collection, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press('Enter')

		expect(collection.selected).toEqual([items[0]])
	})

	it('Space делает то же самое', async () => {
		const { collection, press, items } = await setup(['Один', 'Два'])

		press('ArrowDown')
		press(' ')

		expect(collection.selected).toEqual([items[0]])
	})

	it('повторное нажатие снимает выбор', async () => {
		const { collection, press } = await setup(['Один'])

		press('ArrowDown')
		press('Enter')
		press('Enter')

		expect(collection.selected).toEqual([])
	})

	it('без подсветки Enter ничего не делает', async () => {
		const { collection, press } = await setup(['Один'])

		press('Enter')

		expect(collection.selected).toEqual([])
	})
})

describe('подсветка следует за выбором', () => {
	it('встаёт на выбранный элемент при появлении коллекции', async () => {
		// Позиция запоминается без визуальной отметки: навигация ещё не началась
		const owner = new TListBox()
		const collection = new TListBoxCollectionFacade({}, { owner })
		const items = [
			new TListBoxItem({ value: 'a', text: 'A' }),
			new TListBoxItem({ value: 'b', text: 'B' }),
		]

		collection.items = items as IListBoxItem[]
		collection.engine.extensions.selection.select(items[1] as IListBoxItem)

		const bundles = new TCollectionBundlesPlugin()
		const keyboard = new TListKeyboardPlugin()
		const ctx = {
			getInstance: () => owner,
			get: (ctor: unknown) => (ctor === TCollectionBundlesPlugin ? bundles : undefined),
		} as any

		bundles.install(ctx)
		keyboard.install(ctx)
		bundles.bindEngine(collection.engine as any)

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('переезжает, когда выбор меняют снаружи', async () => {
		const { collection, keyboard, items } = await setup(['Один', 'Два'])

		collection.engine.extensions.selection.select(items[1] as IListBoxItem)

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
