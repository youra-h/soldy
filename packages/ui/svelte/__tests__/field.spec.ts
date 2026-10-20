/**
 * Field в Svelte: поле формы — подпись, контрол, подсказка и ошибка.
 *
 * Сценарии — те же, что у Vue (`field.spec.ts`), React и Solid, на
 * контролах, которые в адаптере есть. Части — разметка поля: часть стоит,
 * пока задан её текст, ошибка — при `invalid` и на месте подсказки. С
 * контролом поле связывает проводка: поле опускает связку лифтом
 * (`setContext`), контрол её берёт (`getContext`). Labelable-контрол (Input,
 * Select, CheckBox, Switch, Rating, Slider с одной ручкой) подпись называет своим
 * `for`, группу (RadioGroup, Slider с несколькими ручками) — ссылкой
 * `aria-labelledby`. Справку контрол получает в `aria-describedby`, ошибку —
 * `aria-invalid` и `data-invalid` на своём корне.
 *
 * Разметка с содержимым — в обёртке `Field.test.svelte`: содержимое
 * разметкой пишется только в `.svelte`.
 *
 * Раскладку сторон, выравнивание по первой строке и клик по подписи jsdom не
 * считает — их проверяет `playground/vue/browser/field.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TField, TInput, TSlider } from '@soldy-ui/core'
import { Field, Select, type FieldProps } from '@soldy-ui/svelte'
import FieldHarness from './Field.test.svelte'
import { find, htmlOf, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup } from './snippets.svelte'

/** Пропсы обёртки — как их видит тест. */
type THarnessProps = Parameters<typeof FieldHarness>[1]

/** Подпись поля на странице; нет её — тест падает здесь. */
const label = () => find(document, '.so-field__label', HTMLLabelElement)

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

/** Поле контрола по селектору в документе. */
const input = (selector: string) => find(document, selector, HTMLInputElement)

describe('Field · разметка', () => {
	it('корень — div с модификаторами стороны и размера, части по порядку', () => {
		const root = mount(FieldHarness, {
			label: 'Почта',
			helper: 'Не покажем никому',
			controls: ['input'],
		}).root()

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
		expect(label().textContent).toBe('Почта')
		expect(node('.so-field__helper').textContent).toBe('Не покажем никому')
		expect(root.querySelector('.so-field__control > .so-input')).not.toBeNull()
	})

	it('часть без текста не рисуется', () => {
		const root = mount(FieldHarness, { controls: ['input'] }).root()

		expect([...root.children].map((part) => part.className)).toEqual(['so-field__control'])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })

		mount(FieldHarness, { ctrl, controls: ['input'] })

		expect(document.querySelector('.so-field__error')).toBeNull()

		ctrl.invalid = true
		flushSync()

		expect(document.querySelector('.so-field__helper')).toBeNull()
		expect(node('.so-field__error-text').textContent).toBe('Нет @')

		// Значок — декор: смысл несёт текст. Корень иконки по роли — `<svg>`
		const icon = document.querySelector('.so-field__error > .so-field__error-icon')

		expect(icon?.localName).toBe('svg')
		expect(icon?.getAttribute('aria-hidden')).toBe('true')
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', () => {
		mount(Field, {
			label: 'Почта',
			'label-content': markup('<b>Почта *</b>'),
			'helper-content': markup('<a href="#">Подробнее</a>'),
		})

		expect(htmlOf(label())).toBe('<b>Почта *</b>')
		expect(document.querySelector('.so-field__helper')).toBeNull()
	})

	it('слот ошибки — своя разметка вместо текста', () => {
		mount(Field, { error: 'Ошибка', invalid: true, 'error-content': markup('<b>Нет @</b>') })

		expect(htmlOf(node('.so-field__error-text'))).toBe('<b>Нет @</b>')
	})

	it('смена position меняет модификатор стороны', () => {
		const props = reactiveProps<FieldProps>({ position: 'start' })
		const { root } = mount(Field, props)

		expect(root().classList.contains('so-field--position-start')).toBe(true)

		props.position = 'end'
		flushSync()

		expect(root().classList.contains('so-field--position-end')).toBe(true)
		expect(root().classList.contains('so-field--position-start')).toBe(false)
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(Field, { tag: 'section' }).root().localName).toBe('section')
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селекторы — корень контрола и поле, которое называет подпись.
 */
const LABELABLES = [
	['Input', 'input', '.so-input', '.so-input input'],
	['CheckBox', 'check-box', '.so-check-box', '.so-check-box input'],
	['Switch', 'switch', '.so-switch', '.so-switch input'],
	['Rating', 'rating', '.so-rating', '.so-rating input'],
	['Slider', 'slider', '.so-slider', '.so-slider input'],
	['Select', 'select', '.so-select', '.so-select__field input'],
] as const

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', () => {
		mount(FieldHarness, { label: 'Подпись', controls: [control] })

		expect(input(element).id).not.toBe('')
		expect(label().htmlFor).toBe(input(element).id)
		expect(input(element).hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(FieldHarness, { ctrl, controls: [control] })

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = true
		flushSync()

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(input(element).getAttribute('aria-invalid')).toBe('true')
		expect(node(root).dataset['invalid']).toBe('true')
		expect(input(element).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = false
		flushSync()

		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. */
describe('RadioGroup в поле', () => {
	const group = () => node('.so-radio-group')

	it('for у подписи нет, группа ссылается на подпись', () => {
		mount(FieldHarness, { label: 'Подпись', controls: ['radio-group'] })

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(group(), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы, data-invalid — на её корне', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(FieldHarness, { ctrl, controls: ['radio-group'] })

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__helper').id])

		ctrl.invalid = true
		flushSync()

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(group().getAttribute('aria-invalid')).toBe('true')
		expect(group().dataset['invalid']).toBe('true')
	})

	it('радио связку поля не берут: id и ссылок на части у них нет', () => {
		mount(FieldHarness, { label: 'Подпись', helper: 'Подсказка', controls: ['radio-group'] })

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
 * Ползунок с несколькими ручками — группа: подпись называет корень ссылкой,
 * `for` назвал бы одно поле из нескольких, а имена ручек — их `thumbLabels`.
 * Число ручек задаёт значение, и подпись переходит между `for` и ссылкой
 * вслед за ним.
 */
describe('Slider с несколькими ручками в поле', () => {
	const root = () => node('.so-slider')
	const thumbs = () => [...document.querySelectorAll('.so-slider input')]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', () => {
		mount(FieldHarness, { label: 'Цена', controls: ['slider-range'] })

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

	it('справка — у группы, ошибка — aria-invalid на каждой ручке, data-invalid на корне', () => {
		const ctrl = new TField({ label: 'Цена', helper: 'Подсказка', error: 'Ошибка' })

		mount(FieldHarness, { ctrl, controls: ['slider-range'] })

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		ctrl.invalid = true
		flushSync()

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root().hasAttribute('aria-invalid')).toBe(false)
		expect(root().dataset['invalid']).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', () => {
		const slider = new TSlider({ value: 30 })

		mount(FieldHarness, { label: 'Цена', controls: ['slider'], slider })

		expect(label().htmlFor).toBe(input('.so-slider input').id)

		slider.value = [20, 80]
		flushSync()

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])

		slider.value = 50
		flushSync()

		const field = input('.so-slider input')

		expect(field.id).not.toBe('')
		expect(label().htmlFor).toBe(field.id)
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-labelledby')).toBe(false)
	})
})

describe('Field · id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', () => {
		mount(FieldHarness, { label: 'Почта', controls: ['input'], id: 'email' })

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', () => {
		const ctrl = new TInput()

		mount(FieldHarness, { label: 'Почта', controls: ['input'], input: ctrl })

		ctrl.id = 'email'
		flushSync()

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('контрол сняли — его id от поля снят, for — снова на id поля', () => {
		const ctrl = new TInput()
		const props = reactiveProps<THarnessProps>({
			label: 'Почта',
			controls: ['input'],
			input: ctrl,
		})

		mount(FieldHarness, props)

		const id = input('.so-input input').id

		props.controls = []
		flushSync()

		expect(ctrl.id).toBeUndefined()
		expect(label().htmlFor).toBe(id)
	})
})

describe('Field · имя контрола', () => {
	it('своё имя контрола-группы главнее подписи поля', () => {
		mount(FieldHarness, { label: 'Подпись', controls: ['radio-group'], groupLabel: 'Своё' })

		expect(node('.so-radio-group').getAttribute('aria-label')).toBe('Своё')
		expect(node('.so-radio-group').hasAttribute('aria-labelledby')).toBe(false)
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', () => {
		mount(FieldHarness, {
			helper: 'Можно отказаться в любой момент',
			controls: ['label-check-box'],
		})

		const checkbox = input('.so-check-box input')

		expect(document.querySelector('.so-field__label')).toBeNull()
		expect(checkbox.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(checkbox, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})

/**
 * Поле Select — деталь его разметки (`embedded`): связку поля формы берёт
 * сам Select, а не его Input, и свой набор `aria` с `id` от поля отдаёт
 * `<input>` комбобокса.
 */
describe('Field · Select', () => {
	it('поле Select — деталь его разметки: связку берёт Select, а не его Input', () => {
		mount(FieldHarness, { label: 'Город', controls: ['select'] })

		const combobox = input('.so-select__field input')

		expect(combobox.getAttribute('role')).toBe('combobox')
		expect(combobox.id).not.toBe('')
		expect(label().htmlFor).toBe(combobox.id)
	})

	it('aria_label Select доходит до комбобокса', () => {
		mount(Select, { aria_label: 'Город' })

		expect(input('.so-select__field input').getAttribute('aria-label')).toBe('Город')
		expect(node('.so-select').hasAttribute('aria-label')).toBe(false)
	})
})

describe('Field · одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', () => {
		mount(FieldHarness, {
			label: 'Подпись',
			helper: 'Подсказка',
			controls: ['input', 'check-box'],
		})

		const second = input('.so-check-box input')

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(label().htmlFor).toBe(input('.so-input input').id)
	})

	it('контрол в слоте поля связки не берёт — её берёт само поле', () => {
		mount(FieldHarness, {
			label: 'Почта',
			helper: 'Подсказка',
			controls: ['input'],
			nested: true,
		})

		const field = input('.so-input > input')
		const nested = input('.so-check-box input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Поле, которое связки не взяло — её взял флажок раньше него, — своему
	 * содержимому всё равно опускает пустую связку: контрол в его слоте — его
	 * содержимое. Флажок сняли, связка свободна, а флажок, появившийся в слоте
	 * поля, её не берёт.
	 */
	it('связка освободилась — контрол в слоте другого контрола её не берёт', () => {
		const props = reactiveProps<THarnessProps>({
			label: 'Почта',
			helper: 'Подсказка',
			controls: ['check-box', 'input'],
		})

		mount(FieldHarness, props)

		props.controls = ['input']
		flushSync()
		props.nested = true
		flushSync()

		const nested = input('.so-check-box input')

		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	it('контрол появился позже — связку берёт он', () => {
		const props = reactiveProps<THarnessProps>({
			label: 'Почта',
			helper: 'Подсказка',
			controls: [],
		})

		mount(FieldHarness, props)

		props.controls = ['input']
		flushSync()

		const field = input('.so-input input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})
