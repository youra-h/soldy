/**
 * NumberInput во Vue — проводка целиком, на настоящей разметке.
 *
 * Формат, разбор, шаг и буфер правки считает ядро
 * (`core/__tests__/number-input.spec.ts`), набор, клавиши и кнопки — плагины
 * (`plugins/__tests__/number-input.plugin.spec.ts`), раскладку и настоящий
 * ввод — браузер (`playground/vue/browser/number-input.spec.ts`). Здесь важно,
 * что они сходятся в разметке: ввод с текстом и наборами ядра, кнопки шага с
 * их наборами и выключенностью, скрытое поле с числом, слоты, `v-model` и
 * `commit`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TNumberInput } from '@soldy-ui/core'
import type { INumberInputProps } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { LocaleProvider, NumberInput } from '@soldy-ui/vue'

/** Плагины цепляют слушатели по `element:ready`, а оно приходит кадром. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Поле в документе; `v-model` — по-настоящему: значение возвращается пропом. */
async function render(props: Partial<INumberInputProps> & Record<string, unknown> = {}) {
	const mounted = mount(NumberInput, {
		props: {
			...props,
			'onUpdate:value': (value: number | undefined) => mounted.setProps({ value }),
		},
		attachTo: document.body,
	})

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function input(): HTMLInputElement {
	const node = document.querySelector('.so-number-input__input')

	if (!(node instanceof HTMLInputElement)) throw new Error('ввода нет')

	return node
}

function hidden(): HTMLInputElement {
	const node = document.querySelector('.so-number-input input[type="hidden"]')

	if (!(node instanceof HTMLInputElement)) throw new Error('скрытого поля нет')

	return node
}

/** Набрать текст, как браузер: `beforeinput`, текст в ввод и `input`. */
async function type(text: string): Promise<void> {
	const field = input()

	for (const char of text) {
		const before = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: char,
			bubbles: true,
			cancelable: true,
		})

		field.setSelectionRange(field.value.length, field.value.length)
		field.dispatchEvent(before)

		if (before.defaultPrevented) continue

		field.value += char
		field.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))
	}

	await nextTick()
}

/** Клавиша на вводе, как у пользователя: всплывает до корня. */
async function press(key: string): Promise<KeyboardEvent> {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	input().dispatchEvent(event)
	await nextTick()

	return event
}

/** Нажать и отпустить кнопку шага мышью. */
async function click(selector: string): Promise<void> {
	const button = find(selector)

	button.dispatchEvent(
		new PointerEvent('pointerdown', {
			pointerType: 'mouse',
			button: 0,
			bubbles: true,
			cancelable: true,
		}),
	)
	button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
	await nextTick()
}

describe('разметка', () => {
	it('корень — коробка поля; ввод — счётчик с текстом и наборами ядра', async () => {
		await render({ value: 1234.5, min: 0, max: 10000 })

		const field = input()

		expect(find('.so-number-input').tagName).toBe('DIV')
		expect(field.type).toBe('text')
		expect(field.value).toBe(new Intl.NumberFormat('en-US').format(1234.5))
		expect(field.getAttribute('role')).toBe('spinbutton')
		expect(field.getAttribute('aria-valuenow')).toBe('1234.5')
		expect(field.getAttribute('aria-valuetext')).toBe(field.value)
		expect(field.getAttribute('aria-valuemin')).toBe('0')
		expect(field.getAttribute('aria-valuemax')).toBe('10000')
		expect(field.getAttribute('inputmode')).toBe('decimal')
		expect(field.getAttribute('dir')).toBe('ltr')
		expect(field.getAttribute('lang')).toBe('en-US')
		expect(field.getAttribute('autocomplete')).toBe('off')
		expect(field.getAttribute('spellcheck')).toBe('false')
	})

	it('у открытой стороны aria-valuemin и aria-valuemax нет', async () => {
		await render()

		expect(input().hasAttribute('aria-valuemin')).toBe(false)
		expect(input().hasAttribute('aria-valuemax')).toBe(false)
		expect(input().hasAttribute('aria-valuenow')).toBe(false)
	})

	it('кнопки шага — после слотов, не остановки Tab, со значками ролей minus и plus', async () => {
		await render({ clearable: true })

		const children = [...find('.so-number-input').children].map((node) => node.className)
		const decrement = find('.so-number-input__decrement')
		const increment = find('.so-number-input__increment')

		expect(children.indexOf('so-number-input__stepper')).toBeGreaterThan(
			children.findIndex((name) => name.includes('so-number-input__trailing')),
		)
		expect(decrement.getAttribute('tabindex')).toBe('-1')
		expect(increment.getAttribute('tabindex')).toBe('-1')
		expect(decrement.getAttribute('type')).toBe('button')
		expect(decrement.getAttribute('aria-label')).toBe('Decrease')
		expect(increment.getAttribute('aria-label')).toBe('Increase')
		expect(decrement.querySelector('svg')).not.toBeNull()
		expect(increment.querySelector('svg')).not.toBeNull()
	})

	it('у края кнопка выключена: data-disabled; у readonly — обе', async () => {
		const mounted = await render({ value: 10, max: 10 })

		expect(find('.so-number-input__increment').dataset.disabled).toBe('true')
		expect(find('.so-number-input__decrement').dataset.disabled).toBe('false')

		await mounted.setProps({ readonly: true })

		expect(find('.so-number-input__decrement').dataset.disabled).toBe('true')
	})

	it('атрибуты снаружи: класс и стиль — корню, остальное — вводу', async () => {
		await render({ class: 'mine', 'data-test': 'n' })

		expect(find('.so-number-input').classList.contains('mine')).toBe(true)
		expect(input().getAttribute('data-test')).toBe('n')
	})

	it('ru-RU от локали поддерева: текст и имена кнопок', async () => {
		wrapper = mount(LocaleProvider, {
			props: { locale: ruRU },
			slots: { default: () => h(NumberInput, { value: 1234.5, name: 'Количество' }) },
			attachTo: document.body,
		})
		await nextTick()

		expect(input().value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(find('.so-number-input__increment').getAttribute('aria-label')).toBe(
			'Увеличить Количество',
		)
	})
})

describe('скрытое поле формы', () => {
	it('имя и значение — число, а не текст ввода; пусто — пусто', async () => {
		const mounted = await render({
			name: 'price',
			value: 1234.5,
			formatOptions: { style: 'currency', currency: 'RUB' },
		})

		expect(hidden().name).toBe('price')
		expect(hidden().value).toBe('1234.5')

		await mounted.setProps({ value: undefined })

		expect(hidden().value).toBe('')
	})

	it('у выключенного поля выключено и скрытое', async () => {
		await render({ name: 'n', disabled: true })

		expect(hidden().disabled).toBe(true)
		expect(input().disabled).toBe(true)
	})
})

describe('v-model и commit', () => {
	it('набор возвращает число через update:value на каждый знак, commit — на уход фокуса', async () => {
		const mounted = await render()

		await type('12.5')

		expect(mounted.emitted('update:value')?.map(([value]) => value)).toEqual([1, 12, 12.5])
		expect(input().value).toBe('12.5')

		input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		await nextTick()

		expect(mounted.emitted('commit')).toEqual([[{ newValue: 12.5, oldValue: undefined }]])
	})

	it('буква в ввод не встаёт', async () => {
		await render({ value: 5 })
		await type('a')

		expect(input().value).toBe('5')
	})

	it('эхо итога за max текст не трогает: набранное «150» не становится «100»', async () => {
		const mounted = await render({ max: 100 })

		await type('150')

		expect(mounted.props('value')).toBe(100)
		expect(input().value).toBe('150')

		await press('Enter')

		expect(input().value).toBe('100')
	})

	it('↑ — шаг с commit; кнопка шага — тоже', async () => {
		const mounted = await render({ value: 5, step: 0.5 })

		expect((await press('ArrowUp')).defaultPrevented).toBe(true)
		expect(input().value).toBe('5.5')

		await click('.so-number-input__decrement')

		expect(mounted.props('value')).toBe(5)
		expect(mounted.emitted('commit')).toHaveLength(2)
	})

	it('значение снаружи — текст строкой формата', async () => {
		const mounted = await render({ value: 1 })

		await mounted.setProps({ value: 2000 })

		expect(input().value).toBe('2,000')
	})

	it('внешний ctrl: разметка остаётся разметкой', async () => {
		const ctrl = new TNumberInput({ value: 3 })

		await render({ ctrl, placeholder: 'Сколько' })

		expect(input().value).toBe('3')
		expect(input().placeholder).toBe('Сколько')
	})
})

describe('слоты', () => {
	it('leading и trailing получают инстанс поля; без слота обёрток нет', async () => {
		const scopes = vi.fn()

		wrapper = mount(NumberInput, {
			slots: {
				leading: (scope: object) => {
					scopes(scope)

					return h('span', { class: 'lead' }, '№')
				},
				trailing: () => h('span', { class: 'unit' }, 'шт'),
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(find('.so-number-input__leading .lead').textContent).toBe('№')
		expect(find('.so-number-input__trailing .unit').textContent).toBe('шт')
		expect(scopes.mock.calls[0]?.[0]).toHaveProperty('ctrl')

		wrapper.unmount()
		wrapper = mount(NumberInput, { attachTo: document.body })
		await nextTick()

		expect(document.querySelector('.so-number-input__leading')).toBeNull()
		expect(document.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('значки кнопок шага — свои слоты, кнопка остаётся своей', async () => {
		wrapper = mount(NumberInput, {
			slots: {
				'decrement-icon': () => h('i', { class: 'less' }),
				'increment-icon': () => h('i', { class: 'more' }),
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(find('.so-number-input__decrement .less')).toBeTruthy()
		expect(find('.so-number-input__increment .more')).toBeTruthy()
	})

	it('кнопка очистки — по clearable; клик очищает число и текст, commit', async () => {
		const mounted = await render({ value: 7, clearable: true })

		find('.so-number-input__clear').click()
		await nextTick()

		expect(mounted.props('value')).toBeUndefined()
		expect(input().value).toBe('')
		expect(mounted.emitted('commit')).toEqual([[{ newValue: undefined, oldValue: 7 }]])
	})
})
