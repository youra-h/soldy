// @vitest-environment jsdom

/**
 * Ввод текста в поле Select при `editable: true` — `TEditablePlugin`.
 *
 * Три состояния задаёт `editableMode` (ядро), реакцию на ввод — этот плагин,
 * по функции на режим: `search` переносит подсветку через
 * `TSelectKeyboardPlugin.highlightByText` (тот же алгоритм, что и у набора по
 * буквам с клавиатуры), `filter` отдаёт набранное в `filter.query` коллекции.
 * Слушателя `input` плагин держит только пока вводу есть на что влиять —
 * `editable: true` и режим не `none`.
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
})

describe('ввод фильтрует список', () => {
	it('режим filter отдаёт набранное коллекции и сужает выдачу', async () => {
		const { owner, facade, type } = await setup(['Москва', 'Тверь', 'Тула'], {
			editableMode: 'filter',
		})

		type('ту')

		expect(owner.open).toBe(true)
		expect(facade.engine.extensions.filter.query).toBe('ту')
		expect(facade.shown.map((item) => item.text)).toEqual(['Тула'])
		// хранилище фильтр не трогает
		expect(facade.items.length).toBe(3)
	})

	it('пустое поле снимает отбор', async () => {
		const { facade, type } = await setup(['Москва', 'Тверь'], { editableMode: 'filter' })

		type('тв')
		expect(facade.shown.length).toBe(1)

		type('')

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(2)
	})

	it('подсветка идёт за сузившимся списком, а не за набранным текстом', async () => {
		const { keyboard, items, type } = await setup(['Москва', 'Тверь', 'Тула'], {
			editableMode: 'filter',
		})

		// панель открылась на вводе — подсветка встала на первую из оставшихся
		type('т')
		expect(keyboard.highlightedUid).toBe(items[1].uid)

		// «Тверь» ушла из выдачи — подсветка не может остаться на скрытой опции
		type('ту')
		expect(keyboard.highlightedUid).toBe(items[2].uid)

		// не осталось ничего — подсветки нет вовсе
		type('тучто-то')
		expect(keyboard.highlightedUid).toBeNull()
	})

	it('отбор по подстроке, а не по началу текста — это не подсветка набранным', async () => {
		const { facade, type } = await setup(['Москва', 'Тверь'], { editableMode: 'filter' })

		type('верь')

		expect(facade.shown.map((item) => item.text)).toEqual(['Тверь'])
	})

	it('search не фильтрует — список остаётся целым', async () => {
		const { facade, type } = await setup(['Москва', 'Тверь'])

		type('тв')

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(2)
	})
})

describe('слушатель ввода — только пока он нужен', () => {
	it('editable: false — ввод не слушается', async () => {
		const { owner, keyboard, type } = await setup(['Москва'], { editable: false })

		type('м')

		expect(owner.open).toBe(false)
		expect(keyboard.highlightedUid).toBeNull()
	})

	it('editableMode: none — ввод не слушается', async () => {
		const { owner, keyboard, type } = await setup(['Москва'], { editableMode: 'none' })

		type('м')

		expect(owner.open).toBe(false)
		expect(keyboard.highlightedUid).toBeNull()
	})

	it('editable выключили на ходу — плагин отписался', async () => {
		const { owner, keyboard, editable, type } = await setup(['Москва', 'Тверь'])

		type('т')
		expect(keyboard.highlightedUid).not.toBeNull()

		owner.open = false
		owner.editable = false
		type('мо')

		expect(editable.query).toBe('')
	})

	it('editable включили на ходу — плагин подписался', async () => {
		const { owner, keyboard, items, type } = await setup(['Москва', 'Тверь'], {
			editable: false,
		})

		type('т')
		expect(keyboard.highlightedUid).toBeNull()

		owner.editable = true
		type('т')

		expect(keyboard.highlightedUid).toBe(items[1].uid)
	})

	it('режим сменили на none — плагин отписался', async () => {
		const { owner, editable, type } = await setup(['Москва'])

		owner.editableMode = 'none'
		type('мо')

		expect(editable.query).toBe('')
	})
})

describe('query — плагин помнит набранное', () => {
	it('обновляется по вводу и сообщает об этом', async () => {
		const { editable, type } = await setup(['Москва'])
		const handler = vi.fn()

		editable.events.on('change:query', handler)
		type('мо')

		expect(editable.query).toBe('мо')
		expect(handler).toHaveBeenCalledWith('мо')
	})
})

describe('закрытие панели', () => {
	it('сбрасывает набранное и возвращает в поле текст выбранного', async () => {
		const { owner, items, input, type } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		owner.open = true

		type('те')
		expect(input.value).toBe('те')

		owner.open = false

		expect(input.value).toBe(items[0].text)
	})

	it('снимает отбор', async () => {
		const { owner, facade, type } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		owner.open = true
		type('тв')
		expect(facade.shown.length).toBe(1)

		owner.open = false

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(2)
	})

	it('без выбора — поле возвращается к пустой строке', async () => {
		const { owner, editable, input, type } = await setup(['Москва'])

		owner.open = true
		type('мо')

		owner.open = false

		expect(input.value).toBe('')
		expect(editable.query).toBe('')
	})
})
