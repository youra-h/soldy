/**
 * Field во Vue: поле формы — подпись, контрол, подсказка и ошибка.
 *
 * Части — разметка поля: часть стоит, пока задан её текст, ошибка — при
 * `invalid` и на месте подсказки. С контролом поле связывает проводка: поле
 * опускает связку по лифту, контрол её берёт. Labelable-контрол (Input,
 * NumberInput, Textarea, Select, CheckBox, Switch, Rating, Slider с одной
 * ручкой) подпись называет своим `for`, группу (DateInput, DatePicker,
 * RadioGroup, Slider с несколькими ручками) — ссылкой `aria-labelledby`.
 * Справку контрол получает в `aria-describedby`, ошибку — `aria-invalid` и
 * `data-invalid` на своём корне.
 *
 * Раскладку сторон, выравнивание по первой строке и клик по подписи jsdom не
 * считает — их проверяет `playground/vue/browser/field.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import { TField, TSlider } from '@soldy-ui/core'
import {
	CheckBox,
	DateInput,
	DatePicker,
	Field,
	Input,
	Label,
	NumberInput,
	RadioGroup,
	RadioGroupItem,
	Rating,
	Select,
	SelectItem,
	Slider,
	Switch,
	Textarea,
} from '@soldy-ui/vue'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать разметку в документ и дождаться кадра плагинов. */
async function render(content: () => VNode): Promise<ReturnType<typeof mount>> {
	const mounted = mount(defineComponent({ render: content }), { attachTo: document.body })

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: узла нет`)

	return element
}

const label = () => find('.so-field__label')

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

describe('разметка', () => {
	it('корень — div с модификаторами стороны и размера, части по порядку', async () => {
		await render(() =>
			h(Field, { label: 'Почта', helper: 'Не покажем никому' }, () => h(Input)),
		)

		const root = find('.so-field')

		expect(root.localName).toBe('div')
		expect([...root.classList]).toEqual([
			'so-field',
			'so-field--size-normal',
			'so-field--position-top',
		])
		expect([...root.children].map((part) => part.className)).toEqual([
			'so-field__label',
			'so-field__control',
			'so-field__helper',
		])
		expect(label().localName).toBe('label')
		expect(label().textContent).toBe('Почта')
		expect(find('.so-field__helper').textContent).toBe('Не покажем никому')
		expect(find('.so-field__control > .so-input')).toBeTruthy()
	})

	it('часть без текста не рисуется', async () => {
		await render(() => h(Field, null, () => h(Input)))

		expect([...find('.so-field').children].map((part) => part.className)).toEqual([
			'so-field__control',
		])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', async () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })

		await render(() => h(Field, { ctrl }, () => h(Input)))

		expect(document.querySelector('.so-field__error')).toBeNull()

		ctrl.invalid = true
		await nextTick()

		expect(document.querySelector('.so-field__helper')).toBeNull()
		expect(find('.so-field__error-text').textContent).toBe('Нет @')

		// Значок — декор: смысл несёт текст. Корень иконки по роли — `<svg>`
		const icon = document.querySelector('.so-field__error > .so-field__error-icon')

		expect(icon?.localName).toBe('svg')
		expect(icon?.getAttribute('aria-hidden')).toBe('true')
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', async () => {
		await render(() =>
			h(
				Field,
				{ label: 'Почта' },
				{
					default: () => h(Input),
					'label-content': () => h('b', 'Почта *'),
					'helper-content': () => h('a', { href: '#' }, 'Подробнее'),
				},
			),
		)

		expect(label().innerHTML).toBe('<b>Почта *</b>')
		expect(document.querySelector('.so-field__helper')).toBeNull()
	})

	it('смена position меняет модификатор стороны', async () => {
		const mounted = mount(Field, { props: { position: 'start' } })

		expect(mounted.classes()).toContain('so-field--position-start')

		await mounted.setProps({ position: 'end' })

		expect(mounted.classes()).toContain('so-field--position-end')
		expect(mounted.classes()).not.toContain('so-field--position-start')

		mounted.unmount()
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селектор — поле, которое называет подпись.
 */
const LABELABLES: ReadonlyArray<readonly [string, () => VNode, string, string]> = [
	['Input', () => h(Input), '.so-input', '.so-input input'],
	['NumberInput', () => h(NumberInput), '.so-number-input', '.so-number-input__input'],
	['Textarea', () => h(Textarea), '.so-textarea', '.so-textarea textarea'],
	[
		'Select',
		() =>
			h(Select, null, () => [
				h(SelectItem, { value: 'msk', text: 'Москва' }),
				h(SelectItem, { value: 'tver', text: 'Тверь' }),
			]),
		'.so-select',
		'.so-select input',
	],
	['CheckBox', () => h(CheckBox), '.so-check-box', '.so-check-box input'],
	['Switch', () => h(Switch), '.so-switch', '.so-switch input'],
	['Rating', () => h(Rating), '.so-rating', '.so-rating input'],
	['Slider', () => h(Slider), '.so-slider', '.so-slider input'],
]

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', async () => {
		await render(() => h(Field, { label: 'Подпись' }, control))

		const input = find(element)

		expect(input.id).not.toBe('')
		expect(label().getAttribute('for')).toBe(input.id)
		expect(input.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', async () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		await render(() => h(Field, { ctrl }, control))

		const input = find(element)

		expect(refsOf(input, 'aria-describedby')).toEqual([find('.so-field__helper').id])
		expect(input.hasAttribute('aria-invalid')).toBe(false)
		expect(find(root).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = true
		await nextTick()

		expect(refsOf(input, 'aria-describedby')).toEqual([find('.so-field__error').id])
		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(find(root).dataset.invalid).toBe('true')

		ctrl.invalid = false
		await nextTick()

		expect(input.hasAttribute('aria-invalid')).toBe(false)
		expect(find(root).hasAttribute('data-invalid')).toBe(false)
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. Селектор — элемент с именем группы. */
const GROUPS: ReadonlyArray<readonly [string, () => VNode, string]> = [
	['DateInput', () => h(DateInput), '.so-date-input'],
	['DatePicker', () => h(DatePicker), '.so-date-picker__field'],
	['DatePicker range', () => h(DatePicker, { mode: 'range' }), '.so-date-picker'],
	[
		'RadioGroup',
		() =>
			h(RadioGroup, null, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'А'),
				h(RadioGroupItem, { value: 'b' }, () => 'Б'),
			]),
		'.so-radio-group',
	],
]

describe.each(GROUPS)('%s в поле', (_name, control, group) => {
	it('for у подписи нет, группа ссылается на подпись', async () => {
		await render(() => h(Field, { label: 'Подпись' }, control))

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(find(group), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы', async () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		await render(() => h(Field, { ctrl }, control))

		expect(refsOf(find(group), 'aria-describedby')).toEqual([find('.so-field__helper').id])

		ctrl.invalid = true
		await nextTick()

		expect(refsOf(find(group), 'aria-describedby')).toEqual([find('.so-field__error').id])
		expect(find(group).getAttribute('aria-invalid')).toBe('true')
	})
})

/**
 * Ползунок с несколькими ручками — группа: `for` назвал бы одно поле из них, а
 * ссылка на подпись в наборе полей перекрыла бы имена ручек (`thumbLabels`).
 * Подпись и справка — у корня (`role="group"`), а ошибка — `aria-invalid` на
 * каждом поле: на группе ARIA ошибки не объявляет.
 */
describe('Slider с несколькими ручками в поле', () => {
	const range = () => h(Slider, { value: [20, 80], thumbLabels: ['От', 'До'] })
	const root = () => find('.so-slider')
	const thumbs = () => [...document.querySelectorAll('.so-slider input')]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', async () => {
		await render(() => h(Field, { label: 'Цена' }, range))

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

		await render(() => h(Field, { ctrl }, range))

		expect(refsOf(root(), 'aria-describedby')).toEqual([find('.so-field__helper').id])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		ctrl.invalid = true
		await nextTick()

		expect(refsOf(root(), 'aria-describedby')).toEqual([find('.so-field__error').id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root().hasAttribute('aria-invalid')).toBe(false)
		expect(root().dataset.invalid).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', async () => {
		const ctrl = new TSlider({ value: 30 })

		await render(() => h(Field, { label: 'Цена' }, () => h(Slider, { ctrl })))

		expect(label().getAttribute('for')).toBe(find('.so-slider input').id)

		ctrl.value = [20, 80]
		await nextTick()

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])

		ctrl.value = 50
		await nextTick()

		const input = find('.so-slider input')

		expect(input.id).not.toBe('')
		expect(label().getAttribute('for')).toBe(input.id)
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-labelledby')).toBe(false)
	})
})

describe('id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', async () => {
		await render(() => h(Field, { label: 'Почта' }, () => h(Input, { id: 'email' })))

		expect(find('.so-input input').id).toBe('email')
		expect(label().getAttribute('for')).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', async () => {
		const id = shallowRef<string | undefined>()

		await render(() => h(Field, { label: 'Почта' }, () => h(Input, { id: id.value })))

		id.value = 'email'
		await nextTick()

		expect(find('.so-input input').id).toBe('email')
		expect(label().getAttribute('for')).toBe('email')
	})

	it('контрол сняли — for снова на id поля', async () => {
		const shown = shallowRef(true)

		await render(() => h(Field, { label: 'Почта' }, () => (shown.value ? h(Input) : [])))

		const id = find('.so-input input').id

		shown.value = false
		await nextTick()

		expect(label().getAttribute('for')).toBe(id)
	})
})

describe('имя контрола', () => {
	it('своё имя контрола-группы главнее подписи поля', async () => {
		await render(() =>
			h(Field, { label: 'Подпись' }, () => h(DateInput, { aria_label: 'Своё' })),
		)

		expect(find('.so-date-input').getAttribute('aria-label')).toBe('Своё')
		expect(find('.so-date-input').hasAttribute('aria-labelledby')).toBe(false)
	})

	it('Select: aria_label доходит до комбобокса', async () => {
		await render(() => h(Select, { aria_label: 'Город' }))

		expect(find('.so-select input').getAttribute('aria-label')).toBe('Город')
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', async () => {
		await render(() =>
			h(Field, { helper: 'Можно отказаться в любой момент' }, () =>
				h(Label, { text: 'Согласен' }, () => h(CheckBox)),
			),
		)

		const input = find('.so-check-box input')

		expect(document.querySelector('.so-field__label')).toBeNull()
		expect(input.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(input, 'aria-describedby')).toEqual([find('.so-field__helper').id])
	})
})

describe('одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', async () => {
		await render(() =>
			h(Field, { label: 'Подпись', helper: 'Подсказка' }, () => [h(Input), h(CheckBox)]),
		)

		const second = find('.so-check-box input')

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(label().getAttribute('for')).toBe(find('.so-input input').id)
	})

	it('поле Select — деталь его разметки: связку берёт Select, а не его Input', async () => {
		await render(() => h(Field, { label: 'Город' }, () => h(Select)))

		const combobox = find('.so-select input')

		expect(combobox.getAttribute('role')).toBe('combobox')
		expect(label().getAttribute('for')).toBe(combobox.id)
	})
})

describe('сервер и гидратация', () => {
	it('сервер рисует связку: for подписи, id поля и справку', async () => {
		const app = createSSRApp({
			render: () => h(Field, { label: 'Почта', helper: 'Подсказка' }, () => h(Input)),
		})
		const html = await renderToString(app)
		const host = document.createElement('div')

		host.innerHTML = html

		const input = find('input', host)

		expect(find('label', host).getAttribute('for')).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([find('.so-field__helper', host).id])
	})

	it('ползунок с несколькими ручками: сервер рисует группу со ссылками на подпись и справку', async () => {
		const app = createSSRApp({
			render: () =>
				h(Field, { label: 'Цена', helper: 'Подсказка' }, () =>
					h(Slider, { value: [20, 80], thumbLabels: ['От', 'До'] }),
				),
		})
		const html = await renderToString(app)
		const host = document.createElement('div')

		host.innerHTML = html

		const group = find('.so-slider', host)

		expect(group.getAttribute('role')).toBe('group')
		expect(refsOf(group, 'aria-labelledby')).toEqual([find('label', host).id])
		expect(refsOf(group, 'aria-describedby')).toEqual([find('.so-field__helper', host).id])
	})
})
