/**
 * Select под Web Components — поле выбора из списка: поле, панель и опции на
 * движке коллекций, проводка целиком.
 *
 * Сценарии — те же, что у Vue (`select.spec.ts`, `select-filter.spec.ts`,
 * Select в `list-groups.spec.ts`, теги поля из `tags-keyboard.spec.ts` и
 * `tags-overflow.spec.ts`), без сервера: поле-комбобокс, опции, кнопка
 * очистки, множественный выбор тегами, панель, слоты поля, списочные
 * свойства, сторона панели, жест, отбор и группы. Движок коллекций, его
 * расширения и плагины перенесены без правок.
 *
 * Своё у Web Components — разметка. Корень — элемент потребителя
 * (`<div is="so-select">`), поле — деталь Input над экземпляром поля Select,
 * панель — деталь Frame, уехавшая в `body`, опции — `<div is="so-select-item">`
 * со строкой — Button на `span` (`<span is="so-button-span">`). Набор `aria`
 * Select шаблон кладёт на деталь поля, и у детали с полем он уходит на
 * `<input>`, поверх набора комбобокса. В `leading` поля — метка: обёртка стоит
 * и в `single`, а теги в `multiple` встают перед ней — деталь Tags над
 * экземпляром, который держит Select. Scope у слотов нет: поле, теги и
 * команду очистки содержимое слота берёт у элемента (`el.ctrl.field`,
 * `el.state.tags`), а слоты опций из данных — образцы. Отрисовка —
 * микрозадачей после смены ядра, слушатели плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import {
	TSelect,
	createEngineSelect,
	type TGroupSection,
	type TSelectCollection,
	type TSelectionMode,
} from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { SelectDescriptor, SelectGroupDescriptor, SelectItemDescriptor } from '@soldy-ui/setup'
import {
	TFrameElement,
	TInputElement,
	TLocaleProviderElement,
	TSelectElement,
	TSelectGroupElement,
	TSelectItemElement,
	TTagsElement,
	defineElement,
	registerButtonTag,
	type ITemplate,
	type TButtonElementProps,
	type TFrameElementProps,
	type TSelectElementProps,
	type TSelectItemElementProps,
	type TTagsElementProps,
} from '@soldy-ui/webc'
import { selectTemplate } from '../src/components/select/select.template'
import { selectItemTemplate } from '../src/components/select/item/select-item.template'
import { selectGroupTemplate } from '../src/components/select/group/select-group.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Отрисовка цепочкой: смена в ядре перерисовывает Select, а тот — свои детали. */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 4; turn++) await flush()
}

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

/** Строка опции — Button на `span`. */
const TButtonSpanElement = registerButtonTag('span')

function isSelect(node: Element | null): node is TSelectElementProps {
	return node instanceof TSelectElement
}

function isOption(node: Element | null): node is TSelectItemElementProps {
	return node instanceof TSelectItemElement
}

function isFrame(node: Element | null): node is TFrameElementProps {
	return node instanceof TFrameElement
}

function isTags(node: Element | null): node is TTagsElementProps {
	return node instanceof TTagsElement
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Три опции разметкой, третья выключена, — как харнесс Vue (`Select.test.vue`). */
const OPTIONS = `<div is="so-select-item" value="msk" text="Москва"></div>
	<div is="so-select-item" value="tver" text="Тверь"></div>
	<div is="so-select-item" value="tula" text="Тула" disabled></div>`

/**
 * Select на странице — разметкой, как его пишет потребитель; атрибуты — в
 * открывающем теге, свет — опции. После вставки — отрисовка и кадр: корень
 * плагины получают через `requestAnimationFrame`.
 */
async function render(attrs = '', light = OPTIONS): Promise<TSelectElementProps> {
	const host = document.createElement('div')

	host.innerHTML = `<div is="so-select" name="Город" ${attrs}>${light}</div>`
	document.body.appendChild(host)
	await settle()
	await nextFrame()

	const el = host.querySelector('[is="so-select"]')

	if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

	return el
}

/** Select кодом: пропсы свойствами и свет — до вставки. */
async function mountSelect(
	props: Record<string, unknown>,
	light = '',
): Promise<TSelectElementProps> {
	const el = document.createElement('div', { is: 'so-select' })

	if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	document.body.appendChild(el)
	await settle()
	await nextFrame()

	return el
}

/** Поле комбобокса — `<input>` детали Input. */
const fieldOf = (el: Element = document.body) =>
	find(el, '.so-select__field input', HTMLInputElement)

/** Панель — деталь Frame, уехавшая в `body`. */
const panel = () => find(document, '.so-select__panel', HTMLElement)

/** Список панели — узел с ролью `listbox`. */
const list = () => find(document, '.so-select__list', HTMLElement)

/** Открыта ли панель: она в документе всегда, открытость — её `display`. */
const isOpen = () => panel().style.display !== 'none'

/** Строки опций — узлы с ролью `option`. */
const options = (): HTMLElement[] =>
	[...document.querySelectorAll('[role="option"]')].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/** Строка опции по тексту; нет её — тест падает здесь. */
function optionOf(text: string): HTMLElement {
	const found = options().find((row) => row.textContent?.trim() === text)

	if (!found) throw new Error(`опции «${text}» нет`)

	return found
}

/** `aria-selected` всех строк опций по порядку. */
const selection = () => options().map((row) => row.getAttribute('aria-selected'))

/** Клик и отрисовка того, что он поменял. */
async function click(target: HTMLElement): Promise<void> {
	target.click()
	await settle()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
async function press(target: Element, key: string, init: KeyboardEventInit = {}): Promise<void> {
	target.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
	)
	await settle()
}

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Набрать текст в поле так, как это делает пользователь. */
async function type(input: HTMLInputElement, value: string): Promise<void> {
	input.value = value
	input.dispatchEvent(new Event('input', { bubbles: true }))
	await settle()
}

/** Текст, на который ссылается `aria-activedescendant` поля. */
const active = (el?: Element) =>
	document
		.getElementById(fieldOf(el).getAttribute('aria-activedescendant') ?? '')
		?.textContent?.trim()

/** Теги в поле — строки показанных тегов. */
const tagTexts = (scope: ParentNode = document) =>
	[...scope.querySelectorAll('.so-tags-item')]
		.filter((node) => node instanceof HTMLElement && node.style.display !== 'none')
		.map((node) => node.firstElementChild?.textContent?.trim())

describe('поле', () => {
	it('деталь Input с именем места, поле — combobox и свёрнуто', async () => {
		const el = await render()
		const field = find(el, ':scope > .so-select__field', HTMLDivElement)

		expect(field).toBeInstanceOf(TInputElement)
		expect(field.getAttribute('embedded')).toBe('select.field')
		expect(fieldOf(el).getAttribute('role')).toBe('combobox')
		expect(fieldOf(el).getAttribute('aria-expanded')).toBe('false')
		expect(fieldOf(el).getAttribute('aria-haspopup')).toBe('listbox')
	})

	it('поле детали — экземпляр поля Select', async () => {
		const el = await render()
		const field = find(el, '.so-select__field', HTMLElement)

		expect(Reflect.get(field, 'ctrl')).toBe(el.ctrl?.field)
	})

	it('required — aria-required на combobox; без него атрибута нет', async () => {
		expect(fieldOf(await render('required')).getAttribute('aria-required')).toBe('true')

		document.body.innerHTML = ''

		expect(fieldOf(await render()).hasAttribute('aria-required')).toBe(false)
	})

	it('select-only: вложенный input readonly, aria-readonly рядом не дублирует', async () => {
		const field = fieldOf(await render())

		expect(field.readOnly).toBe(true)
		expect(field.hasAttribute('aria-readonly')).toBe(false)
	})

	it('editable: вложенный input не readonly, aria-autocomplete="list" и при none', async () => {
		expect(fieldOf(await render('editable')).readOnly).toBe(false)
		expect(fieldOf().getAttribute('aria-autocomplete')).toBe('list')

		document.body.innerHTML = ''

		expect(
			fieldOf(await render('editable editable-mode="none"')).getAttribute(
				'aria-autocomplete',
			),
		).toBe('list')
	})

	it('пока закрыто, панель скрыта — но в документе, в body', async () => {
		await render()

		expect(panel().parentElement).toBe(document.body)
		expect(list().getAttribute('role')).toBe('listbox')
		expect(isOpen()).toBe(false)
	})

	it('клик открывает панель', async () => {
		const el = await render()

		await click(fieldOf(el))

		expect(fieldOf(el).getAttribute('aria-expanded')).toBe('true')
		expect(isOpen()).toBe(true)
	})

	it('ссылается на список — и список этот id носит', async () => {
		const el = await render()

		await click(fieldOf(el))

		expect(fieldOf(el).getAttribute('aria-controls')).toBe(list().id)
		expect(list().id).not.toBe('')
	})
})

describe('опции', () => {
	it('входят в коллекцию Select и получают роль', async () => {
		const el = await render()

		expect(el.state.items?.map((item) => item.value)).toEqual(['msk', 'tver', 'tula'])
		expect(options()).toHaveLength(3)
	})

	/**
	 * Поле ссылается на подсвеченную опцию по `id`. Стоит он на строке опции
	 * вместе со всей её ARIA: ссылка обязана находить в документе узел с ролью.
	 */
	it('aria-activedescendant указывает на узел с role="option"', async () => {
		const el = await render()

		await press(fieldOf(el), 'ArrowDown')

		const id = fieldOf(el).getAttribute('aria-activedescendant')

		expect(id).toBeTruthy()
		expect(document.getElementById(id ?? '')?.getAttribute('role')).toBe('option')
	})

	/**
	 * Свой `id` опции — её вход: атрибут разметки база берёт пропом первой
	 * сборки и снимает с корня опции, и на строку `id` встаёт из набора опции —
	 * ссылка поля ведёт на него, узел с ним один. Из кода — `ctrl.id`: строка и
	 * ссылка идут за ним.
	 */
	it('свой id опции — на строке, ссылка поля ведёт на него и идёт за его сменой', async () => {
		const el = await render(
			'',
			`<div is="so-select-item" value="msk" text="Москва" id="city-msk"></div>
			<div is="so-select-item" value="tver" text="Тверь"></div>`,
		)

		await press(fieldOf(el), 'ArrowDown')

		const option = document.querySelector('.so-select-item')

		expect(optionOf('Москва').id).toBe('city-msk')
		expect(fieldOf(el).getAttribute('aria-activedescendant')).toBe('city-msk')
		expect(document.querySelectorAll('[id="city-msk"]')).toHaveLength(1)

		if (!isOption(option) || !option.ctrl) throw new Error('у опции нет ctrl')

		expect(option.hasAttribute('id')).toBe(false)

		option.ctrl.id = 'city-moscow'
		await settle()

		expect(optionOf('Москва').id).toBe('city-moscow')
		expect(fieldOf(el).getAttribute('aria-activedescendant')).toBe('city-moscow')
	})

	it('aria-selected стоит на всех, а не только на выбранной', async () => {
		await render()

		expect(options().every((row) => row.hasAttribute('aria-selected'))).toBe(true)
	})

	it('клик по опции выбирает её и закрывает панель', async () => {
		const el = await render()

		await click(fieldOf(el))
		await click(optionOf('Тверь'))

		expect(fieldOf(el).value).toBe('Тверь')
		expect(fieldOf(el).getAttribute('aria-expanded')).toBe('false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('выключенная опция кликом не выбирается', async () => {
		const el = await render()

		await click(fieldOf(el))
		await click(optionOf('Тула'))

		expect(fieldOf(el).value).toBe('')
		expect(selection()).toEqual(['false', 'false', 'false'])
	})

	/**
	 * Фон наведения, подсветки и выбора тема рисует на самой строке: набор
	 * `dataset` опции доезжает и до корня, и до `.so-button`. Вида у строки
	 * нет — строку опции тема красит по контексту.
	 */
	it('состояние для темы — data-* и на корне опции, и на строке; вида в разметке нет', async () => {
		const el = await render()

		await click(fieldOf(el))
		await click(optionOf('Москва'))

		const root = find(document, '.so-select-item', HTMLElement)
		const row = find(root, '.so-button', HTMLElement)

		expect(root.dataset['selected']).toBe('true')
		expect(row.dataset['selected']).toBe('true')
		expect(optionOf('Тверь').dataset['selected']).toBe('false')
		expect(row.className).not.toMatch(/--view-/)
	})
})

/**
 * Строка опции — Button на `span`, как `tag="span"` у Vue: под этот тег ядро
 * пишет опции ARIA. Набор опции перекрывает `role="button"` строки, а
 * `tabindex="-1"` — статика детали: фокус остаётся на поле.
 */
describe('строка опции — кнопка на span', () => {
	it('строка — <span is="so-button-span"> с именем места, tabindex="-1", без type', async () => {
		await render()

		const row = optionOf('Москва')

		expect(row).toBeInstanceOf(TButtonSpanElement)
		expect(row.localName).toBe('span')
		expect(row.getAttribute('embedded')).toBe('select.row')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.hasAttribute('type')).toBe(false)
		expect(document.querySelectorAll('.so-select-item [role="button"]')).toHaveLength(0)
	})

	it('выключенная опция — aria-disabled без disabled', async () => {
		await render()

		expect(optionOf('Тула').getAttribute('aria-disabled')).toBe('true')
		expect(optionOf('Тула').hasAttribute('disabled')).toBe(false)
	})

	it('кнопка на span — один класс на тег, под именем so-button-span', () => {
		expect(registerButtonTag('span')).toBe(TButtonSpanElement)
		expect(customElements.get('so-button-span')).toBe(TButtonSpanElement)
	})

	it('класс и стиль потребителя — корню опции, title, aria-label и data-* — строке', async () => {
		await render(
			'',
			`<div
				is="so-select-item"
				value="msk"
				text="Москва"
				class="mine"
				style="color: red"
				title="Город"
				data-testid="option"
			></div>`,
		)

		const root = find(document, '.so-select-item', HTMLElement)
		const row = optionOf('Москва')

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(['title', 'data-testid'].filter((name) => root.hasAttribute(name))).toEqual([])
		expect(row.getAttribute('title')).toBe('Город')
		expect(row.dataset['testid']).toBe('option')
	})

	it('клик потребителя по опции — после выбора, как у ListBox; stopPropagation выбор не отменяет', async () => {
		const el = await render()
		const order: string[] = []

		el.addEventListener('so:change:value', (event) => {
			if (event.target === el) order.push('выбор')
		})
		find(document, '.so-select-item', HTMLElement).addEventListener('click', (event) => {
			order.push('клик')
			event.stopPropagation()
		})

		await click(optionOf('Москва'))

		expect(order).toEqual(['выбор', 'клик'])
		expect(fieldOf().value).toBe('Москва')
	})
})

/**
 * Кнопку очистки рисует поле — Input внутри Select (`.so-input__clear`):
 * `clearable` Select отдаёт полю, имя кнопке пишет плагин имён самого поля.
 */
describe('кнопка очистки', () => {
	it('без clearable её нет', async () => {
		await render()

		expect(document.querySelector('.so-input__clear')).toBeNull()
	})

	it('кнопка — поля, первой в его слоте у конца, перед стрелкой', async () => {
		const el = await render('clearable')
		const slot = find(el, '.so-select__field > .so-input__trailing', HTMLElement)
		const parts = ['.so-input__clear', '.so-select__arrow']

		expect([...slot.children].map((node) => parts.find((part) => node.matches(part)))).toEqual(
			parts,
		)
		expect(el.querySelector('.so-select__clear')).toBeNull()
	})

	it('имя собрано с именем поля', async () => {
		const el = await render('clearable')

		expect(find(el, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Clear Город',
		)
	})

	it('строку имени поле берёт от локали поддерева — через Select она не идёт', async () => {
		const host = document.createElement('div')

		host.innerHTML = `<so-locale-provider><div is="so-select" clearable name="Город"></div></so-locale-provider>`

		const provider = host.firstElementChild

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		provider.locale = ruRU
		document.body.appendChild(host)
		await settle()

		expect(find(host, '.so-input__clear', HTMLElement).getAttribute('aria-label')).toBe(
			'Очистить Город',
		)
	})

	it('клик сбрасывает выбранное значение и панель не открывает', async () => {
		const el = await render('clearable')

		await click(fieldOf(el))
		await click(optionOf('Тверь'))

		expect(fieldOf(el).value).toBe('Тверь')
		expect(isOpen()).toBe(false)

		await click(find(el, '.so-input__clear', HTMLElement))

		expect(fieldOf(el).value).toBe('')
		expect(selection()).toEqual(['false', 'false', 'false'])
		// Клик кнопки до корня не всплыл: select-only открывает панель кликом по
		// корню, и очистка открыла бы её
		expect(isOpen()).toBe(false)
	})

	/**
	 * Scope у слотов нет: своя кнопка в слоте `clear` берёт команду у элемента —
	 * очищает поле Select (`el.ctrl.field.clear()`), а выбор Select снимает по её
	 * событию.
	 */
	it('своя кнопка в слоте clear снимает выбор командой поля', async () => {
		const el = await mountSelect(
			{ name: 'Город', value: 'tver' },
			`<div is="so-select-item" value="msk" text="Москва"></div>
			<div is="so-select-item" value="tver" text="Тверь"></div>
			<button slot="clear" class="probe-clear">×</button>`,
		)

		find(el, '.probe-clear', HTMLButtonElement).addEventListener('click', () =>
			el.ctrl?.field.clear(),
		)

		expect(fieldOf(el).value).toBe('Тверь')
		expect(selection()).toEqual(['false', 'true'])

		await click(find(el, '.probe-clear', HTMLButtonElement))

		expect(fieldOf(el).value).toBe('')
		expect(selection()).toEqual(['false', 'false'])
	})

	it('своя кнопка заменяет встроенную целиком и стоит на её месте', async () => {
		const el = await render(
			'clearable',
			`${OPTIONS}<button slot="clear" class="probe-clear"></button>`,
		)

		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(
			el.querySelector('.so-select__field .so-input__trailing > .probe-clear:first-child'),
		).not.toBeNull()
	})
})

describe('множественный выбор', () => {
	it('список помечен как multiselectable; в одиночном режиме пометки нет', async () => {
		await render('mode="multiple"')

		expect(list().getAttribute('aria-multiselectable')).toBe('true')

		document.body.innerHTML = ''
		await render()

		expect(list().hasAttribute('aria-multiselectable')).toBe(false)
	})

	/**
	 * Теги — второй компонент внутри поля, деталь Tags над экземпляром, который
	 * держит Select (`TSelectTagsExtension`): связка «опция ⇄ тег» иначе
	 * повторилась бы в шести адаптерах.
	 */
	it('выбор рисует тег в поле, а не текст', async () => {
		const el = await render('mode="multiple"')

		await click(fieldOf(el))
		await click(optionOf('Москва'))

		expect(fieldOf(el).value).toBe('')
		expect(tagTexts(el)).toEqual(['Москва'])

		const tags = find(el, '.so-select__tags', HTMLElement)

		expect(tags).toBeInstanceOf(TTagsElement)
		expect(tags.getAttribute('embedded')).toBe('select.tags')
		expect(isTags(tags) && tags.ctrl).toBe(el.state.tags)
	})

	it('закрытие тега снимает выбор с опции', async () => {
		const el = await render('mode="multiple"')

		await click(fieldOf(el))
		await click(optionOf('Москва'))
		await click(find(el, '.so-tags-item__close', HTMLElement))

		expect(tagTexts(el)).toEqual([])
		expect(optionOf('Москва').getAttribute('aria-selected')).toBe('false')
	})

	it('в single тегов в поле нет', async () => {
		await render()

		expect(document.querySelector('.so-select__tags')).toBeNull()
		expect(document.querySelectorAll('.so-tags-item')).toHaveLength(0)
	})

	/**
	 * Незаданного `tags_overflow` элемент ядру не пишет: режим переполнения
	 * остаётся движка снаружи.
	 */
	it('движок снаружи сохраняет режим переполнения тегов', async () => {
		const engine = createEngineSelect()

		engine.extensions.selection.mode = 'multiple'
		engine.extensions.tags.overflow = 'scroll'

		await mountSelect({ engine }, '<div is="so-select-item" value="msk" text="Москва"></div>')

		expect(engine.extensions.tags.overflow).toBe('scroll')
		expect(find(document, '.so-select__tags', HTMLElement).dataset['overflow']).toBe('scroll')
	})

	/** Без выбора у строки тега нет действия, и Tab она не ловит, а крестик — ловит. */
	it('теги в поле — без выбора: строки не ловят Tab, крестик — нативная остановка', async () => {
		const el = await mountSelect({ mode: 'multiple', value: ['msk', 'tver'] }, OPTIONS)
		const tags = find(el, '.so-select__tags', HTMLElement)
		const rows = [...tags.querySelectorAll('.so-tags-item > .so-button:first-child')]

		expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
		expect(rows.map((row) => row.getAttribute('role'))).toEqual(['listitem', 'listitem'])
		expect(find(tags, '.so-tags-item__close', HTMLElement).hasAttribute('tabindex')).toBe(false)
	})

	/**
	 * Литерал массива в `value` — новый объект на каждой записи: эхо того же
	 * содержимого выбор не откатывает.
	 */
	it('то же значение новым массивом выбор не трогает', async () => {
		const el = await mountSelect({ mode: 'multiple', value: ['msk', 'tver'] }, OPTIONS)

		await click(fieldOf(el))
		await click(optionOf('Тверь'))

		expect(selection()).toEqual(['true', 'false', 'false'])

		el.value = ['msk']
		await settle()

		expect(selection()).toEqual(['true', 'false', 'false'])
		expect(tagTexts(el)).toEqual(['Москва'])
	})
})

/**
 * Свой ряд тегов — слот `tags`. Scope у слотов нет: экземпляр тегов и их
 * коллекцию свой ряд берёт у элемента или у движка снаружи
 * (`engine.extensions.tags`), — те же, что встроенный ряд берёт `ctrl` и
 * `engine`. Слот выводится, пока выбор множественный.
 */
describe('слот tags', () => {
	/** Select над движком снаружи и свой ряд — над его тегами, до вставки. */
	async function mountOwn(mode: TSelectionMode): Promise<TSelectElementProps> {
		const engine = createEngineSelect()
		const own = document.createElement('div', { is: 'so-tags' })

		if (!isTags(own)) throw new Error('<div is="so-tags"> нет')

		engine.extensions.selection.mode = mode

		const tags = engine.extensions.tags

		own.slot = 'tags'
		own.className = 'own-tags'
		own.ctrl = tags.tags ?? undefined
		own.engine = tags.engine ?? undefined

		const el = document.createElement('div', { is: 'so-select' })

		if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

		el.engine = engine
		el.innerHTML = `<div is="so-select-item" value="msk" text="Москва"></div>
			<div is="so-select-item" value="tver" text="Тверь"></div>`
		el.appendChild(own)
		el.value = mode === 'multiple' ? ['msk', 'tver'] : 'msk'
		document.body.appendChild(el)
		await settle()

		return el
	}

	it('свой ряд встаёт на место встроенного — перед меткой поля — и получает выбранное', async () => {
		const el = await mountOwn('multiple')
		const own = find(el, '.own-tags', HTMLElement)

		expect(el.querySelector('.so-select__tags')).toBeNull()
		expect(
			find(el, '.so-select__field .so-input__leading', HTMLElement).firstElementChild,
		).toBe(own)
		expect(tagTexts(own)).toEqual(['Москва', 'Тверь'])
	})

	it('закрытый в своём ряду тег снимает выбор опции', async () => {
		const el = await mountOwn('multiple')
		const values: unknown[] = []

		el.addEventListener('so:change:value', (event) => {
			if (event instanceof CustomEvent && event.target === el) values.push(event.detail)
		})

		await click(find(el, '.own-tags .so-tags-item__close', HTMLElement))

		expect(tagTexts(find(el, '.own-tags', HTMLElement))).toEqual(['Тверь'])
		expect(values.at(-1)).toEqual({ newValue: ['tver'], oldValue: ['msk', 'tver'] })
	})

	it('без множественного выбора слота нет: тегов в поле не бывает', async () => {
		await mountOwn('single')

		expect(document.querySelector('.own-tags')).toBeNull()
	})
})

describe('панель как телепортированный Frame', () => {
	it('класс и пометка владельцем — на панели в body', async () => {
		await render()

		expect(panel().getAttribute('embedded')).toBe('select.frame')
		expect(panel().hasAttribute('data-owner')).toBe(true)
		expect(panel().contains(list())).toBe(true)
	})

	it('нажатие внутрь панели её не закрывает', async () => {
		const el = await render()

		await click(fieldOf(el))

		pointerDown(optionOf('Москва'))
		await settle()

		expect(isOpen()).toBe(true)
	})

	it('нажатие мимо закрывает', async () => {
		const el = await render()

		await click(fieldOf(el))

		pointerDown(document.body)
		await settle()

		expect(isOpen()).toBe(false)
	})

	/**
	 * Корень Select при `rendered=false` прячется, а до увезённой панели это
	 * скрытие не доходит: её прячет база Frame по признаку поддерева Select.
	 */
	it('rendered=false прячет и корень, и панель', async () => {
		const el = await render()

		await click(fieldOf(el))

		el.rendered = false
		await settle()

		expect(el.style.display).toBe('none')
		expect(isOpen()).toBe(false)
	})
})

describe('id поля', () => {
	it('по умолчанию id нет: его задаёт потребитель', async () => {
		expect(fieldOf(await render()).hasAttribute('id')).toBe(false)
	})

	/** Он нужен потребителю для `<label for>` и `aria-labelledby`. */
	it('заданный разметкой доходит до внутреннего input, а корень его не носит', async () => {
		const el = await render('id="city"')

		expect(fieldOf(el).id).toBe('city')
		expect(el.hasAttribute('id')).toBe(false)
	})
})

/**
 * Набор `aria` Select — имя, ссылки поля формы, ошибка — шаблон кладёт на
 * деталь поля, и у детали с полем он уходит на `<input>`: слоем над набором
 * комбобокса, который туда кладёт шаблон Input. Атрибут разметки главнее
 * обоих, как атрибут снаружи у Vue.
 */
describe('набор Select — на поле', () => {
	it('имя Select — на <input>, а не на корне и не на корне детали', async () => {
		const el = await render('aria_label="Город доставки"')

		expect(fieldOf(el).getAttribute('aria-label')).toBe('Город доставки')
		expect(el.hasAttribute('aria-label')).toBe(false)
		expect(find(el, '.so-select__field', HTMLElement).hasAttribute('aria-label')).toBe(false)
	})

	it('набор Select — поверх набора поля; снят — снова виден набор поля', async () => {
		const el = await render('aria_label="Select"')
		const field = el.ctrl?.field

		if (!field) throw new Error('поля нет')

		field.aria.add('aria-label', 'Поле')
		await settle()

		expect(fieldOf(el).getAttribute('aria-label')).toBe('Select')
		expect(fieldOf(el).getAttribute('role')).toBe('combobox')

		el.aria_label = undefined
		await settle()

		expect(fieldOf(el).getAttribute('aria-label')).toBe('Поле')
	})

	it('атрибут разметки главнее набора Select и набора поля', async () => {
		const el = await render('aria-label="Своё" aria_label="Ядра" data-testid="select"')

		expect(fieldOf(el).getAttribute('aria-label')).toBe('Своё')
		expect(fieldOf(el).dataset['testid']).toBe('select')
		expect(el.hasAttribute('data-testid')).toBe(false)

		el.aria_label = 'Другое'
		await settle()

		expect(fieldOf(el).getAttribute('aria-label')).toBe('Своё')
	})
})

describe('слоты поля', () => {
	it('leading и trailing — в обёртки Input по сторонам поля', async () => {
		const el = await render(
			'',
			`${OPTIONS}<i slot="leading" class="probe-leading"></i><i slot="trailing" class="probe-trailing"></i>`,
		)

		expect(el.querySelector('.so-input__leading .probe-leading')).not.toBeNull()
		expect(el.querySelector('.so-input__trailing .probe-trailing')).not.toBeNull()
	})

	/**
	 * Select отдаёт полю `leading` всегда, как Vue свой шаблон `#leading`:
	 * обёртку держит метка, и она стоит и в `single`, где тегов нет.
	 */
	it('обёртка leading стоит и в single без слота — с одной меткой', async () => {
		const el = await render()
		const leading = find(el, '.so-select__field > .so-input__leading', HTMLElement)

		expect(leading.children).toHaveLength(0)
		expect([...leading.childNodes].map((node) => node.nodeType)).toEqual([Node.COMMENT_NODE])
	})

	it('стрелка — обёртка с иконкой роли arrowDown размера Select', async () => {
		const el = await render('size="lg"')
		const icon = find(el, '.so-select__arrow > .so-icon', HTMLElement)

		expect(icon.getAttribute('embedded')).toBe('select.arrow')
		expect(icon.getAttribute('icon')).toBe('arrowDown')
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
	})

	it('стрелка заменяется через arrow-icon и остаётся внутри носителя состояния', async () => {
		const el = await render('', `${OPTIONS}<i slot="arrow-icon" class="probe-arrow"></i>`)

		expect(el.querySelector('.so-select__arrow .probe-arrow')).not.toBeNull()
		expect(el.querySelector('.so-select__arrow .so-icon')).toBeNull()
	})

	it('trailing дополняет кнопку очистки и стрелку, а не заменяет их', async () => {
		const el = await render(
			'clearable',
			`${OPTIONS}<i slot="trailing" class="probe-trailing"></i>`,
		)
		const slot = find(el, '.so-input__trailing', HTMLElement)

		expect([...slot.children].map((node) => node.className.split(' ')[0])).toEqual([
			'so-input__clear',
			'so-select__arrow',
			'probe-trailing',
		])
	})

	/**
	 * Своё поле — слот `field`. Scope нет: экземпляр поля с текстом и ARIA
	 * комбобокса своё поле берёт у элемента (`el.ctrl.field`). Встроенное поле в
	 * корень не встаёт, и его слоты не выводятся.
	 */
	it('слот field — своё поле на месте встроенного; экземпляр поля — у элемента', async () => {
		const el = await render(
			'',
			`${OPTIONS}<div slot="field" class="probe-field"></div><i slot="leading" class="probe-leading"></i>`,
		)

		expect(el.querySelector('.so-select__field')).toBeNull()
		expect(el.querySelector('.probe-leading')).toBeNull()
		expect(el.firstElementChild?.classList.contains('probe-field')).toBe(true)
		expect(el.ctrl?.field.aria.get('role')).toBe('combobox')
	})
})

/**
 * Списочные свойства Select — та же тройка, что у ListBox: проп доезжает до
 * разметки панели и опций.
 */
describe('списочные свойства', () => {
	it('contentFit доезжает до data-content-fit каждой опции, по умолчанию — truncate', async () => {
		await render('content-fit="wrap"')

		expect(options().map((row) => row.getAttribute('data-content-fit'))).toEqual([
			'wrap',
			'wrap',
			'wrap',
		])

		document.body.innerHTML = ''
		await render()

		expect(optionOf('Москва').getAttribute('data-content-fit')).toBe('truncate')
	})

	/**
	 * `expand` снимает подгонку панели под ширину поля: ширину держит плагин
	 * якоря, а выражение `contentFit !== 'expand'` вычисляет ядро.
	 */
	it('expand отвязывает ширину панели от поля', async () => {
		await render('content-fit="expand"')

		const frame = panel()

		expect(isFrame(frame) && frame.anchor_matchWidth).toBe(false)

		document.body.innerHTML = ''
		await render()

		const fitted = panel()

		expect(isFrame(fitted) && fitted.anchor_matchWidth).toBe(true)
	})

	it('без maxRows высота списка остаётся за темой', async () => {
		await render()
		await nextFrame()

		expect(list().style.maxHeight).toBe('')
	})

	it('панель не получает инлайновый height в пикселях', async () => {
		await render()

		expect(panel().style.height).toBe('auto')
	})
})

/**
 * `placement` Select доходит до якоря панели: ядро переводит выбор в
 * `panelPlacement` и `panelFlip`, шаблон только пишет их панели.
 */
describe('сторона панели', () => {
	const sideOf = () => {
		const frame = panel()

		if (!isFrame(frame)) throw new Error('панель — не Frame')

		return [frame.anchor_placement, frame.anchor_flip]
	}

	it('по умолчанию bottom-start, flip включён; top — top-start без flip', async () => {
		await render()

		expect(sideOf()).toEqual(['bottom-start', true])

		document.body.innerHTML = ''
		await render('placement="top"')

		expect(sideOf()).toEqual(['top-start', false])
	})

	it('смена placement на лету доходит до панели', async () => {
		const el = await render()

		el.placement = 'top'
		await settle()

		expect(sideOf()).toEqual(['top-start', false])

		el.placement = 'bottom'
		await settle()

		expect(sideOf()).toEqual(['bottom-start', false])

		el.placement = 'auto'
		await settle()

		expect(sideOf()).toEqual(['bottom-start', true])
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин; здесь
 * — проводка: полоса и признак «тянут» на увезённой панели, а закрытие жестом
 * доходит до событий элемента.
 */
describe('жест', () => {
	const handle = () => document.querySelector('.so-select__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (kind: string, target: Element, y: number) =>
		target.dispatchEvent(
			new PointerEvent(kind, {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: y,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				isPrimary: true,
			}),
		)

	it('без жеста полосы нет; с жестом — первая в панели, вне списка и немая', async () => {
		const ctrl = new TSelect()

		await mountSelect({ ctrl })

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')

		ctrl.swipe = 'handle'
		await settle()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
		expect(handle()?.closest('[role="listbox"]')).toBeNull()

		ctrl.swipe = 'none'
		await settle()

		expect(handle()).toBeNull()
	})

	it('смахнули вниз от поля — закрыта, событие сообщает, признак «тянут» на панели', async () => {
		const el = await render('swipe="handle"')
		const opened: unknown[] = []

		el.addEventListener('so:change:open', (event) => {
			if (event instanceof CustomEvent) opened.push(event.detail)
		})

		await click(fieldOf(el))

		expect(isOpen()).toBe(true)

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 160))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 125)
		await settle()

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('80px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 130)
		await settle()

		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
		expect(opened).toEqual([true, false])
	})
})

/**
 * Отбор опций — проводка целиком: скрытая отбором опция из данных снимается
 * петлёй, но остаётся в коллекции, а опция разметки прячется своим `visible`.
 */
describe('отбор', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
		{ value: 'c', text: 'Третий' },
		{ value: 'd', text: 'Четвёртый' },
	]

	const texts = () => options().map((row) => row.textContent?.trim())

	/**
	 * Select и движок, который отдала его сборка (`so:engine:create`). Опции —
	 * данными (`items`), а со своим светом (`light`) — только им: свойство
	 * `items` состав заменило бы.
	 */
	async function renderFiltered(
		props: Record<string, unknown> = {},
		light = '',
		items: readonly object[] | null = ITEMS,
	): Promise<{ el: TSelectElementProps; engine: TSelectCollection }> {
		const el = document.createElement('div', { is: 'so-select' })
		let engine: TSelectCollection | undefined

		if (!isSelect(el)) throw new Error('<div is="so-select"> нет')

		el.addEventListener('so:engine:create', (event) => {
			if (event instanceof CustomEvent) engine = event.detail
		})

		if (items) el.items = [...items]

		for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

		el.innerHTML = light
		document.body.appendChild(el)
		await settle()
		await nextFrame()

		if (!engine) throw new Error('so:engine:create не пришёл')

		return { el, engine }
	}

	it('сужает список на экране; скрытые опции остаются в коллекции', async () => {
		const { engine } = await renderFiltered()

		expect(options()).toHaveLength(4)

		engine.extensions.filter.query = 'тре'
		await settle()

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('снятие отбора возвращает весь список', async () => {
		const { engine } = await renderFiltered()

		engine.extensions.filter.query = 'тре'
		await settle()
		engine.extensions.filter.clear()
		await settle()

		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
	})

	it('отбор по тексту, а не по значению — поле сравнения ставит Select', async () => {
		const { engine } = await renderFiltered()

		expect(engine.extensions.filter.fields).toEqual(['text'])

		engine.extensions.filter.query = 'a'
		await settle()

		expect(options()).toHaveLength(0)
	})

	it('пустой отбор показывает слот empty — в списке, вместо опций', async () => {
		const { engine } = await renderFiltered({}, '<p slot="empty" class="probe">Пусто</p>')

		expect(document.querySelector('.probe')).toBeNull()

		engine.extensions.filter.query = 'ничего такого нет'
		await settle()

		expect(options()).toHaveLength(0)
		expect(engine.extensions.batch.items).toHaveLength(4)
		expect([...list().children].map((node) => node.className)).toEqual(['probe'])
	})

	it('выбор скрытой опции не теряется', async () => {
		const { engine } = await renderFiltered({ value: 'a' })

		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.query = 'тре'
		await settle()

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.selection.selectedCount).toBe(1)

		engine.extensions.filter.clear()
		await settle()

		expect(
			engine.extensions.batch.items
				.filter((item) => engine.extensions.selection.isSelected(item))
				.map((item) => item.value),
		).toEqual(['a'])
	})

	it('editableMode: filter — набранное сужает список', async () => {
		const { el, engine } = await renderFiltered({ editable: true, editableMode: 'filter' })

		await type(fieldOf(el), 'тре')

		expect(texts()).toEqual(['Третий'])
		expect(engine.extensions.filter.query).toBe('тре')
		expect(engine.extensions.batch.items).toHaveLength(4)
	})

	it('editableMode: search — список остаётся целым', async () => {
		const { el, engine } = await renderFiltered({ editable: true, editableMode: 'search' })

		await type(fieldOf(el), 'тре')

		expect(options()).toHaveLength(4)
		expect(engine.extensions.filter.query).toBe('')
	})

	it('без editable ввод не слушается вовсе', async () => {
		const { el, engine } = await renderFiltered({ editableMode: 'filter' })

		await type(fieldOf(el), 'тре')

		expect(engine.extensions.filter.query).toBe('')
		expect(options()).toHaveLength(4)
	})

	/**
	 * Двойной Escape: первый закрывает панель и набранное не трогает, второй —
	 * уже на закрытой панели — возвращает поле. Отбор он снимает, когда закрытая
	 * панель догасла: переходов jsdom не ведёт, и ожидание кончается кадром.
	 */
	it('первый Escape закрывает панель и не трогает отбор, второй — снимает и возвращает текст', async () => {
		const { el, engine } = await renderFiltered({
			editable: true,
			editableMode: 'filter',
			value: 'a',
		})

		await type(fieldOf(el), 'тре')

		expect(texts()).toEqual(['Третий'])

		await press(fieldOf(el), 'Escape')

		expect(engine.extensions.filter.query).toBe('тре')
		expect(texts()).toEqual(['Третий'])
		expect(fieldOf(el).value).toBe('тре')

		await press(fieldOf(el), 'Escape')

		expect(fieldOf(el).value).toBe('Первый')

		await nextFrame()
		await settle()

		expect(engine.extensions.filter.query).toBe('')
		expect(texts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect(fieldOf(el).value).toBe('Первый')
	})

	it('несовпавший текст, Esc, Esc, ↓ — поле остаётся пустым', async () => {
		const { el } = await renderFiltered({ editable: true })

		await type(fieldOf(el), 'несуществующий текст')
		await press(fieldOf(el), 'Escape')
		await press(fieldOf(el), 'Escape')

		expect(fieldOf(el).value).toBe('')

		await press(fieldOf(el), 'ArrowDown')

		expect(fieldOf(el).value).toBe('')
	})

	it('multiple: Enter добавляет тег и очищает поле', async () => {
		const { el } = await renderFiltered({ editable: true, mode: 'multiple' })

		await type(fieldOf(el), 'Пер')
		await press(fieldOf(el), 'Enter')

		expect(fieldOf(el).value).toBe('')
		expect(tagTexts(el)).toEqual(['Первый'])
	})

	it('single: Enter на уже выбранной опции возвращает её текст в поле', async () => {
		const { el, engine } = await renderFiltered({ editable: true, value: 'c' })

		expect(fieldOf(el).value).toBe('Третий')

		await type(fieldOf(el), 'Тре')
		await press(fieldOf(el), 'Enter')

		expect(engine.extensions.selection.selectedCount).toBe(1)
		expect(fieldOf(el).value).toBe('Третий')
	})

	/**
	 * Опции разметкой: составом списка владеет слот, перебрать его коллекция не
	 * может, — отбор доезжает до них через их собственный `visible`, и база
	 * прячет их корень.
	 */
	describe('опции разметкой', () => {
		const MARKUP = ITEMS.map(
			({ value, text }) => `<div is="so-select-item" value="${value}" text="${text}"></div>`,
		).join('')

		const visibleTexts = () =>
			[...document.querySelectorAll('.so-select-item')]
				.filter((node) => node instanceof HTMLElement && node.style.display !== 'none')
				.map((node) => node.textContent?.trim())

		it('отбор из кода прячет несовпавшие опции, снятие — возвращает', async () => {
			const { engine } = await renderFiltered({}, MARKUP, null)

			expect(visibleTexts()).toHaveLength(4)

			engine.extensions.filter.query = 'вто'
			await settle()

			expect(visibleTexts()).toEqual(['Второй'])
			expect(engine.extensions.batch.items).toHaveLength(4)

			engine.extensions.filter.clear()
			await settle()

			expect(visibleTexts()).toEqual(['Первый', 'Второй', 'Третий', 'Четвёртый'])
		})

		it('ввод в поле прячет несовпавшие опции', async () => {
			const { el, engine } = await renderFiltered(
				{ editable: true, editableMode: 'filter' },
				MARKUP,
				null,
			)

			await type(fieldOf(el), 'вто')

			expect(engine.extensions.filter.query).toBe('вто')
			expect(visibleTexts()).toEqual(['Второй'])
		})
	})
})

describe('empty', () => {
	it('пока опций нет — слот empty в списке; появились — уходит из документа', async () => {
		const el = await mountSelect({ items: [] }, '<p slot="empty" class="probe">Пусто</p>')

		expect([...list().children].map((node) => node.className)).toEqual(['probe'])

		el.items = [{ value: 'a', text: 'A' }]
		await settle()

		expect(document.querySelector('.probe')).toBeNull()
		expect(options()).toHaveLength(1)

		el.items = []
		await settle()

		expect([...list().children].map((node) => node.className)).toEqual(['probe'])
	})
})

/**
 * Группы — как у Vue (`list-groups.spec.ts`): секции нарисованного в списке
 * панели, группа — `<div is="so-select-group">` с подписью, разделители —
 * пока их просит Select; стрелки ходят порядком экрана.
 */
describe('группы', () => {
	/** В данных «Морковь» стоит между фруктами, у «Воды» группы нет. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']
	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	/** Части списка: группа — подписью и текстами опций, разделитель — `—`. */
	const parts = () =>
		[...list().children].map((node) => {
			if (node.classList.contains('so-select-group')) {
				return [
					node.querySelector('.so-select-group__label')?.textContent?.trim() ?? '',
					[...node.querySelectorAll('.so-select-item')].map((item) =>
						item.textContent?.trim(),
					),
				]
			}

			if (node.classList.contains('so-select__separator')) return '—'

			return node.textContent?.trim()
		})

	/** Секции коротко: подпись группы (`null` — без группы) и значения опций. */
	const brief = (sections: ReadonlyArray<TGroupSection<{ readonly value?: unknown }>>) =>
		sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группы с подписью, без группы — последними; разделителей по умолчанию нет', async () => {
		await mountSelect({ items: MIXED, groups: GROUPS })

		expect(parts()).toEqual(SECTIONS)

		for (const group of list().querySelectorAll('.so-select-group')) {
			const label = find(group, '.so-select-group__label', HTMLElement)

			expect(group).toBeInstanceOf(TSelectGroupElement)
			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
		}
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету', async () => {
		const el = await mountSelect({ items: MIXED, groups: GROUPS, groupSeparators: true })

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-select__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		el.groupSeparators = false
		await settle()

		expect(parts()).toEqual(SECTIONS)
	})

	it('стрелки подсвечивают опции порядком экрана', async () => {
		const el = await mountSelect({ items: MIXED, groups: GROUPS })

		await press(fieldOf(el), 'ArrowDown')

		expect(active(el)).toBe('Яблоко')

		await press(fieldOf(el), 'ArrowDown')

		expect(active(el)).toBe('Груша')

		await press(fieldOf(el), 'ArrowDown')

		expect(active(el)).toBe('Морковь')
	})

	it('отбор убрал все опции группы — нет и её подписи', async () => {
		const el = await mountSelect({
			items: MIXED,
			groups: GROUPS,
			editable: true,
			editableMode: 'filter',
		})

		await click(fieldOf(el))
		await type(fieldOf(el), 'Морковь')

		expect(parts()).toEqual([['Овощи', ['Морковь']]])
	})

	it('группа разметкой — в группировке; стрелки — порядком экрана', async () => {
		const engine = createEngineSelect()
		const el = await mountSelect(
			{ engine },
			`<div is="so-select-item" value="water" text="Вода"></div>
			<div is="so-select-group" label="Фрукты">
				<div is="so-select-item" value="apple" text="Яблоко"></div>
				<div is="so-select-item" value="pear" text="Груша"></div>
			</div>`,
		)

		expect(brief(engine.extensions.group.sections)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
		])

		const visited: unknown[] = []

		for (let step = 0; step < 3; step += 1) {
			await press(fieldOf(el), 'ArrowDown')
			visited.push(active(el))
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша'])
	})
})

/**
 * Слоты опций из данных — образцы: Select кладёт копию одного образца в
 * каждую свою опцию из данных — в её слот, назначением, вместе с текстом.
 */
describe('образцы и отметка', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]

	/** Отметки по опциям: своя иконка, слот или пусто. */
	const marks = () =>
		[...document.querySelectorAll('.so-select-item__indicator')].map((indicator) =>
			indicator.querySelector('.probe')
				? 'slot'
				: indicator.querySelector('.so-icon')
					? 'icon'
					: 'empty',
		)

	it('образцы item-* — копия в каждой опции из данных, в её слоте', async () => {
		const el = await mountSelect(
			{ items: ITEMS },
			`<template slot="item"><b class="own">Свой</b></template>
			<template slot="item-leading"><u class="lead">до</u></template>
			<template slot="item-trailing"><s class="trail">после</s></template>`,
		)

		for (const row of options()) {
			const text = find(row, '.so-button__text', HTMLElement)

			expect(text.textContent).toBe('Свой')
			expect(text.previousElementSibling?.classList.contains('lead')).toBe(true)
			expect(text.nextElementSibling?.classList.contains('trail')).toBe(true)
		}

		expect(el.querySelector('template')).toBeNull()
	})

	it('отметка — обёртка у каждой опции, иконка роли check — у выбранной', async () => {
		const el = await mountSelect({ items: ITEMS, indicator: 'start', mode: 'multiple' })

		expect(marks()).toEqual(['empty', 'empty'])

		await click(fieldOf(el))
		await click(optionOf('Второй'))

		expect(marks()).toEqual(['empty', 'icon'])

		const icon = find(document, '.so-select-item__indicator .so-icon', HTMLElement)

		expect(icon.getAttribute('embedded')).toBe('select.indicator')
		expect(icon.getAttribute('icon')).toBe('check')
		expect(
			find(document, '.so-select-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку первой в строке, end — последней, none убирает', async () => {
		const el = await mountSelect({ items: ITEMS.slice(0, 1), indicator: 'start', value: 'a' })

		expect(options()[0].firstElementChild?.className).toBe('so-select-item__indicator')

		el.indicator = 'end'
		await settle()

		expect(options()[0].lastElementChild?.className).toBe('so-select-item__indicator')

		el.indicator = 'none'
		await settle()

		expect(document.querySelectorAll('.so-select-item__indicator')).toHaveLength(0)
	})

	it('item-indicator-icon — отметка выбранных вместо своей иконки', async () => {
		const el = await mountSelect(
			{ items: ITEMS, mode: 'multiple', indicator: 'start' },
			'<template slot="item-indicator-icon"><b class="probe">✓</b></template>',
		)

		await click(fieldOf(el))
		await click(optionOf('Первый'))

		expect(marks()).toEqual(['slot', 'empty'])
	})

	it('опция из данных без embedded, её события не всплывают до Select', async () => {
		const el = await mountSelect({ items: ITEMS })
		const bubbled: unknown[] = []

		el.addEventListener('so:element:ready', ({ target }) => {
			if (target instanceof Element && isOption(target)) bubbled.push(target)
		})

		await nextFrame()

		expect(
			[...document.querySelectorAll('.so-select-item')].some((node) =>
				node.hasAttribute('embedded'),
			),
		).toBe(false)
		expect(bubbled).toEqual([])
	})
})

/**
 * Режим выбора сменился после сборки: экземпляр тегов у Select появляется с
 * переходом в `multiple` и пропадает с выходом из него — ряд тегов за ним:
 * новый экземпляр — новая деталь, нет его — деталь снята.
 */
describe('смена mode после сборки', () => {
	it('single → multiple → single → multiple: деталь тегов встаёт, снимается и встаёт новой', async () => {
		const el = await render('', OPTIONS)
		const tags = () => el.querySelector('.so-select__tags')
		const leading = () => find(el, '.so-input__leading', HTMLElement)

		expect(tags()).toBeNull()

		el.mode = 'multiple'
		await settle()

		const first = tags()

		expect(isTags(first) && first.ctrl).toBe(el.state.tags)
		// Перед меткой — первым в обёртке
		expect(leading().firstElementChild).toBe(first)
		expect(first?.nextSibling?.nodeType).toBe(Node.COMMENT_NODE)

		await click(fieldOf(el))
		await click(optionOf('Москва'))

		expect(tagTexts(el)).toEqual(['Москва'])

		el.mode = 'single'
		await settle()

		expect(tags()).toBeNull()

		el.mode = 'multiple'
		await settle()

		const second = tags()

		expect(second).not.toBeNull()
		expect(second).not.toBe(first)
		expect(isTags(second) && second.ctrl).toBe(el.state.tags)
	})
})

/**
 * Связка у элемента новая на каждое подключение: Select, переставленный в
 * документе без движка снаружи, собирает новый движок — и экземпляр тегов у
 * него новый. Ряд тегов в поле — новая деталь над ним, а поле — тот же узел
 * над тем же экземпляром поля.
 */
describe('перестановка', () => {
	it('новая связка — новая деталь тегов над новым экземпляром', async () => {
		const el = await mountSelect({ mode: 'multiple', value: ['msk'] }, OPTIONS)
		const before = el.querySelector('.so-select__tags')
		const field = el.querySelector('.so-select__field')

		document.body.appendChild(document.createElement('section')).appendChild(el)
		await settle()

		const after = el.querySelector('.so-select__tags')

		expect(after).not.toBeNull()
		expect(after).not.toBe(before)
		expect(isTags(after) && after.ctrl).toBe(el.state.tags)
		expect(el.querySelector('.so-select__field')).toBe(field)
		expect(Reflect.get(el.querySelector('.so-select__field') ?? {}, 'ctrl')).toBe(
			el.ctrl?.field,
		)
		expect(tagTexts(el)).toEqual(['Москва'])
	})

	/**
	 * Select переставлен одной операцией: панель идёт за местом — пересобирается
	 * сразу после него, — и опции входят в коллекцию новой сборки. Клавиатура и
	 * указатель доходят до них как прежде.
	 */
	it('переставленный одной операцией — опции в новой коллекции, стрелки и клик работают', async () => {
		const el = await render()

		document.body.appendChild(document.createElement('section')).appendChild(el)
		await settle()
		await nextFrame()

		expect(el.state.items?.map((item) => item.value)).toEqual(['msk', 'tver', 'tula'])
		expect(document.querySelectorAll('.so-select__panel')).toHaveLength(1)

		await press(fieldOf(el), 'ArrowDown')

		expect(active(el)).toBe('Москва')

		await click(optionOf('Тверь'))

		expect(fieldOf(el).value).toBe('Тверь')
	})

	it('снятый Select уводит панель из body', async () => {
		const el = await render()

		el.remove()
		await settle()

		expect(document.querySelector('.so-select__panel')).toBeNull()
	})
})

/**
 * Разметка написана раньше, чем зарегистрированы элементы: ожившую при
 * регистрации, её база собирает по месту — Select и группа раньше опций под
 * ними, в каком бы порядке ни регистрировались части. Имена — свои у теста:
 * зарегистрированные пакетом уже живые.
 */
describe('разметка до регистрации', () => {
	const KINDS: readonly (readonly [string, () => CustomElementConstructor])[] = [
		['select', () => class extends TSelectElement {}],
		['group', () => class extends TSelectGroupElement {}],
		['item', () => class extends TSelectItemElement {}],
	]

	it.each([
		['в порядке модуля Select', 'so-test-select-up', KINDS],
		['в обратном порядке', 'so-test-select-down', [...KINDS].reverse()],
	] as const)('%s — опции в коллекции и в группировке', async (_order, prefix, kinds) => {
		document.body.innerHTML = `<div is="${prefix}-select" value="pear">
			<div is="${prefix}-item" value="water" text="Вода"></div>
			<div is="${prefix}-group" label="Фрукты">
				<div is="${prefix}-item" value="apple" text="Яблоко"></div>
				<div is="${prefix}-item" value="pear" text="Груша"></div>
			</div>
		</div>`

		for (const [kind, extend] of kinds) defineElement(`${prefix}-${kind}`, extend(), 'div')

		// Ожившие при регистрации собираются микрозадачей позже
		await settle()

		const el = document.querySelector(`[is="${prefix}-select"]`)

		if (!isSelect(el)) throw new Error('Select нет')

		expect(el.state.items?.map((item) => item.value)).toEqual(['water', 'apple', 'pear'])
		expect(el.state.drawnSections?.map(({ group }) => group?.label ?? null)).toEqual([
			null,
			'Фрукты',
		])
		expect(fieldOf(el).value).toBe('Груша')
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	/** Точки слотов шаблона — в пустом корне, где ни один слот не задан. */
	function slotsOf<TInstance, TFacade, TOutputs>(
		template: ITemplate<TInstance, TFacade, TOutputs>,
	): string[] {
		const root = document.createElement('div')
		const ctx = { ...bareContext<TInstance, TFacade>(root), state: {} }
		const targets = template.create(root, ctx)

		return Object.keys(targets.slots).sort()
	}

	it.each([
		['Select', () => slotsOf(selectTemplate), SelectDescriptor],
		['Select.Item', () => slotsOf(selectItemTemplate), SelectItemDescriptor],
		['Select.Group', () => slotsOf(selectGroupTemplate), SelectGroupDescriptor],
	] as const)('%s', (_name, slots, descriptor) => {
		expect(slots()).toEqual(
			descriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('пропсы фасада — свойства элементов', () => {
		expectTypeOf<TSelectElementProps['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TSelectElementProps>().toHaveProperty('items')
		expectTypeOf<TSelectElementProps>().toHaveProperty('engine')
		expectTypeOf<TSelectItemElementProps['selected']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада: теги поля и что рисует список', () => {
		expectTypeOf<TSelectElementProps['state']>().toHaveProperty('tags')
		expectTypeOf<TSelectElementProps['state']>().toHaveProperty('drawnSections')
		expectTypeOf<TSelectItemElementProps['state']>().toHaveProperty('indicator')
	})

	/** У `span` своего `disabled` нет: там это свойство пропа. */
	it('кнопка на span — тип своего тега', () => {
		expectTypeOf<TButtonElementProps<HTMLSpanElement>>().toExtend<HTMLSpanElement>()
		expectTypeOf<TButtonElementProps<HTMLSpanElement>['disabled']>().toEqualTypeOf<
			boolean | undefined
		>()
	})
})
