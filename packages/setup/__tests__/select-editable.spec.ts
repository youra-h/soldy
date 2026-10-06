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
import type { ISelectProps } from '@soldy-ui/core'
import { createPluginContext, required } from './helpers'
import { TSelect, TSelectItem, TSelectCollectionFacade } from '@soldy-ui/core'
import type { ISelectItem } from '@soldy-ui/core'
import {
	TSelectKeyboardPlugin,
	TEditablePlugin,
	TElementPlugin,
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDismissPlugin,
	TListItemPlugin,
	TPluginBundle,
	TSelectItemIdsPlugin,
} from '@soldy-ui/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Все микрозадачи позади: цепочка ожидания `finished` отработала. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Плагины, которые тест уничтожает после себя: они слушают документ. */
const destroyAfter: Array<{ destroy(): void }> = []

/**
 * Собирает Select с коллекцией, клавиатурой и вводом вручную — так же, как
 * `select-keyboard.spec.ts`, плюс настоящий `<input>` внутри корня: плагин
 * ищет его тем же способом, что `TInputPlugin` (`el.querySelector('input')`).
 *
 * `panel: true` — ещё и панель, как в `SelectDescriptor`: `TDismissPlugin` и
 * узел с его пометкой владельца (`ownerAttribute`) в документе, как
 * телепортированный Frame. По этому узлу плагин ввода узнаёт, что закрытая
 * панель ещё гаснет, а по границам `TDismissPlugin` (`isInside`) — что фокус
 * ушёл в панель или в корень. Без панели ждать нечего, и отбор снимается
 * сразу, а поле возвращается, куда бы фокус ни ушёл.
 */
async function setup(
	texts: string[],
	props: Partial<ISelectProps> = {},
	{ panel: withPanel = false }: { panel?: boolean } = {},
) {
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
	const dismiss = new TDismissPlugin()

	const ctx = createPluginContext(owner, [
		rootElement,
		bundles,
		elements,
		keyboard,
		...(withPanel ? [dismiss] : []),
	])

	bundles.install(ctx)
	elements.install(ctx)

	// Нажатие мимо и пометка панели — раньше клавиатуры и ввода, как в
	// `SelectDescriptor`
	if (withPanel) {
		dismiss.install(ctx)
		destroyAfter.push(editable, dismiss)
	}

	keyboard.install(ctx)
	// Подключается после клавиатуры — так же, как в `SelectDescriptor`
	editable.install(ctx)

	const panel = document.createElement('div')

	if (withPanel) {
		for (const [name, value] of Object.entries(dismiss.ownerAttribute)) {
			panel.setAttribute(name, value)
		}

		document.body.appendChild(panel)
	}

	for (const item of items) {
		const node = document.createElement('div')

		root.appendChild(node)

		// Монтирование опции: `id` ей пишет её плагин связок
		const bundle = new TPluginBundle(item, `option-${item.value}`)

		bundle.use(TElementPlugin)
		bundle.use(TListItemPlugin)
		bundle.use(TSelectItemIdsPlugin)

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

	/**
	 * Набор целиком, как в рендере: `TInputPlugin` пишет набранное в
	 * `owner.field.value`, а `TEditablePlugin` слушает `input` того же поля.
	 * Первого в этом окружении нет, поэтому поле пишет сам тест. Нужен там,
	 * где важно, что поле показывает набранное, а не текст выбранного.
	 */
	const typeInField = (value: string) => {
		owner.field.value = value
		type(value)
	}

	/** Клавиша с поля: клавиатура комбобокса берёт клавиши только с него. */
	const press = (key: string, init: KeyboardEventInit = {}) =>
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

	/** Фокус ушёл с поля — на произвольный узел или, если не задан, вникуда. */
	const blurTo = (target?: Element) => {
		input.dispatchEvent(
			new FocusEvent('focusout', { bubbles: true, relatedTarget: target ?? null }),
		)
	}

	return {
		owner,
		facade,
		items,
		keyboard,
		editable,
		input,
		root,
		panel,
		type,
		typeInField,
		press,
		blurTo,
	}
}

/**
 * CSS-переход, как его отдаёт `getAnimations()`, — как в
 * `plugins/__tests__/scroll-lock.plugin.spec.ts`. Web Animations jsdom не
 * знает, поэтому переходы панели подставляет тест, и кончает их он же:
 * `finish()` — доиграл.
 */
class TProbeTransition {
	readonly finished: Promise<TProbeTransition>
	finish: () => void = () => {}

	constructor() {
		this.finished = new Promise((resolve) => {
			this.finish = () => resolve(this)
		})
	}
}

/**
 * Web Animations у окна и панели: класс перехода — в окне, как у браузера, а
 * переходы панели отдаёт `current()` на каждый вызов.
 */
function stubTransitions(panel: Element, current: () => object[]): void {
	Object.defineProperty(window, 'CSSTransition', { value: TProbeTransition, configurable: true })
	Object.defineProperty(panel, 'getAnimations', { value: current, configurable: true })
}

afterEach(() => {
	for (const plugin of destroyAfter.splice(0)) plugin.destroy()

	Reflect.deleteProperty(window, 'CSSTransition')
	document.body.innerHTML = ''
})

describe('ввод подсвечивает совпадение', () => {
	it('открывает закрытую панель и ставит aria-activedescendant', async () => {
		const { owner, keyboard, items, type } = await setup(['Москва', 'Тверь'])

		expect(owner.open).toBe(false)

		type('т')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[1].uid)
		expect(owner.field.aria.get('aria-activedescendant')).toBe('option-тверь-option')
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
 * переключился на телепортированную панель или внутрь корня. Границы — те же,
 * что у нажатия мимо, их знает `TDismissPlugin` (`isInside`), поэтому Select
 * собран с панелью. Поле показывает набранное (`typeInField`): иначе возврат
 * писал бы в поле то, что в нём и так стоит, и не был бы виден.
 */
describe('уход фокуса', () => {
	it('фокус ушёл вникуда — поле возвращается к тексту выбранного', async () => {
		const { owner, items, editable, typeInField, blurTo } = await setup(
			['Москва', 'Тверь'],
			{},
			{ panel: true },
		)

		owner.value = items[0].value
		typeInField('те')

		blurTo()

		expect(owner.field.value).toBe(items[0].text)
		expect(editable.query).toBe('')
	})

	it('переход в панель поле и набранное не трогает', async () => {
		const { owner, editable, panel, typeInField, blurTo } = await setup(
			['Москва'],
			{},
			{ panel: true },
		)

		typeInField('мо')
		blurTo(panel)

		expect(owner.field.value).toBe('мо')
		expect(editable.query).toBe('мо')
	})

	it('переход внутрь корня поле и набранное не трогает', async () => {
		const { owner, editable, root, typeInField, blurTo } = await setup(
			['Москва'],
			{},
			{ panel: true },
		)

		typeInField('мо')
		blurTo(root)

		expect(owner.field.value).toBe('мо')
		expect(editable.query).toBe('мо')
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
 * пустым после каждого выбора, независимо от `editableMode`. Плагину на
 * выбор пользователя (`choose` расширения `select`) остаётся сбросить то, что
 * относится только к вводу, — набранное и отбор.
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

	it('chooseItem переписывает набранное в поле текстом выбранного', async () => {
		const { owner, facade, items, editable, typeInField } = await setup(['Москва', 'Тверь'], {
			editableMode: 'filter',
		})

		typeInField('мо')
		facade.engine.extensions.select.chooseItem(items[0])

		expect(owner.field.value).toBe(items[0].text)
		expect(editable.query).toBe('')
	})

	it('очистка поля стирает набранное и снимает отбор — это тоже выбор, выбор «ничего»', async () => {
		const { owner, facade, items, editable, typeInField } = await setup(
			['Москва', 'Тверь', 'Тула'],
			{ editableMode: 'filter' },
		)

		owner.value = items[0].value
		typeInField('ту')
		expect(facade.shown.length).toBe(1)

		owner.field.clear()

		expect(owner.field.value).toBe('')
		expect(editable.query).toBe('')
		expect(facade.engine.extensions.filter.query).toBe('')
		expect(facade.shown.length).toBe(3)
	})
})

/**
 * Набор прерывает только выбор пользователя — то же, что безусловно пишет
 * поле. Смену `value` из кода и снятие выбора закрытием тега поле во время
 * набора переживает, и набранное с отбором обязаны пережить их вместе с ним:
 * сбрось плагин их на `change:selection`, в поле осталось бы набранное, а
 * список развернулся бы целиком.
 */
describe('набранное переживает смену выбора не пользователем', () => {
	it('filter: value сменили из кода — поле, набранное и отбор на месте', async () => {
		const { owner, facade, items, editable, typeInField } = await setup(
			['Москва', 'Тверь', 'Тула'],
			{ editableMode: 'filter' },
		)

		owner.value = items[0].value
		typeInField('ту')

		owner.value = items[1].value

		expect(facade.selected).toEqual([items[1]])
		expect(owner.field.value).toBe('ту')
		expect(editable.query).toBe('ту')
		expect(facade.engine.extensions.filter.query).toBe('ту')
		expect(facade.shown.map((item) => item.text)).toEqual(['Тула'])
	})

	it('multiple + filter: выбор снят через selection.deselect — поле, набранное и отбор на месте', async () => {
		const { owner, facade, items, editable, typeInField } = await setup(
			['Москва', 'Тверь', 'Тула'],
			{ editableMode: 'filter' },
		)

		facade.mode = 'multiple'
		facade.engine.extensions.select.chooseItem(items[0])
		typeInField('ту')

		// путь закрытия тега и Backspace
		facade.engine.extensions.selection.deselect(items[0])

		expect(facade.selected).toEqual([])
		expect(owner.field.value).toBe('ту')
		expect(editable.query).toBe('ту')
		expect(facade.engine.extensions.filter.query).toBe('ту')
	})
})

/**
 * Смена состава и переименование выбранной во время набора поле не трогают,
 * но `text` пересчитывают — и возврат поля показывает уже его, а не текст,
 * который был выбран до того, как в поле начали печатать.
 */
describe('двойной Escape после смены списка', () => {
	it('пересобрали список без trackBy — возвращается текст выбранной из нового состава', async () => {
		const { owner, facade, items, typeInField, press } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		typeInField('те')

		// ответ сервера без trackBy: те же значения, свежие инстансы
		facade.items = [
			new TSelectItem({ value: 'москва', text: 'Москва, центр' }),
			new TSelectItem({ value: 'тверь', text: 'Тверь' }),
		]

		expect(owner.field.value).toBe('те')

		press('Escape')
		press('Escape')

		expect(owner.field.value).toBe('Москва, центр')
	})

	it('переименовали выбранную — возвращается новое имя', async () => {
		const { owner, items, typeInField, press } = await setup(['Москва', 'Тверь'])

		owner.value = items[0].value
		typeInField('те')

		items[0].text = 'Москва, центр'

		expect(owner.field.value).toBe('те')

		press('Escape')
		press('Escape')

		expect(owner.field.value).toBe('Москва, центр')
	})
})

/**
 * Набор с отбором обычно кончается закрытием панели, а панель гаснет
 * переходом темы и до его конца остаётся на экране. Набранное и поле плагин
 * меняет сразу — это поле, а не панель, — а отбор снимает, когда закрытая
 * панель доиграла свои переходы: снятый тем же действием, он показал бы в
 * гаснущей панели весь список. Как это выглядит на экране —
 * `playground/vue/browser/select.spec.ts`, «отбор: гаснущая панель держит
 * отобранное».
 */
describe('отбор снимается, когда закрытая панель догасла', () => {
	const CITIES = ['Москва', 'Тверь', 'Тула']

	type TSelectSetup = Awaited<ReturnType<typeof setup>>

	const shownTexts = ({ facade }: TSelectSetup) => facade.shown.map((item) => item.text)
	const filterQuery = ({ facade }: TSelectSetup) => facade.engine.extensions.filter.query

	/** Select с панелью под отбором «ту»: панель открыта, показана одна «Тула». */
	async function filtered(props: Partial<ISelectProps> = {}): Promise<TSelectSetup> {
		const select = await setup(CITIES, { editableMode: 'filter', ...props }, { panel: true })

		select.typeInField('ту')

		expect(select.owner.open).toBe(true)
		expect(shownTexts(select)).toEqual(['Тула'])

		return select
	}

	/** Чем кончается набор: панель закрыта, поле вернулось или показывает выбранное. */
	describe.each<[string, (select: TSelectSetup) => void, string]>([
		[
			'выбор в single',
			({ facade, items }) => facade.engine.extensions.select.chooseItem(items[2]),
			'Тула',
		],
		[
			'второй Escape',
			({ press }) => {
				press('Escape')
				press('Escape')
			},
			'',
		],
		[
			'уход фокуса',
			({ press, blurTo }) => {
				// Tab закрывает панель раньше, чем фокус уходит с поля
				press('Tab')
				blurTo()
			},
			'',
		],
	])('%s', (_, end, fieldText) => {
		it('набранное и поле — сразу, отбор держится, пока панель доигрывает переход', async () => {
			const select = await filtered()
			const transition = new TProbeTransition()

			stubTransitions(select.panel, () => [transition])
			end(select)

			expect(select.owner.open).toBe(false)
			expect(select.editable.query).toBe('')
			expect(select.owner.field.value).toBe(fieldText)
			expect(filterQuery(select)).toBe('ту')
			expect(shownTexts(select)).toEqual(['Тула'])

			// Переходы закрытия плагин берёт кадром позже — и ждёт их конца
			await nextFrame()
			await flush()

			expect(filterQuery(select)).toBe('ту')

			transition.finish()
			await flush()

			expect(filterQuery(select)).toBe('')
			expect(shownTexts(select)).toEqual(CITIES)
		})

		it('без переходов отбор снимается кадром позже', async () => {
			const select = await filtered()

			end(select)

			expect(filterQuery(select)).toBe('ту')

			await nextFrame()

			expect(filterQuery(select)).toBe('')
			expect(shownTexts(select)).toEqual(CITIES)
		})
	})

	it('multiple: выбор панель не закрывает — отбор снимается сразу', async () => {
		const select = await filtered()

		select.facade.mode = 'multiple'
		stubTransitions(select.panel, () => [new TProbeTransition()])
		select.facade.engine.extensions.select.chooseItem(select.items[2])

		expect(select.owner.open).toBe(true)
		expect(select.editable.query).toBe('')
		expect(filterQuery(select)).toBe('')
		expect(shownTexts(select)).toEqual(CITIES)
	})

	it('closeOnSelect: false — панель открыта, отбор снимается сразу', async () => {
		const select = await filtered({ closeOnSelect: false })

		stubTransitions(select.panel, () => [new TProbeTransition()])
		select.facade.engine.extensions.select.chooseItem(select.items[2])

		expect(select.owner.open).toBe(true)
		expect(filterQuery(select)).toBe('')
	})

	/**
	 * Поле к этому времени уже показывает выбранное: панель, суженная прежним
	 * запросом, не дала бы увидеть остальные опции без нового ввода.
	 */
	it('панель открыли снова, пока она гасла, — отбор снимается сразу', async () => {
		const select = await filtered()
		const transition = new TProbeTransition()

		stubTransitions(select.panel, () => [transition])
		select.facade.engine.extensions.select.chooseItem(select.items[2])
		await nextFrame()

		select.owner.open = true

		expect(filterQuery(select)).toBe('')
		expect(shownTexts(select)).toEqual(CITIES)

		// Новый набор в открытой панели конец прежнего перехода не снимает
		select.typeInField('тв')
		transition.finish()
		await flush()

		expect(filterQuery(select)).toBe('тв')
		expect(shownTexts(select)).toEqual(['Тверь'])
	})

	/**
	 * Печатают, пока панель гасла: отбор теперь пишет ввод, и он же открывает
	 * панель. Тот же текст отбор не меняет вовсе, и открытие панели сняло бы
	 * только что набранное, не отмени ввод ожидание сам.
	 */
	it.each([
		['другой текст', 'тв', ['Тверь']],
		['тот же текст', 'ту', ['Тула']],
	])(
		'ввод во время ожидания (%s) — новый отбор переживает конец перехода',
		async (_, text, shown) => {
			const select = await filtered()
			const transition = new TProbeTransition()

			stubTransitions(select.panel, () => [transition])
			select.press('Escape')
			select.press('Escape')
			await nextFrame()

			select.typeInField(text)

			expect(select.owner.open).toBe(true)
			expect(select.editable.query).toBe(text)
			expect(filterQuery(select)).toBe(text)

			transition.finish()
			await flush()

			expect(filterQuery(select)).toBe(text)
			expect(shownTexts(select)).toEqual(shown)
		},
	)

	/**
	 * В `none` отбором ведает приложение. Сменённый, пока плагин ждал, — уже не
	 * тот отбор, который он собирался снять.
	 */
	it('отбор, сменённый во время ожидания кодом, переживает конец перехода', async () => {
		const select = await setup(CITIES, { editableMode: 'none' }, { panel: true })
		const filter = select.facade.engine.extensions.filter
		const transition = new TProbeTransition()

		filter.query = 'ту'
		select.owner.open = true
		stubTransitions(select.panel, () => [transition])
		select.facade.engine.extensions.select.chooseItem(select.items[2])
		await nextFrame()

		expect(filter.query).toBe('ту')

		filter.query = 'тв'
		transition.finish()
		await flush()

		expect(filter.query).toBe('тв')
		expect(shownTexts(select)).toEqual(['Тверь'])
	})

	/**
	 * Смена режима — не закрытие панели: отбор снимается сразу, и отложенная
	 * запись не сотрёт тот, что приложение поставит после перехода в `none`.
	 */
	it('смена режима снимает отбор сразу, хотя закрытая панель ещё гаснет', async () => {
		const select = await filtered()

		stubTransitions(select.panel, () => [new TProbeTransition()])
		select.owner.open = false
		select.owner.editableMode = 'search'

		expect(select.editable.query).toBe('')
		expect(filterQuery(select)).toBe('')
		expect(shownTexts(select)).toEqual(CITIES)
	})

	it('смена режима во время ожидания снимает отбор сразу', async () => {
		const select = await filtered()
		const transition = new TProbeTransition()

		stubTransitions(select.panel, () => [transition])
		select.facade.engine.extensions.select.chooseItem(select.items[2])
		select.owner.editableMode = 'none'

		expect(filterQuery(select)).toBe('')

		// Отбор приложения, поставленный после перехода в `none`, конец
		// прежнего перехода не снимает
		select.facade.engine.extensions.filter.query = 'тв'
		await nextFrame()
		transition.finish()
		await flush()

		expect(filterQuery(select)).toBe('тв')
	})

	/** Движок снаружи переживает компонент: ждать исчезания панели больше некому. */
	it('destroy во время ожидания снимает отбор сразу', async () => {
		const select = await filtered()

		stubTransitions(select.panel, () => [new TProbeTransition()])
		select.facade.engine.extensions.select.chooseItem(select.items[2])

		expect(filterQuery(select)).toBe('ту')

		select.editable.destroy()

		expect(filterQuery(select)).toBe('')
		expect(shownTexts(select)).toEqual(CITIES)
	})
})
