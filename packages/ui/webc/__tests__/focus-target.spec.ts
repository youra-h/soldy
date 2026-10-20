/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и Angular, по
 * компонентам адаптера, без `act` и сервера. У поля корень — коробка вокруг
 * `<input>`, у ListBox — рамка вокруг узла списка, у Tabs — рамка со списком
 * табов и панелями; узел фокуса называет правило дескриптора (`focusTarget`
 * плагина действия).
 *
 * Своё у Web Components — разметка: корень — элемент потребителя, инстанс —
 * его `ctrl`, своя остановка перед главной частью — свет слота (`leading`,
 * `header`). И такт: отрисовка коалесцируется в микрозадаче, и до неё
 * разметка отстаёт от модели.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TControl, createEngineTabs } from '@soldy-ui/core'
import {
	TCheckBoxElement,
	TInputElement,
	TListBoxElement,
	TRadioGroupItemElement,
	TSwitchElement,
	TTabsElement,
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
})
