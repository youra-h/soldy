/**
 * `<div is="so-field">` — поле формы: подпись, контрол, подсказка и ошибка.
 *
 * Сценарии — те же, что у Vue (`field.spec.ts`) и остальных адаптеров, на
 * контролах, которые в адаптере есть, без сервера. Части — разметка поля:
 * часть стоит, пока задан её текст, ошибка — при `invalid` и на месте
 * подсказки. С контролом поле связывает проводка: поле опускает связку лифтом
 * своему хосту, контрол находит её вверх по документу. Labelable-контрол
 * (Input, NumberInput, CheckBox, Switch, Rating, Slider с одной ручкой)
 * подпись называет своим `for`, группу (RadioGroup, Slider с несколькими
 * ручками) — ссылкой `aria-labelledby`. Справку контрол получает в
 * `aria-describedby`, ошибку — `aria-invalid` и `data-invalid` на своём
 * корне.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, слот части — элемент
 * с атрибутом `slot`, как у Label, а части поля шаблон строит сразу и снимает
 * те, у которых нет текста.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TField, TInput, TSlider } from '@soldy-ui/core'
import { FieldDescriptor } from '@soldy-ui/setup'
import {
	TFieldElement,
	TIconElement,
	TInputElement,
	TSliderElement,
	type TFieldElementProps,
	type TSliderElementProps,
} from '@soldy-ui/webc'
import { fieldTemplate } from '../src/components/field/field.template'
import { bareContext } from './template-context'

/**
 * Рендер коалесцируется в микротаске — ждём её перед проверкой. Так же —
 * перерисовку поля, когда принятый контрол сообщил о себе: `for` подписи за
 * его `id`, у группы — снят.
 */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isField(node: Element | null): node is TFieldElementProps {
	return node instanceof TFieldElement
}

/** Поле из разметки; узел другой — тест падает здесь. */
function mount(html: string): TFieldElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-field"]')

	if (!isField(node)) throw new Error('<div is="so-field"> нет')

	return node
}

/**
 * Поле над экземпляром `ctrl` и содержимое разметкой: `ctrl` — до вставки,
 * присвоенный подключённому элементу, он дошёл бы до ядра лишь при следующем
 * подключении.
 */
function mountOver(ctrl: TField, content: string): TFieldElementProps {
	const node = document.createElement('div', { is: 'so-field' })

	if (!isField(node)) throw new Error('<div is="so-field"> не элемент soldy')

	node.ctrl = ctrl
	node.innerHTML = content
	document.body.appendChild(node)

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Подпись поля; нет её — тест падает здесь. */
const label = (root: ParentNode = document) => find(root, '.so-field__label', HTMLLabelElement)

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

/** Поле контрола по селектору в документе. */
const input = (selector: string) => find(document, selector, HTMLInputElement)

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Радио группы — подписи текстом, как у Vue. */
const RADIOS = `<div is="so-radio-group">
	<label is="so-radio-group-item" value="a">А</label>
	<label is="so-radio-group-item" value="b">Б</label>
</div>`

describe('Field · разметка', () => {
	it('корень — div потребителя с модификаторами, части по порядку', () => {
		const el = mount(`<div is="so-field" label="Почта" helper="Не покажем никому">
			<div is="so-input"></div>
		</div>`)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect([...el.classList]).toEqual([
			'so-field',
			'so-field--size-normal',
			'so-field--position-top',
		])
		expect([...el.children].map((part) => part.className)).toEqual([
			'so-field__label',
			'so-field__control',
			'so-field__helper',
		])
		expect(label(el).textContent).toBe('Почта')
		expect(find(el, '.so-field__helper', HTMLElement).textContent).toBe('Не покажем никому')
		expect(el.querySelector('.so-field__control > .so-input')).not.toBeNull()
	})

	it('часть без текста не рисуется', () => {
		const el = mount('<div is="so-field"><div is="so-input"></div></div>')

		expect([...el.children].map((part) => part.className)).toEqual(['so-field__control'])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', async () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })
		const el = mountOver(ctrl, '<div is="so-input"></div>')

		expect(el.querySelector('.so-field__error')).toBeNull()

		ctrl.invalid = true
		await flush()

		expect(el.querySelector('.so-field__helper')).toBeNull()
		expect(find(el, '.so-field__error-text', HTMLElement).textContent).toBe('Нет @')
		expect([...el.children].map((part) => part.className)).toEqual([
			'so-field__control',
			'so-field__error',
		])

		// Значок — декор: смысл несёт текст. Роль — своим атрибутом элемента
		const icon = find(el, '.so-field__error > .so-field__error-icon', HTMLElement)

		expect(icon).toBeInstanceOf(TIconElement)
		expect(icon.getAttribute('embedded')).toBe('field.error-icon')
		expect(icon.getAttribute('icon')).toBe('error')
		expect(icon.getAttribute('aria-hidden')).toBe('true')

		ctrl.invalid = false
		await flush()

		expect([...el.children].map((part) => part.className)).toEqual([
			'so-field__control',
			'so-field__helper',
		])
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', () => {
		const el = mount(`<div is="so-field" label="Почта">
			<b slot="label-content">Почта *</b>
			<a slot="helper-content" href="#">Подробнее</a>
			<div is="so-input"></div>
		</div>`)

		expect(label(el).children).toHaveLength(1)
		expect(label(el).firstElementChild?.localName).toBe('b')
		expect(label(el).textContent).toBe('Почта *')
		expect(el.querySelector('.so-field__helper')).toBeNull()
		expect(el.querySelector('a')).toBeNull()
	})

	it('слот ошибки — своя разметка вместо текста', () => {
		const el = mount(`<div is="so-field" error="Ошибка" invalid>
			<b slot="error-content">Нет @</b>
			<div is="so-input"></div>
		</div>`)
		const text = find(el, '.so-field__error-text', HTMLElement)

		expect(text.children).toHaveLength(1)
		expect(text.textContent).toBe('Нет @')
	})

	it('подпись появилась позже — встаёт перед контролом', async () => {
		const el = mount('<div is="so-field"><div is="so-input"></div></div>')

		el.label = 'Почта'
		await flush()

		expect([...el.children].map((part) => part.className)).toEqual([
			'so-field__label',
			'so-field__control',
		])
		expect(label(el).textContent).toBe('Почта')
	})

	it('смена position меняет модификатор стороны', async () => {
		const el = mount('<div is="so-field" position="start"></div>')

		expect(el.classList.contains('so-field--position-start')).toBe(true)

		el.position = 'end'
		await flush()

		expect(el.classList.contains('so-field--position-end')).toBe(true)
		expect(el.classList.contains('so-field--position-start')).toBe(false)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('div')
		const targets = fieldTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			FieldDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селекторы — корень контрола и поле, которое называет подпись.
 */
const LABELABLES = [
	['Input', '<div is="so-input"></div>', '.so-input', '.so-input input'],
	[
		'NumberInput',
		'<div is="so-number-input"></div>',
		'.so-number-input',
		'.so-number-input__input',
	],
	['CheckBox', '<span is="so-check-box"></span>', '.so-check-box', '.so-check-box input'],
	['Switch', '<span is="so-switch"></span>', '.so-switch', '.so-switch input'],
	['Rating', '<span is="so-rating"></span>', '.so-rating', '.so-rating input'],
	['Slider', '<span is="so-slider"></span>', '.so-slider', '.so-slider input'],
] as const

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', () => {
		mount(`<div is="so-field" label="Подпись">${control}</div>`)

		expect(input(element).id).not.toBe('')
		expect(label().htmlFor).toBe(input(element).id)
		expect(input(element).hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', async () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mountOver(ctrl, control)

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = true
		await flush()

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(input(element).getAttribute('aria-invalid')).toBe('true')
		expect(node(root).dataset['invalid']).toBe('true')
		expect(input(element).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = false
		await flush()

		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)
	})

	it('подпись — у поля контрола: она в его labels', () => {
		mount(`<div is="so-field" label="Подпись">${control}</div>`)

		expect([...(input(element).labels ?? [])]).toEqual([label()])
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. */
describe('RadioGroup в поле', () => {
	const group = () => node('.so-radio-group')

	it('for у подписи нет, группа ссылается на подпись', async () => {
		mount(`<div is="so-field" label="Подпись">${RADIOS}</div>`)
		await flush()

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(group(), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы, data-invalid — на её корне', async () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mountOver(ctrl, RADIOS)

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__helper').id])

		ctrl.invalid = true
		await flush()

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(group().getAttribute('aria-invalid')).toBe('true')
		expect(group().dataset['invalid']).toBe('true')
	})

	it('радио связку поля не берут: id и ссылок на части у них нет', () => {
		mount(`<div is="so-field" label="Подпись" helper="Подсказка">${RADIOS}</div>`)

		const fields = [...document.querySelectorAll('.so-radio-group-item__input')]

		expect(fields).toHaveLength(2)
		expect(fields.map((field) => field.id)).toEqual(['', ''])
		expect(fields.map((field) => field.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])
	})
})

/**
 * Ползунок с несколькими ручками — группа: `for` назвал бы одно поле из них, а
 * ссылка на подпись в наборе полей перекрыла бы имена ручек (`thumbLabels`).
 * Подпись и справка — у корня (`role="group"`), а ошибка — `aria-invalid` на
 * каждом поле: на группе ARIA ошибки не объявляет.
 */
describe('Slider с несколькими ручками в поле', () => {
	const RANGE = `<span is="so-slider" value="[20,80]" thumb-labels='["От","До"]'></span>`
	const root = () => node('.so-slider')
	const thumbs = () => [...document.querySelectorAll('.so-slider input')]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', async () => {
		mount(`<div is="so-field" label="Цена">${RANGE}</div>`)
		await flush()

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-label'))).toEqual(['От', 'До'])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-labelledby'))).toEqual([
			false,
			false,
		])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])
	})

	it('справка — у группы, ошибка — aria-invalid на каждой ручке, data-invalid на корне', async () => {
		const ctrl = new TField({ label: 'Цена', helper: 'Подсказка', error: 'Ошибка' })

		mountOver(ctrl, RANGE)
		await flush()

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		ctrl.invalid = true
		await flush()

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root().hasAttribute('aria-invalid')).toBe(false)
		expect(root().dataset['invalid']).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', async () => {
		const slider = new TSlider({ value: 30 })
		const el = document.createElement('span', { is: 'so-slider' })

		if (!isSlider(el)) throw new Error('<span is="so-slider"> не элемент soldy')

		el.ctrl = slider

		// Ползунок над инстансом — светом поля, до вставки
		const host = document.createElement('div')

		host.innerHTML = '<div is="so-field" label="Цена"></div>'
		host.firstElementChild?.appendChild(el)
		document.body.appendChild(host)
		await flush()

		expect(label().htmlFor).toBe(input('.so-slider input').id)

		slider.value = [20, 80]
		await flush()

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])

		slider.value = 50
		await flush()

		const single = input('.so-slider input')

		expect(single.id).not.toBe('')
		expect(label().htmlFor).toBe(single.id)
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-labelledby')).toBe(false)
	})
})

function isSlider(node: Element | null): node is TSliderElementProps {
	return node instanceof TSliderElement
}

function isInput(node: Element | null): node is HTMLElement & { ctrl: TInput | undefined } {
	return node instanceof TInputElement
}

describe('Field · id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', async () => {
		mount('<div is="so-field" label="Почта"><div is="so-input" id="email"></div></div>')
		await flush()

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', async () => {
		mount('<div is="so-field" label="Почта"><div is="so-input"></div></div>')

		const control = document.querySelector('[is="so-input"]')

		if (!isInput(control) || !control.ctrl) throw new Error('поля ввода нет')

		control.ctrl.id = 'email'
		await flush()

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('контрол сняли — его id от поля снят, for — снова на id поля', () => {
		mount('<div is="so-field" label="Почта"><div is="so-input"></div></div>')

		const control = document.querySelector('[is="so-input"]')

		if (!isInput(control) || !control.ctrl) throw new Error('поля ввода нет')

		const ctrl = control.ctrl
		const id = input('.so-input input').id

		control.remove()

		expect(ctrl.id).toBeUndefined()
		expect(label().htmlFor).toBe(id)
	})
})

describe('Field · имя контрола', () => {
	it('своё имя контрола-группы главнее подписи поля', () => {
		mount(`<div is="so-field" label="Подпись">
			<div is="so-radio-group" aria_label="Своё">
				<label is="so-radio-group-item" value="a">А</label>
			</div>
		</div>`)

		expect(node('.so-radio-group').getAttribute('aria-label')).toBe('Своё')
		expect(node('.so-radio-group').hasAttribute('aria-labelledby')).toBe(false)
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', () => {
		mount(`<div is="so-field" helper="Можно отказаться в любой момент">
			<label is="so-label" text="Согласен"><span is="so-check-box"></span></label>
		</div>`)

		const checkbox = input('.so-check-box input')

		expect(document.querySelector('.so-field__label')).toBeNull()
		expect(checkbox.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(checkbox, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})

describe('Field · одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', () => {
		mount(`<div is="so-field" label="Подпись" helper="Подсказка">
			<div is="so-input"></div>
			<span is="so-check-box"></span>
		</div>`)

		const second = input('.so-check-box input')

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(label().htmlFor).toBe(input('.so-input > input').id)
	})

	it('контрол в слоте поля связки не берёт — её берёт само поле', () => {
		mount(`<div is="so-field" label="Почта" helper="Подсказка">
			<div is="so-input"><span is="so-check-box" slot="trailing"></span></div>
		</div>`)

		const field = input('.so-input > input')
		const nested = input('.so-check-box input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Поле, которое связки не взяло — её взял флажок раньше него, — своему
	 * содержимому всё равно опускает пустую связку своим хостом: контрол в его
	 * слоте — его содержимое. Флажок сняли, связка свободна, а переключатель,
	 * появившийся в слоте поля, её не берёт.
	 */
	it('связка освободилась — контрол в слоте другого контрола её не берёт', () => {
		mount(`<div is="so-field" label="Почта" helper="Подсказка">
			<span is="so-check-box"></span>
			<div is="so-input"><span class="slot" slot="trailing"></span></div>
		</div>`)

		document.querySelector('[is="so-check-box"]')?.remove()

		const toggle = document.createElement('span', { is: 'so-switch' })

		node('.so-input .slot').appendChild(toggle)

		const nested = input('.so-switch input')

		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	it('контрол появился позже — связку берёт он', () => {
		const el = mount('<div is="so-field" label="Почта" helper="Подсказка"></div>')

		find(el, '.so-field__control', HTMLElement).appendChild(
			document.createElement('div', { is: 'so-input' }),
		)

		const field = input('.so-input input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})
