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
import { TSelect, TSelectItem, TSelectCollectionFacade, TItemContextRegistry } from '@soldy/core'
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
 *
 * `layoutProps` — списочные свойства поля: клавиатура читает `scrollBehavior`
 * прямо у инстанса.
 */
async function setup(
	texts: string[],
	props: Record<string, unknown> = {},
	layoutProps: { scrollBehavior?: string } = {},
) {
	const owner = new TSelect({ ...props, ...layoutProps } as any)
	const facade = new TSelectCollectionFacade({}, { owner })
	const items = texts.map((text) => new TSelectItem({ value: text.toLowerCase(), text }))

	facade.items = items as ISelectItem[]

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

	/** jsdom не умеет `scrollIntoView` — подменяем, чтобы видеть вызовы. */
	const scrolls: Array<Record<string, unknown> | undefined> = []

	// Каждой опции — свой bundle с элементом и плагином подсветки
	const itemPlugins = new Map<string | number, TListItemPlugin>()

	for (const item of items) {
		const node = document.createElement('div')

		node.id = `s-select-option-${item.uid}`
		node.scrollIntoView = (arg?: unknown) => {
			scrolls.push(arg as Record<string, unknown> | undefined)
		}
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

	bundles.bindEngine(facade.engine as any)

	rootElement.element = root
	await nextFrame()

	const press = (key: string, init: KeyboardEventInit = {}) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

	const registry = new TItemContextRegistry(facade.engine.getCore())

	return { owner, facade, items, keyboard, press, itemPlugins, registry, root, scrolls }
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

	/**
	 * Тема красит подсвеченную опцию по `data-highlighted`, и приведение к
	 * строке делает плагин, а не разметка. Раньше это было в шаблонах, и два
	 * компонента успели разойтись: ListBox отдавал значение сырым, Select — как
	 * `String(!!value)`.
	 */
	it('подсветка уезжает в data-highlighted опции', async () => {
		const { press, items } = await setup(['Москва', 'Тверь'])

		expect(items.map((item) => item.dataset.get('highlighted'))).toEqual(['false', 'false'])

		press('ArrowDown')
		press('ArrowDown')

		expect(items[0].dataset.get('highlighted')).toBe('false')
		expect(items[1].dataset.get('highlighted')).toBe('true')
	})

	/** ARIA и `data-*` — разные контракты, набор у каждого свой. */
	it('подсветка не попадает в набор ARIA опции', async () => {
		const { press, items } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')

		expect(items[0].aria.has('data-highlighted')).toBe(false)
		expect(items[0].aria.has('aria-highlighted')).toBe(false)
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

/**
 * `scrollBehavior` — свойство поля, а прокручивает опцию клавиатура.
 *
 * У ListBox то же свойство читает `TListScrollPlugin`, и это не дублирование:
 * там прокрутка идёт за выбором, здесь — за подсветкой, которая живёт только
 * пока панель открыта. Общим сделано свойство, а не реализация — иначе Select
 * тащил бы плагин, половина которого ему не нужна.
 */
describe('прокрутка к подсвеченной опции', () => {
	it('по умолчанию прокручивает плавно и по ближайшему краю', async () => {
		const { press, scrolls } = await setup(['Москва', 'Тверь'])

		press('ArrowDown')

		expect(scrolls).toEqual([{ block: 'nearest', behavior: 'smooth' }])
	})

	it('instant доезжает до вызова', async () => {
		const { press, scrolls } = await setup(['Москва', 'Тверь'], {}, { scrollBehavior: 'instant' })

		press('ArrowDown')

		expect(scrolls).toEqual([{ block: 'nearest', behavior: 'instant' }])
	})

	it('none отменяет прокрутку, но не подсветку', async () => {
		const { press, scrolls, keyboard, items } = await setup(
			['Москва', 'Тверь'],
			{},
			{ scrollBehavior: 'none' },
		)

		press('ArrowDown')

		expect(scrolls).toEqual([])
		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('смена свойства на лету доходит до следующей прокрутки', async () => {
		const { press, scrolls, owner } = await setup(['Москва', 'Тверь', 'Клин'])

		press('ArrowDown')
		owner.scrollBehavior = 'none'
		press('ArrowDown')

		expect(scrolls).toHaveLength(1)
	})
})

/**
 * `editable` — минимальная логика ввода: клавиатура не должна отбирать у
 * текста поля клавиши, которые ему принадлежат. Стрелки, `Enter`, `Escape`,
 * `Tab` — работают как в select-only, это и проверяет предыдущий набор
 * describe-блоков без флага `editable`.
 */
describe('editable — печатные клавиши принадлежат тексту, не навигации', () => {
	it('печатный символ не открывает панель и не запускает набор по буквам', async () => {
		const { owner, keyboard, press } = await setup(['Москва', 'Тверь'], { editable: true })

		press('т')

		expect(owner.open).toBe(false)
		expect(keyboard.highlightedUid).toBeNull()
	})

	it('пробел не открывает закрытую панель', async () => {
		const { owner, press } = await setup(['Москва'], { editable: true })

		press(' ')

		expect(owner.open).toBe(false)
	})

	it('Home/End не открывают закрытую панель', async () => {
		const { owner, press } = await setup(['Москва'], { editable: true })

		press('Home')
		press('End')

		expect(owner.open).toBe(false)
	})

	it('стрелки и Enter по-прежнему открывают панель', async () => {
		const { owner, press } = await setup(['Москва'], { editable: true })

		press('ArrowDown')

		expect(owner.open).toBe(true)
	})

	it('в открытой панели Home/End не двигают подсветку — курсор идёт по тексту', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь', 'Тула'], {
			editable: true,
		})

		press('ArrowDown')
		press('End')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('пробел в открытой панели не выбирает подсвеченное', async () => {
		const { owner, press } = await setup(['Москва'], { editable: true })

		press('ArrowDown')
		press(' ')

		expect(owner.value).toBeUndefined()
		expect(owner.open).toBe(true)
	})

	it('Enter в открытой панели по-прежнему выбирает и закрывает', async () => {
		const { owner, press, items } = await setup(['Москва'], { editable: true })

		press('ArrowDown')
		press('Enter')

		expect(owner.value).toBe(items[0].value)
		expect(owner.open).toBe(false)
	})

	it('печатный символ в открытой панели не запускает набор по буквам', async () => {
		const { keyboard, press, items } = await setup(['Москва', 'Тверь'], { editable: true })

		press('ArrowDown')
		press('т')

		expect(keyboard.highlightedUid).toBe(items[0].uid)
	})

	it('Escape и Tab закрывают как обычно', async () => {
		const { owner, press } = await setup(['Москва'], { editable: true })

		press('ArrowDown')
		press('Escape')

		expect(owner.open).toBe(false)
	})
})
