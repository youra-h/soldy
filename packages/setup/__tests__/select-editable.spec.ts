// @vitest-environment jsdom

/**
 * Ввод текста в поле Select при `editable: true` — `TEditablePlugin`.
 *
 * Три состояния задаёт `editableMode` (ядро), реакцию на ввод — этот плагин,
 * по функции на режим: `search` переносит подсветку через
 * `TSelectKeyboardPlugin.highlightByText` — тем же методом, что и у набора по
 * буквам с клавиатуры, но со сравнением по вхождению подстроки без учёта
 * регистра, а не по началу строки (см. `select-keyboard.spec.ts` — там набор
 * по буквам ищет только начало), `filter` отдаёт набранное в `filter.query`
 * коллекции. Слушателя `input` плагин держит только пока вводу есть на что
 * влиять — `editable: true` и режим не `none`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import type { ISelectProps } from '@soldy/core'
import { createPluginContext, required } from './helpers'
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
async function setup(texts: string[], props: Partial<ISelectProps> = {}) {
	const owner = new TSelect({ editable: true, editableMode: 'search', ...props })
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

	const ctx = createPluginContext(owner, [rootElement, bundles, elements, keyboard])

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

		bundle.use(TElementPlugin)
		bundle.use(TListItemPlugin)

		const registered = required(bundle.get(TElementPlugin), 'TElementPlugin')

		registered.element = node

		bundles.register(bundle, item)
	}

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()

	const type = (value: string) => {
		input.value = value
		input.dispatchEvent(new Event('input', { bubbles: true }))
	}

	const press = (key: string, init: KeyboardEventInit = {}) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

	/** Фокус ушёл с поля — на произвольный узел или, если не задан, вникуда. */
	const blurTo = (target?: Element) => {
		input.dispatchEvent(
			new FocusEvent('focusout', { bubbles: true, relatedTarget: target ?? null }),
		)
	}

	return { owner, facade, items, keyboard, editable, input, root, type, press, blurTo }
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
		expect(owner.field.aria.get('aria-activedescendant')).toBe(
			`s-select-option-${items[1].uid}`,
		)
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

	it('ищет по подстроке в любом месте текста, без учёта регистра', async () => {
		const { keyboard, items, type } = await setup(['Первый', 'Второй', 'Третий'])

		type('ОР')
		expect(keyboard.highlightedUid).toBe(items[1].uid)

		type('вт')
		expect(keyboard.highlightedUid).toBe(items[1].uid)
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
		expect(editable.query).toBe('т')

		owner.editable = false
		// смена editable сама возвращает поле и сбрасывает набранное
		expect(editable.query).toBe('')

		type('мо')

		// слушатель снят — новый ввод до query не доходит
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

/**
 * Закрытие панели саму по себе поле не трогает — набранное остаётся, а
 * закрыть панель можно и без намерения что-то вернуть (клик по стрелке).
 * Возврат поля — двойной `Escape`: первый только закрывает, второй (уже на
 * закрытой панели) снимает набранное и отбор, пишет текст возврата.
 */
describe('двойной Escape', () => {
	it('первый закрывает панель и не трогает набранное, второй возвращает текст выбранного', async () => {
		const { owner, items, input, type, press } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		owner.open = true
		type('те')
		expect(input.value).toBe('те')

		press('Escape')
		expect(owner.open).toBe(false)
		expect(input.value).toBe('те')

		press('Escape')
		// Возврат пишет `owner.field.value`, а не DOM напрямую — значением
		// `<input>` в реальном рендере владеет вложенный `Input`
		expect(owner.field.value).toBe(items[0].text)
	})

	it('без выбора — второй Escape очищает поле', async () => {
		const { owner, input, type, press } = await setup(['Москва'])

		owner.open = true
		type('мо')

		press('Escape')
		expect(input.value).toBe('мо')

		press('Escape')
		expect(owner.field.value).toBe('')
	})

	it('снимает отбор вторым Escape, не первым', async () => {
		const { owner, facade, type, press } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		owner.open = true
		type('тв')
		expect(facade.shown.length).toBe(1)

		press('Escape')
		expect(facade.engine.extensions.filter.query).toBe('тв')
		expect(facade.shown.length).toBe(1)

		press('Escape')
		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(2)
	})

	it('закрытие кликом по стрелке (программное open=false) оставляет набранное', async () => {
		const { owner, input, type } = await setup(['Москва'])

		owner.open = true
		type('мо')

		owner.open = false

		expect(input.value).toBe('мо')
	})
})

/**
 * `focusout` — вторая точка входа в тот же возврат: фокус ушёл совсем, а не
 * переключился на телепортированную панель (`data-owner`).
 */
describe('уход фокуса', () => {
	it('фокус ушёл вникуда — поле возвращается к тексту выбранного', async () => {
		const { owner, items, type, blurTo } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		type('те')

		blurTo()

		expect(owner.field.value).toBe(items[0].text)
	})

	it('переход в панель (data-owner) поле не трогает', async () => {
		const { owner, input, type, blurTo } = await setup(['Москва'])

		type('мо')

		const panel = document.createElement('div')

		panel.setAttribute('data-owner', String(owner.uid))
		document.body.appendChild(panel)

		blurTo(panel)

		expect(input.value).toBe('мо')
	})

	it('переход внутрь корня поле не трогает', async () => {
		const { root, input, type, blurTo } = await setup(['Москва'])

		type('мо')
		blurTo(root)

		expect(input.value).toBe('мо')
	})
})

/**
 * Смена `editable`/`editableMode` на лету — набранное и отбор относились к
 * прежнему режиму, поэтому сбрасываются целиком через `_returnField`, как и
 * при обычном возврате поля.
 */
describe('смена editable/editableMode на лету', () => {
	it('filter -> search сбрасывает отбор и показывает все опции', async () => {
		const { owner, facade, type } = await setup(['Москва', 'Тверь', 'Тула'], {
			editableMode: 'filter',
		})

		type('ту')
		expect(facade.shown.length).toBe(1)

		owner.editableMode = 'search'

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(3)
	})

	it('filter -> none сбрасывает отбор', async () => {
		const { owner, facade, type } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		type('тв')
		expect(facade.shown.length).toBe(1)

		owner.editableMode = 'none'

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(2)
	})

	it('editable выключили — набранное сброшено, поле возвращено к выбранному', async () => {
		const { owner, items, editable, type } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		owner.value = items[0].value
		type('тв')
		expect(editable.query).toBe('тв')

		owner.editable = false

		expect(editable.query).toBe('')
		expect(owner.field.value).toBe(items[0].text)
	})
})

/**
 * Выбор изменился — текст поля пишет сама `TSelectExtension` (`owner.field`),
 * не этот плагин: `single` показывает выбранное сразу, `multiple` остаётся
 * пустым после каждого выбора, независимо от `editableMode`. Плагину
 * остаётся сбросить то, что относится только к вводу — набранное и отбор
 * (последний тест ниже).
 */
describe('смена выбора', () => {
	it('single — поле показывает выбранное сразу, не дожидаясь закрытия', async () => {
		const { owner, items } = await setup(['Москва', 'Тверь'])

		owner.value = items[1].value

		expect(owner.field.value).toBe(items[1].text)
	})

	it('multiple — поле пустеет после каждого выбора, в search и в filter', async () => {
		for (const editableMode of ['search', 'filter'] as const) {
			const { owner, facade, items, type } = await setup(['Москва', 'Тверь'], {
				editableMode,
			})

			facade.mode = 'multiple'
			type('мо')

			facade.engine.extensions.select.chooseItem(items[0])

			expect(owner.field.value).toBe('')
		}
	})

	it('сбрасывает набранное и отбор, текст поля уже написан расширением', async () => {
		const { owner, facade, items, type } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		type('мо')
		expect(facade.engine.extensions.filter.query).toBe('мо')

		facade.engine.extensions.select.chooseItem(items[0])

		expect(facade.engine.extensions.filter.query).toBe('')
		expect(owner.field.value).toBe(items[0].text)
	})
})
