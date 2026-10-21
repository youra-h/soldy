/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и Angular, по
 * компонентам адаптера, без `act` и сервера. У поля корень — коробка вокруг
 * `<input>`, у ListBox — рамка вокруг узла списка, у Tabs — рамка со списком
 * табов и панелями, у группы радио и аккордеона — контейнер остановок, у
 * элемента коллекции — обёртка вокруг строки; узел фокуса называет правило
 * дескриптора (`focusTarget` плагина действия).
 *
 * Своё у Web Components — разметка: корень — элемент потребителя, инстанс —
 * его `ctrl`, своя остановка перед главной частью — свет слота (`leading`,
 * `header`). И такт: отрисовка коалесцируется в микрозадаче, и до неё
 * разметка отстаёт от модели.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TControl, TRadioGroup, TScroller, createEngineTabs } from '@soldy-ui/core'
import {
	TAccordionElement,
	TAccordionItemElement,
	TCheckBoxElement,
	TInputElement,
	TListBoxElement,
	TListBoxItemElement,
	TNumberInputElement,
	TPaginationElement,
	TRadioGroupElement,
	TRadioGroupItemElement,
	TRatingElement,
	TScrollerElement,
	TSliderElement,
	TSwitchElement,
	TTabsElement,
	TTabsItemElement,
	TTextareaElement,
} from '@soldy-ui/webc'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Разметка, подключённая к документу. */
async function mount(html: string): Promise<void> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await flush()
	await nextFrame()
}

/** Узел по селектору в документе; нет его — тест падает здесь. */
function nodeOf(selector: string): Element {
	const node = document.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

/** Инстанс элемента soldy — его `ctrl`; нет инстанса контрола — тест падает здесь. */
function ctrlOf(node: Element): TControl {
	const ctrl = 'ctrl' in node ? node.ctrl : undefined

	if (!(ctrl instanceof TControl)) throw new Error('у элемента нет инстанса контрола')

	return ctrl
}

type TCase = {
	/** Разметка компонента. */
	html: string
	/** Класс элемента, которому тест пишет `focused`: модуль класса его и регистрирует. */
	element: { prototype: Element }
	/** Этот элемент в разметке. */
	owner: string
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		html: '<div is="so-input"></div>',
		element: TInputElement,
		owner: '[is="so-input"]',
		target: 'input',
	},
	'Input с кнопкой в leading': {
		html: '<div is="so-input"><button slot="leading" class="before"></button></div>',
		element: TInputElement,
		owner: '[is="so-input"]',
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		html: '<div is="so-number-input"></div>',
		element: TNumberInputElement,
		owner: '[is="so-number-input"]',
		target: '.so-number-input__input',
	},
	'NumberInput с кнопкой в leading': {
		html: '<div is="so-number-input"><button slot="leading" class="before"></button></div>',
		element: TNumberInputElement,
		owner: '[is="so-number-input"]',
		target: '.so-number-input__input',
		before: '.before',
	},
	Textarea: {
		html: '<div is="so-textarea"></div>',
		element: TTextareaElement,
		owner: '[is="so-textarea"]',
		target: 'textarea',
	},
	CheckBox: {
		html: '<span is="so-check-box"></span>',
		element: TCheckBoxElement,
		owner: '[is="so-check-box"]',
		target: 'input',
	},
	Switch: {
		html: '<span is="so-switch"></span>',
		element: TSwitchElement,
		owner: '[is="so-switch"]',
		target: 'input',
	},
	// Фокус держит поле ручки, а корень — ряд звёзд вокруг
	Rating: {
		html: '<span is="so-rating"></span>',
		element: TRatingElement,
		owner: '[is="so-rating"]',
		target: 'input',
	},
	// Фокус держат поля ручек, а корень — дорожка вокруг: поле первой ручки
	Slider: {
		html: '<span is="so-slider" value="[20,80]"></span>',
		element: TSliderElement,
		owner: '[is="so-slider"]',
		target: '.so-slider__thumb input',
	},
	// Корень — `nav` без своей остановки: фокус — на кнопке текущей страницы
	Pagination: {
		html: '<nav is="so-pagination" total="50" value="3"></nav>',
		element: TPaginationElement,
		owner: '[is="so-pagination"]',
		target: '[aria-current="page"]',
		// Стрелка «назад» на третьей странице включена — остановка перед страницами
		before: '.so-pagination__prev:not([disabled])',
	},
	'Scroller со своими остановками': {
		html: `<div is="so-scroller">
			<button class="target">A</button>
			<button>B</button>
		</div>`,
		element: TScrollerElement,
		owner: '[is="so-scroller"]',
		target: '.target',
	},
	'RadioGroup.Item': {
		html: `<div is="so-radio-group">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b" class="target"></label>
		</div>`,
		element: TRadioGroupItemElement,
		owner: '.target',
		target: '.target input',
	},
	ListBox: {
		html: `<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="A"></div>
		</div>`,
		element: TListBoxElement,
		owner: '[is="so-list-box"]',
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		html: `<div is="so-list-box">
			<input slot="header" class="before" />
			<div is="so-list-box-item" value="a" text="A"></div>
		</div>`,
		element: TListBoxElement,
		owner: '[is="so-list-box"]',
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		html: `<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A"></div>
			<div is="so-tabs-item" value="b" text="B" active></div>
		</div>`,
		element: TTabsElement,
		owner: '[is="so-tabs"]',
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		html: `<div is="so-tabs">
			<button slot="leading" class="before"></button>
			<div is="so-tabs-item" value="a" text="A"></div>
			<div is="so-tabs-item" value="b" text="B" active></div>
		</div>`,
		element: TTabsElement,
		owner: '[is="so-tabs"]',
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	'RadioGroup с отметкой': {
		html: `<div is="so-radio-group" value="b">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b" class="target"></label>
		</div>`,
		element: TRadioGroupElement,
		owner: '[is="so-radio-group"]',
		target: '.target input',
	},
	'RadioGroup без отметки, первое выключено': {
		html: `<div is="so-radio-group">
			<label is="so-radio-group-item" value="a" disabled></label>
			<label is="so-radio-group-item" value="b" class="target"></label>
		</div>`,
		element: TRadioGroupElement,
		owner: '[is="so-radio-group"]',
		target: '.target input',
	},
	Accordion: {
		html: `<div is="so-accordion">
			<div is="so-accordion-item" value="a" text="A" class="target"></div>
			<div is="so-accordion-item" value="b" text="B"></div>
		</div>`,
		element: TAccordionElement,
		owner: '[is="so-accordion"]',
		target: '.target .so-accordion-item__header',
	},
	'Accordion, первая секция выключена': {
		html: `<div is="so-accordion">
			<div is="so-accordion-item" value="a" text="A" disabled></div>
			<div is="so-accordion-item" value="b" text="B" class="target"></div>
		</div>`,
		element: TAccordionElement,
		owner: '[is="so-accordion"]',
		target: '.target .so-accordion-item__header',
	},
	'Tabs.Item': {
		html: `<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A" active></div>
			<div is="so-tabs-item" value="b" text="B" class="target"></div>
		</div>`,
		element: TTabsItemElement,
		owner: '.target',
		target: '.target [role="tab"]',
	},
	'Accordion.Item': {
		html: `<div is="so-accordion">
			<div is="so-accordion-item" value="a" text="A"></div>
			<div is="so-accordion-item" value="b" text="B" class="target"></div>
		</div>`,
		element: TAccordionItemElement,
		owner: '.target',
		target: '.target .so-accordion-item__header',
	},
	'ListBox.Item': {
		html: `<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="A"></div>
			<div is="so-list-box-item" value="b" text="B" class="target"></div>
		</div>`,
		element: TListBoxItemElement,
		owner: '.target',
		target: '.target [role="option"]',
	},
}

describe.each(Object.entries(CASES))('%s', (_name, { html, element, owner, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		await mount(html)

		const node = nodeOf(owner)
		const ctrl = ctrlOf(node)

		expect(node).toBeInstanceOf(element)

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) nodeOf(before)

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf(target))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: элемент
	 * перерисует `tabindex` в микрозадаче, а остановку правило берёт у модели,
	 * — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})
		const el = document.createElement('div', { is: 'so-tabs' })

		expect(el).toBeInstanceOf(TTabsElement)

		Reflect.set(el, 'engine', engine)
		document.body.appendChild(el)
		await flush()
		await nextFrame()

		const ctrl = ctrlOf(el)
		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => nodeOf('[role="tab"][tabindex="0"]')

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(stop().textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: элемент нарисует таб в микрозадаче, а остановка в модели —
	 * уже он, и корень Tabs фокус не держит. Запись ждёт узла: таб входит в
	 * коллекцию при подключении, его узел объявляют кадром позже — и фокус
	 * встаёт на него.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })
		const el = document.createElement('div', { is: 'so-tabs' })

		expect(el).toBeInstanceOf(TTabsElement)

		Reflect.set(el, 'engine', engine)
		document.body.appendChild(el)
		await flush()
		await nextFrame()

		const ctrl = ctrlOf(el)

		engine.extensions.activation.activate(
			engine.extensions.plain.push({ value: 'c', text: 'C' }),
		)
		ctrl.focused = true

		// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
		expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		await flush()
		await nextFrame()

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: элемент
	 * перепишет `checked` полей в микрозадаче, а отмеченное радио правило берёт
	 * у модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		await mount(`<div is="so-radio-group" value="a">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b" class="target"></label>
		</div>`)

		const ctrl = ctrlOf(nodeOf('[is="so-radio-group"]'))
		const target = nodeOf('.target input')

		if (!(ctrl instanceof TRadioGroup)) throw new Error('у группы нет инстанса группы')
		if (!(target instanceof HTMLInputElement)) throw new Error('у радио нет поля')

		ctrl.value = 'b'

		// Такт тот же: отмечено в разметке ещё прежнее
		expect(target.checked).toBe(false)

		ctrl.focused = true

		expect(document.activeElement).toBe(target)
	})
})

describe('Scroller · вьюпорт — остановка', () => {
	/**
	 * Своих остановок в ленте нет, а листать есть куда: остановка — сам
	 * вьюпорт. Замер в jsdom нулевой, поэтому факт приносит инстанс — как
	 * `scroller.spec.ts`.
	 */
	it('своих остановок нет — фокус на вьюпорте, а не на кнопке «вперёд»', async () => {
		await mount('<div is="so-scroller"><span>A</span></div>')

		const ctrl = ctrlOf(nodeOf('[is="so-scroller"]'))

		if (!(ctrl instanceof TScroller)) throw new Error('у ленты нет инстанса ленты')

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await flush()

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf('.so-scroller__viewport'))
		expect(ctrl.focused).toBe(true)
	})
})
