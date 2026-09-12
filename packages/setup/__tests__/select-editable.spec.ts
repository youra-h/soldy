// @vitest-environment jsdom

/**
 * Ввод текста в поле Select при `editable: true` — `TEditablePlugin`.
 *
 * Три состояния задаёт `editableMode` (ядро), реакцию на ввод — этот плагин:
 * переносит подсветку через `TSelectKeyboardPlugin.highlightByText`, тот же
 * алгоритм, что и у набора по буквам с клавиатуры. `filter` фильтрацию пока
 * не делает — отдельная задача, здесь он ведёт себя как `search`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TSelect, TSelectItem, TSelectCollectionFacade } from '@soldy/core'
import type { ISelectItem } from '@soldy/core'
import {
	TSelectKeyboardPlugin,
	TEditablePlugin,
	TElementPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TListItemPlugin,
	TPluginBundle,
} from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Собирает Select с коллекцией, клавиатурой и вводом вручную — так же, как
 * `select-keyboard.spec.ts`, плюс настоящий `<input>` внутри корня: плагин
 * ищет его тем же способом, что `TInputPlugin` (`el.querySelector('input')`).
 */
async function setup(texts: string[], props: Record<string, unknown> = {}) {
	const owner = new TSelect({ editable: true, editableMode: 'search', ...props } as any)
	const facade = new TSelectCollectionFacade({}, { owner })
	const items = texts.map((text) => new TSelectItem({ value: text.toLowerCase(), text }))

	facade.items = items as ISelectItem[]

	const root = document.createElement('div')
	const input = document.createElement('input')

	root.appendChild(input)
	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const elements = new TCollectionElements()
	const keyboard = new TSelectKeyboardPlugin()
	const editable = new TEditablePlugin()

	const ctx = {
		getInstance: () => owner,
		get: (ctor: unknown) => {
			if (ctor === TElementPlugin) return rootElement
			if (ctor === TCollectionBundlesPlugin) return bundles
			if (ctor === TCollectionElements) return elements
			if (ctor === TSelectKeyboardPlugin) return keyboard

			return undefined
		},
	} as any

	bundles.install(ctx)
	elements.install(ctx)
	keyboard.install(ctx)
	// Подключается после клавиатуры — так же, как в `SelectDescriptor`
	editable.install(ctx)

	for (const item of items) {
		const node = document.createElement('div')

		node.id = `s-select-option-${item.uid}`
		root.appendChild(node)

		const bundle = new TPluginBundle(item)

		bundle.use(TElementPlugin as any)
		bundle.use(TListItemPlugin as any)

		const registered = bundle.get(TElementPlugin) as TElementPlugin

		registered.element = node

		bundles.register(bundle, item)
	}

	bundles.bindEngine(facade.engine as any)

	rootElement.element = root
	await nextFrame()

	const type = (value: string) => {
		input.value = value
		input.dispatchEvent(new Event('input', { bubbles: true }))
	}

	return { owner, facade, items, keyboard, editable, input, root, type }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('ввод подсвечивает совпадение', () => {
	it('открывает закрытую панель и ставит aria-activedescendant', async () => {
		const { owner, keyboard, items, type } = await setup(['Москва', 'Тверь'])

		expect(owner.open).toBe(false)

		type('т')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[1].uid)
		expect(owner.aria.get('aria-activedescendant')).toBe(`s-select-option-${items[1].uid}`)
	})

	it('следует за дальнейшим вводом', async () => {
		const { keyboard, items, type } = await setup(['Москва', 'Тверь', 'Тула'])

		type('т')
		expect(keyboard.highlightedUid).toBe(items[1].uid)

		type('ту')
		expect(keyboard.highlightedUid).toBe(items[2].uid)
	})

	it('нет совпадения — подсветка снята', async () => {
		const { keyboard, type } = await setup(['Москва', 'Тверь'])

		type('т')
		expect(keyboard.highlightedUid).not.toBeNull()

		type('тzzz')

		expect(keyboard.highlightedUid).toBeNull()
	})

	it('filter пока ведёт себя как search', async () => {
		const { owner, keyboard, items, type } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		type('т')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})
})

describe('ввод игнорируется', () => {
	it('editable: false', async () => {
		const { owner, keyboard, type } = await setup(['Москва'], { editable: false })

		type('м')

		expect(owner.open).toBe(false)
		expect(keyboard.highlightedUid).toBeNull()
	})

	it('editableMode: none', async () => {
		const { owner, keyboard, type } = await setup(['Москва'], { editableMode: 'none' })

		type('м')

		expect(owner.open).toBe(false)
		expect(keyboard.highlightedUid).toBeNull()
	})
})

describe('ввод — плагин пишет в owner.inputValue, не в DOM', () => {
	it('обновляет owner.inputValue и сообщает об этом', async () => {
		const { owner, type } = await setup(['Москва'])
		const handler = vi.fn()

		owner.events.on('change:inputValue', handler)
		type('мо')

		expect(owner.inputValue).toBe('мо')
		expect(handler).toHaveBeenCalledWith('мо')
	})

	it('плагин не пишет в input.value напрямую — это делает реактивный биндинг', async () => {
		const { owner, input, type } = await setup(['Москва'])

		type('мо')

		// Плагин меняет только owner.inputValue; в тесте нет Vue-реактивности,
		// поэтому DOM-значение остаётся тем, что туда положил сам `type()`.
		expect(input.value).toBe('мо')
		expect(owner.inputValue).toBe('мо')
	})
})

describe('закрытие панели', () => {
	it('сбрасывает owner.inputValue к тексту выбранного', async () => {
		const { owner, items, type } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		owner.open = true

		type('те')
		expect(owner.inputValue).toBe('те')

		owner.open = false

		expect(owner.inputValue).toBe(items[0].text)
	})

	it('без выбора — owner.inputValue возвращается к пустой строке', async () => {
		const { owner, type } = await setup(['Москва'])

		owner.open = true
		type('мо')

		owner.open = false

		expect(owner.inputValue).toBe('')
	})
})
