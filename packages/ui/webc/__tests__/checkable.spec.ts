/**
 * `<span is="so-check-box">` и `<span is="so-switch">`: корень — элемент
 * потребителя, вложенный `<input type="checkbox">` — узел шаблона, рядом —
 * декор: коробка с отметкой или дорожка с ручкой.
 *
 * Сценарии — те же, что у React (`checkable.spec.tsx`), без сервера и `act`.
 * Наборы ядра стоят на разных элементах: `attrs` (`dir`) — на корне, `aria` —
 * на `<input>`; нативные `disabled` и `required` поля без ARIA-дублей,
 * `readonly` — только `aria-readonly`: HTML не знает его у чекбокса. Контрол
 * кладут в подпись `Label`, поэтому корень — `span`, а декор скрыт
 * `aria-hidden`: всё внутри `label` входит в имя поля.
 *
 * Своё у Web Components: статические атрибуты разметки корня база переносит на
 * поле, а `id` — проп поля, не вход корня. Слоты отметки и ручки выводит
 * привязка: неактивный слот — вне документа. Переключает значение
 * `TInputBoolPlugin` по `change` поля, его слушатели встают по `ready` —
 * кадром позже.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TCheckBox, TSwitch } from '@soldy-ui/core'
import { CheckBoxDescriptor, SwitchDescriptor, getIcon, setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import {
	TCheckBoxElement,
	TSwitchElement,
	type TCheckBoxElementProps,
	type TSwitchElementProps,
} from '@soldy-ui/webc'
import { checkBoxTemplate } from '../src/components/check-box/check-box.template'
import { switchTemplate } from '../src/components/switch/switch.template'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Флажок или переключатель — общее у обоих элементов. */
type TCheckable = TCheckBoxElementProps | TSwitchElementProps

function isCheckable(node: Element | null): node is TCheckable {
	return node instanceof TCheckBoxElement || node instanceof TSwitchElement
}

function isCheckBox(node: Element | null): node is TCheckBoxElementProps {
	return node instanceof TCheckBoxElement
}

function isSwitch(node: Element | null): node is TSwitchElementProps {
	return node instanceof TSwitchElement
}

/** Узел разметки, подключённый к документу; узел не того вида — тест падает здесь. */
function mountAs<T extends HTMLElement>(
	html: string,
	guard: (node: Element | null) => node is T,
): T {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.firstElementChild

	if (!guard(node)) throw new Error(`${html}: элемента soldy нет`)

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Поле внутри корня. */
const field = (root: Element) => find(root, 'input', HTMLInputElement)

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Элемент из JS, ещё не подключённый; узел не того вида — тест падает здесь. */
function create<T extends HTMLElement>(is: string, guard: (node: Element | null) => node is T): T {
	const node = document.createElement('span', { is })

	if (!guard(node)) throw new Error(`<span is="${is}"> нет`)

	return node
}

/** Флажок над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCheckBox(ctrl: TCheckBox): TCheckBoxElementProps {
	const node = create('so-check-box', isCheckBox)

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

/** Переключатель над готовым инстансом: `ctrl` выставлен до подключения. */
function mountSwitch(ctrl: TSwitch): TSwitchElementProps {
	const node = create('so-switch', isSwitch)

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

/**
 * Разметка в неподключённом узле: узлы слотов можно найти до вставки — после
 * неё неактивный слот уже вне документа.
 */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

/**
 * Флажок и переключатель — одной строкой таблицы: имя, `is`, декор и элемент
 * над инстансом. Инстанс строится в той же записи, что и элемент: разнесённые
 * по столбцам, они разошлись бы по классам.
 */
const CHECKABLES = [
	[
		'CheckBox',
		{
			is: 'so-check-box',
			decor: '.so-check-box__container',
			mountCtrl: (readonly = false): TCheckable => mountCheckBox(new TCheckBox({ readonly })),
		},
	],
	[
		'Switch',
		{
			is: 'so-switch',
			decor: '.so-switch__track',
			mountCtrl: (readonly = false): TCheckable => mountSwitch(new TSwitch({ readonly })),
		},
	],
] as const

describe.each(CHECKABLES)('%s · разметка', (_name, { is, decor }) => {
	const mount = (attributes = '') =>
		mountAs(`<span is="${is}" ${attributes}></span>`, isCheckable)

	/**
	 * Контрол кладут в подпись `Label`, а внутри `label` HTML разрешает только
	 * строчную разметку: `div` там невалиден.
	 */
	it('корень — span потребителя, и всё внутри — не div', () => {
		const el = mount()

		expect(el.localName).toBe('span')
		expect(el.querySelectorAll('div')).toHaveLength(0)
		expect(el.ctrl?.tag).toBe('span')
	})

	/**
	 * Имя контролу даёт подпись вокруг, и в него вошёл бы весь текст внутри
	 * `label`, включая слоты отметки и `on`/`off`. Декор из имени убран.
	 */
	it('декор скрыт от скринридера — aria-hidden', () => {
		expect(find(mount('value'), decor, HTMLElement).getAttribute('aria-hidden')).toBe('true')
	})

	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(mount('disabled required'))

		expect(input.disabled).toBe(true)
		expect(input.required).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — aria-readonly на <input>: HTML не знает readonly у чекбокса', () => {
		const input = field(mount('readonly'))

		expect(input.getAttribute('aria-readonly')).toBe('true')
		expect(input.hasAttribute('readonly')).toBe(false)
	})

	/** У `span` своего `disabled` нет: ядро его на корень не пишет. */
	it('disabled из кода — на поле, на корне атрибута нет', async () => {
		const el = mount()

		el.disabled = true
		await flush()

		expect(field(el).disabled).toBe(true)
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = mount('direction="rtl"')

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('aria_label доходит до <input>', () => {
		const el = mount('aria_label="Согласие"')

		expect(field(el).getAttribute('aria-label')).toBe('Согласие')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it.each([true, false])('value: %s — нативный checked у <input>, без aria-checked', (value) => {
		const input = field(mount(value ? 'value' : ''))

		expect(input.checked).toBe(value)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена value доходит до checked в обе стороны', async () => {
		const el = mount()

		el.value = true
		await flush()

		expect(field(el).checked).toBe(true)

		el.value = false
		await flush()

		expect(field(el).checked).toBe(false)
	})

	it('name и id — на поле', () => {
		const el = mount('name="agree" id="agree"')

		expect(field(el).name).toBe('agree')
		expect(field(el).id).toBe('agree')
	})
})

describe.each(CHECKABLES)('%s · атрибуты разметки', (_name, { is }) => {
	/**
	 * Атрибуты потребителя делятся, как у остальных адаптеров: класс и стиль —
	 * корню, остальное из разметки — полю, поверх его `aria`. Входы пропов и
	 * `slot` — место корня в свете родителя — остаются на корне.
	 */
	it('класс, стиль, slot и входы — на корне, прочие атрибуты разметки — на поле', () => {
		const el = mountAs(
			`<span is="${is}" class="app-control" style="color: red" slot="x" name="agree" data-testid="probe" tabindex="2" aria-label="Согласие" title="Подсказка"></span>`,
			isCheckable,
		)
		const input = field(el)

		expect(el.classList.contains('app-control')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(el.getAttribute('slot')).toBe('x')
		expect(el.getAttribute('name')).toBe('agree')
		expect(el.getAttribute('is')).toBe(is)
		expect(
			['data-testid', 'tabindex', 'aria-label', 'title'].filter((name) =>
				el.hasAttribute(name),
			),
		).toEqual([])

		expect(input.hasAttribute('class')).toBe(false)
		expect(input.hasAttribute('style')).toBe(false)
		expect(input.getAttribute('data-testid')).toBe('probe')
		expect(input.getAttribute('tabindex')).toBe('2')
		expect(input.getAttribute('aria-label')).toBe('Согласие')
		expect(input.getAttribute('title')).toBe('Подсказка')
	})

	/** Атрибут потребителя главнее набора ядра — и на поле, куда его перенесла база. */
	it('aria-label разметки — поверх имени из набора', async () => {
		const el = mountAs(
			`<span is="${is}" aria-label="Своё" aria_label="Ядра"></span>`,
			isCheckable,
		)

		expect(field(el).getAttribute('aria-label')).toBe('Своё')

		el.setAttribute('aria_label', 'Другое')
		await flush()

		expect(el.ctrl?.aria.get('aria-label')).toBe('Другое')
		expect(field(el).getAttribute('aria-label')).toBe('Своё')
	})

	/**
	 * `id` — проп поля: с двумя узлами под одним `id` `<label for>` нашёл бы
	 * корень, а тот подпись не принимает. Атрибут разметки база берёт пропом и
	 * снимает с корня; дальше `id` поля ведёт `ctrl.id`, а `el.id` — свой `id`
	 * корня.
	 */
	it('id — только у <input>, и ctrl.id совпадает с ним', async () => {
		const el = mountAs(`<span is="${is}" id="agree"></span>`, isCheckable)

		expect(el.hasAttribute('id')).toBe(false)
		expect(field(el).id).toBe('agree')
		expect(el.ctrl?.id).toBe('agree')

		const ctrl = el.ctrl

		if (!ctrl) throw new Error('инстанса нет')

		ctrl.id = 'other'
		await flush()

		expect(field(el).id).toBe('other')
		expect(el.hasAttribute('id')).toBe(false)

		ctrl.id = undefined
		await flush()

		expect(field(el).hasAttribute('id')).toBe(false)
	})

	it('id — не наблюдаемый атрибут: el.id остаётся у корня', async () => {
		const el = mountAs(`<span is="${is}" id="agree"></span>`, isCheckable)

		el.id = 'root'
		await flush()

		expect(el.getAttribute('id')).toBe('root')
		expect(field(el).id).toBe('agree')
		expect(el.ctrl?.id).toBe('agree')
		expect(TCheckBoxElement.observedAttributes).not.toContain('id')
		expect(TSwitchElement.observedAttributes).not.toContain('id')
	})

	/** Перенос — при построении: записанное потом из кода остаётся на корне. */
	it('атрибут, записанный после построения, остаётся на корне', async () => {
		const el = mountAs(`<span is="${is}"></span>`, isCheckable)

		el.setAttribute('data-late', 'x')
		await flush()

		expect(el.getAttribute('data-late')).toBe('x')
		expect(field(el).hasAttribute('data-late')).toBe(false)
	})

	/** Атрибуты элемента из кода, выставленные до подключения, — та же разметка. */
	it('атрибут, выставленный кодом до подключения, переезжает на поле', () => {
		const node = document.createElement('span', { is })

		node.setAttribute('aria-describedby', 'hint')
		document.body.appendChild(node)

		expect(node.hasAttribute('aria-describedby')).toBe(false)
		expect(field(node).getAttribute('aria-describedby')).toBe('hint')
	})

	/** Свет и структура строятся один раз: перестановка атрибуты заново не делит. */
	it('перестановка в DOM: поле одно, атрибуты на местах', async () => {
		const el = mountAs(`<span is="${is}" data-testid="probe" id="agree"></span>`, isCheckable)

		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		expect(el.querySelectorAll('input')).toHaveLength(1)
		expect(field(el).getAttribute('data-testid')).toBe('probe')
		expect(field(el).id).toBe('agree')
		expect(el.hasAttribute('id')).toBe(false)
	})
})

describe.each(CHECKABLES)('%s · клик', (_name, { is, mountCtrl: withCtrl }) => {
	it('переключает DOM и модель', async () => {
		const el = withCtrl()
		const input = field(el)

		await nextFrame()
		input.click()

		expect(input.checked).toBe(true)
		expect(el.ctrl?.value).toBe(true)
	})

	it('один клик — одно so:change:value', async () => {
		const el = mountAs(`<span is="${is}"></span>`, isCheckable)
		const changes = collect(el, 'so:change:value')

		await nextFrame()
		field(el).click()

		expect(changes).toEqual([{ newValue: true, oldValue: false }])
	})

	it('readonly — клик отменён: DOM и модель не меняются', async () => {
		const el = withCtrl(true)
		const input = field(el)

		await nextFrame()
		input.click()

		expect(input.checked).toBe(false)
		expect(el.ctrl?.value).toBe(false)
	})

	/** После клика отметка узла — уже его собственная; значение из кода доходит свойством. */
	it('ctrl.value из кода после клика — в DOM', async () => {
		const el = withCtrl()
		const input = field(el)
		const ctrl = el.ctrl

		await nextFrame()
		input.click()

		if (!ctrl) throw new Error('инстанса нет')

		ctrl.value = false
		await flush()

		expect(input.checked).toBe(false)
	})
})

describe('CheckBox · indeterminate', () => {
	const mount = (attributes = '') =>
		mountAs(`<span is="so-check-box" ${attributes}></span>`, isCheckBox)

	it('DOM-свойство <input>, а не aria-checked="mixed"', () => {
		const input = field(mount('indeterminate'))

		expect(input.indeterminate).toBe(true)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена пропа доходит до свойства в обе стороны', async () => {
		const el = mount()

		expect(field(el).indeterminate).toBe(false)

		el.indeterminate = true
		await flush()

		expect(field(el).indeterminate).toBe(true)

		el.indeterminate = false
		await flush()

		expect(field(el).indeterminate).toBe(false)
	})

	it('клик снимает indeterminate и отмечает', async () => {
		const ctrl = new TCheckBox({ indeterminate: true })
		const input = field(mountCheckBox(ctrl))

		await nextFrame()
		input.click()

		expect(input.indeterminate).toBe(false)
		expect(input.checked).toBe(true)
		expect(ctrl.indeterminate).toBe(false)
		expect(ctrl.value).toBe(true)
	})

	it('клик не снимает indeterminate у readonly', async () => {
		const ctrl = new TCheckBox({ indeterminate: true, readonly: true })
		const input = field(mountCheckBox(ctrl))

		await nextFrame()
		input.click()

		expect(input.indeterminate).toBe(true)
		expect(ctrl.indeterminate).toBe(true)
	})
})

/** Содержимое `<svg>` иконки так, как его сериализует документ. */
function bodyOf(role: string): string {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

	svg.innerHTML = getIcon(role).body

	return svg.innerHTML
}

describe('CheckBox · отметка', () => {
	const mount = (html: string) => mountAs(html, isCheckBox)

	/** Отметка — в коробке: иконка или содержимое слота. */
	const mark = (root: Element) => find(root, '.so-check-box__container', HTMLElement)

	it('выбранный — иконка из пакета по роли check', () => {
		const svg = find(mark(mount('<span is="so-check-box" value></span>')), 'svg', SVGSVGElement)

		expect(svg.getAttribute('viewBox')).toBe(material.check.viewBox)
		expect(svg.innerHTML).toBe(bodyOf('check'))
		expect(svg.classList.contains('so-check-box__mark')).toBe(true)
	})

	it('частично выбранный — иконка по роли checkIndeterminate, и поверх значения', () => {
		const el = mount('<span is="so-check-box" value indeterminate></span>')

		expect(find(mark(el), 'svg', SVGSVGElement).innerHTML).toBe(bodyOf('checkIndeterminate'))
	})

	it('невыбранный — коробка пуста', () => {
		expect(mark(mount('<span is="so-check-box"></span>')).childNodes).toHaveLength(0)
	})

	/**
	 * Отметка — `svg` роли, а не элемент Icon: тот собирал бы свой контекст и
	 * плагины на каждую смену отметки, в таблице — тысячами. Узел отметки у
	 * флажка один: смена отметки рисует на нём другую роль.
	 */
	it('отметка — не элемент Icon, узел один на смены отметки', async () => {
		const el = mount('<span is="so-check-box" value></span>')
		const svg = find(mark(el), 'svg', SVGSVGElement)

		el.indeterminate = true
		await flush()

		expect(find(mark(el), 'svg', SVGSVGElement)).toBe(svg)
		expect(svg.innerHTML).toBe(bodyOf('checkIndeterminate'))

		el.indeterminate = false
		el.value = false
		await flush()

		expect(mark(el).childNodes).toHaveLength(0)

		el.value = true
		await flush()

		expect(find(mark(el), 'svg', SVGSVGElement)).toBe(svg)
		expect(el.querySelector('.so-icon')).toBeNull()
	})

	/** Роль читается на отрисовке: пакет, подключённый позже, виден со следующей. */
	it('иконка по роли — из пакета на момент отрисовки', async () => {
		const el = mount('<span is="so-check-box" value></span>')

		try {
			setIcons({ check: { viewBox: '0 0 10 10', body: '<circle r="5"></circle>' } })
			el.value = false
			await flush()
			el.value = true
			await flush()

			const svg = find(mark(el), 'svg', SVGSVGElement)

			expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
			expect(svg.innerHTML).toBe(bodyOf('check'))
		} finally {
			setIcons(material)
		}
	})

	/**
	 * Слот выводит привязка: активный — в коробке, неактивный — вне документа;
	 * без слота у своего состояния — иконка роли.
	 */
	it('слоты icon и indeterminate-icon меняются вместе с состоянием', async () => {
		const host = markup(`<span is="so-check-box">
			<b slot="icon">✓</b>
			<i slot="indeterminate-icon">–</i>
		</span>`)
		const el = host.querySelector('[is="so-check-box"]')
		const icon = find(host, 'b[slot="icon"]', HTMLElement)
		const partial = find(host, 'i[slot="indeterminate-icon"]', HTMLElement)

		if (!isCheckBox(el)) throw new Error('<span is="so-check-box"> нет')

		document.body.appendChild(host)

		expect(mark(el).childNodes).toHaveLength(0)
		expect([icon.isConnected, partial.isConnected]).toEqual([false, false])

		el.value = true
		await flush()

		expect([...mark(el).childNodes]).toEqual([icon])
		expect(partial.isConnected).toBe(false)

		el.indeterminate = true
		await flush()

		expect([...mark(el).childNodes]).toEqual([partial])
		expect(icon.isConnected).toBe(false)
	})

	it('слот только у одного состояния — у другого иконка роли', async () => {
		const el = mount('<span is="so-check-box" value><b slot="icon">✓</b></span>')

		expect(mark(el).textContent).toBe('✓')

		el.indeterminate = true
		await flush()

		expect(find(mark(el), 'svg', SVGSVGElement).innerHTML).toBe(bodyOf('checkIndeterminate'))
		expect(mark(el).children).toHaveLength(1)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = checkBoxTemplate.create(document.createElement('span'), () => false).slots

		expect(Object.keys(targets).sort()).toEqual(
			CheckBoxDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('Switch · роль и ручка', () => {
	const mount = (html: string) => mountAs(html, isSwitch)

	/** Содержимое ручки. */
	const thumb = (root: Element) => find(root, '.so-switch__track--thumb', HTMLElement)

	it('role="switch" на <input>, а не на корне; dir — на корне', () => {
		const el = mount('<span is="so-switch" direction="rtl"></span>')

		expect(field(el).getAttribute('role')).toBe('switch')
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('в ручке — слот off у выключенного и on у включённого, неактивный — вне документа', async () => {
		const host = markup(
			'<span is="so-switch"><i slot="on">вкл</i><i slot="off">выкл</i></span>',
		)
		const el = host.querySelector('[is="so-switch"]')
		const on = find(host, '[slot="on"]', HTMLElement)
		const off = find(host, '[slot="off"]', HTMLElement)

		if (!isSwitch(el)) throw new Error('<span is="so-switch"> нет')

		document.body.appendChild(host)

		expect(thumb(el).textContent).toBe('выкл')
		expect(on.isConnected).toBe(false)

		el.value = true
		await flush()

		expect(thumb(el).textContent).toBe('вкл')
		expect([...thumb(el).childNodes]).toEqual([on])
		expect(off.isConnected).toBe(false)
	})

	it('без слотов ручка пуста', () => {
		expect(thumb(mount('<span is="so-switch" value></span>')).childNodes).toHaveLength(0)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = switchTemplate.create(document.createElement('span'), () => false).slots

		expect(Object.keys(targets).sort()).toEqual(
			SwitchDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})
