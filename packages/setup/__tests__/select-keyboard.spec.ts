// @vitest-environment jsdom

/**
 * Клавиатура Select — паттерн APG Combobox, вариант select-only.
 *
 * Ключевое свойство: DOM-фокус никогда не уходит с поля. Поэтому `keydown`
 * ловит корень Select, а подсветка опции передаётся скринридеру через
 * `aria-activedescendant`. Проверяется вся модель целиком: она и есть то, чем
 * доступный выпадающий список отличается от недоступного.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	TSelect,
	TSelectItem,
	TSelectCollectionFacade,
	TItemContextRegistry,
} from '@soldy/core'
import type { ISelectItem } from '@soldy/core'
import {
	TSelectKeyboardPlugin,
	TElementPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TListItemPlugin,
	TPluginBundle,
} from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Собирает Select с коллекцией и клавиатурой вручную: без адаптера
 * фреймворка, чтобы проверять именно модель, а не проводку Vue.
 */
async function setup(texts: string[], props: Record<string, unknown> = {}) {
	const owner = new TSelect(props as any)
	const collection = new TSelectCollectionFacade({}, { owner })
	const items = texts.map((text) => new TSelectItem({ value: text.toLowerCase(), text }))

	collection.items = items as ISelectItem[]

	const root = document.createElement('div')

	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const elements = new TCollectionElements()
	const keyboard = new TSelectKeyboardPlugin()

	const ctx = {
		getInstance: () => owner,
		get: (ctor: unknown) => {
			if (ctor === TElementPlugin) return rootElement
			if (ctor === TCollectionBundlesPlugin) return bundles
			if (ctor === TCollectionElements) return elements

			return undefined
		},
	} as any

	bundles.install(ctx)
	elements.install(ctx)
	keyboard.install(ctx)

	// Каждой опции — свой bundle с элементом и плагином подсветки
	const itemPlugins = new Map<string | number, TListItemPlugin>()

	for (const item of items) {
		const node = document.createElement('div')

		node.id = `s-select-option-${item.uid}`
		node.scrollIntoView = () => {}
		root.appendChild(node)

		const bundle = new TPluginBundle(item)
		const itemElement = new TElementPlugin()

		bundle.use(TElementPlugin as any)
		bundle.use(TListItemPlugin as any)

		const registered = bundle.get(TElementPlugin) as TElementPlugin
		const highlight = bundle.get(TListItemPlugin) as TListItemPlugin

		registered.element = node
		itemPlugins.set(item.uid, highlight)
		void itemElement

		bundles.register(bundle, item)
	}

	bundles.bindEngine(collection.engine as any)

	rootElement.element = root
	await nextFrame()

	const press = (key: string, init: KeyboardEventInit = {}) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

	const registry = new TItemContextRegistry(collection.engine.getCore())

	return { owner, collection, items, keyboard, press, itemPlugins, registry, root }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('закрытая панель', () => {
	it('стрелка вниз открывает и встаёт на первую опцию', async () => {
		const { owner, keyboard, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('стрелка вверх открывает и встаёт на последнюю — попасть в конец одним нажатием', async () => {
		const { owner, keyboard, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowUp')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('Enter открывает', async () => {
		const { owner, press } = await setup(['Москва'])

		press('Enter')

		expect(owner.open).toBe(true)
	})

	it('печатный символ открывает и ищет опцию', async () => {
		const { owner, keyboard, press, items } = await setup(['Москва', 'Тверь'])

		press('т')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('disabled не открывает', async () => {
		const { owner, press } = await setup(['Москва'], { disabled: true })

		press('ArrowDown')

		expect(owner.open).toBe(false)
	})

	it('readonly не открывает: выбор — единственный способ сменить значение', async () => {
		const { owner, press } = await setup(['Москва'], { readonly: true })

		press('ArrowDown')

		expect(owner.open).toBe(false)
	})
})

describe('открытая панель — навигация', () => {
	it('стрелки двигают подсветку', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'])

		press('ArrowDown')
		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[1].uid)

		press('ArrowUp')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('навигация зациклена', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('ArrowDown')
		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('Home и End прыгают к краям', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'])

		press('ArrowDown')
		press('End')

		expect(keyboard.highlightedUid).toBe(items[2].uid)

		press('Home')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('disabled-опции пропускаются', async () => {
		// Подсветить то, что нельзя выбрать, значит завести в тупик
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'])

		items[1].disabled = true

		press('ArrowDown')
		press('ArrowDown')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
	})

	it('подсветка помечает опцию через её плагин', async () => {
		const { press, items, itemPlugins } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('ArrowDown')

		expect(itemPlugins.get(items[0].uid)!.highlighted).toBe(false)
		expect(itemPlugins.get(items[1].uid)!.highlighted).toBe(true)
	})
})

describe('открытая панель — выбор и закрытие', () => {
	it('Enter выбирает подсвеченное и закрывает', async () => {
		const { owner, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('ArrowDown')
		press('Enter')

		expect(owner.value).toBe(items[1].value)
		expect(owner.open).toBe(false)
	})

	it('Escape закрывает, не меняя значения', async () => {
		const { owner, press } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('Escape')

		expect(owner.open).toBe(false)
		expect(owner.value).toBeUndefined()
	})

	it('Tab закрывает — фокус должен уйти дальше по форме', async () => {
		const { owner, press } = await setup(['Москва'])

		press('ArrowDown')
		press('Tab')

		expect(owner.open).toBe(false)
	})

	it('закрытие снимает подсветку — она про навигацию, а не про выбор', async () => {
		const { owner, keyboard, press } = await setup(['Москва'])

		press('ArrowDown')
		expect(keyboard.highlightedUid).not.toBeNull()

		owner.open = false

		expect(keyboard.highlightedUid).toBeNull()
	})

	it('открытие встаёт на уже выбранное', async () => {
		const { owner, keyboard, items } = await setup(['Москва', 'Тверь'])

		owner.value = items[1].value
		owner.open = true

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})
})

describe('aria-activedescendant', () => {
	it('указывает на id подсвеченной опции', async () => {
		const { owner, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')

		expect(owner.aria.get('aria-activedescendant')).toBe(`s-select-option-${items[0].uid}`)
	})

	it('следует за навигацией', async () => {
		const { owner, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('ArrowDown')

		expect(owner.aria.get('aria-activedescendant')).toBe(`s-select-option-${items[1].uid}`)
	})

	it('снимается при закрытии', async () => {
		const { owner, press } = await setup(['Москва'])

		press('ArrowDown')
		owner.open = false

		expect(owner.aria.has('aria-activedescendant')).toBe(false)
	})

	it('ссылается на тот же id, что стоит на опции', async () => {
		// Формула одна на обе стороны: разнеси её — и они разойдутся
		const { owner, press, items } = await setup(['Москва'])

		press('ArrowDown')

		expect(owner.aria.get('aria-activedescendant')).toBe(items[0].aria.get('id'))
	})
})

describe('набор по буквам', () => {
	it('ищет по началу текста', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'])

		press('ArrowDown')
		press('т')

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('накапливает буфер: «ту» находит Тулу, а не Тверь', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'])

		press('ArrowDown')
		press('т')
		press('у')

		expect(keyboard.highlightedUid).toBe(items[2].uid)
	})

	it('регистр не важен', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')
		press('Т')

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('сочетание с модификатором набором не считается', async () => {
		// Ctrl+F — поиск в браузере, а не переход к опции на «ф»
		const { keyboard, press, items } = await setup(['Москва', 'Фрязино'])

		press('ArrowDown')
		press('ф', { ctrlKey: true })

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})
})
