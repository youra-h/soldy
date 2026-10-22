/**
 * NumberInput в Svelte — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`number-input.spec.ts`) и React. Формат,
 * разбор, шаг и буфер правки считает ядро (`core/__tests__/number-input.spec.ts`),
 * набор, клавиши и кнопки — плагины
 * (`plugins/__tests__/number-input.plugin.spec.ts`), раскладку и настоящий
 * ввод — браузер (`playground/vue/browser/number-input.spec.ts`). Здесь важно,
 * что они сходятся в разметке: ввод с текстом и наборами ядра, кнопки шага с
 * их наборами и выключенностью, скрытое поле с числом, слоты, управляемое
 * значение и `commit`.
 *
 * Текст ввода — буфер правки ядра (`text`), а не значение: разметка пишет его
 * свойством узла, и только когда он разошёлся с узлом (`fieldText`). На
 * сервере текст уходит атрибутом `value` — это проверяет
 * `number-input.server.spec.ts`. `ref` — корень: его сторожит
 * `root-attributes.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach, type Mock } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { TNumberInput, type INumberInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { NumberInput, type NumberInputProps } from '@soldy-ui/svelte'
import LocaleNumberInput from './LocaleNumberInput.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Значение поля числа: число или пусто. */
type TValue = number | undefined

/** Колбэк смены значения и `commit`: пара «стало, было». */
type TChange = (payload: TValuePayload<TValue>) => void

/**
 * Поле в документе; значение — по-настоящему: потребитель возвращает его
 * пропом, как привязка. Слушатели встают по `ready` узла — кадром позже.
 */
async function render(initial: NumberInputProps = {}): Promise<NumberInputProps> {
	const props = reactiveProps<NumberInputProps>({
		...initial,
		onChangeValue: (payload) => {
			props.value = payload.newValue
			initial.onChangeValue?.(payload)
		},
	})

	mount(NumberInput, props)
	await nextFrame()

	return props
}

/** Корень поля. */
const root = () => find(document, '.so-number-input', HTMLElement)

/** Ввод — по своему классу: рядом в корне лежит скрытое поле формы. */
const input = () => find(document, '.so-number-input__input', HTMLInputElement)

const hidden = () => find(document, '.so-number-input input[type="hidden"]', HTMLInputElement)

const button = (selector: string) => find(document, selector, HTMLButtonElement)

/** Значения из событий `onChangeValue` — по порядку. */
const values = (spy: Mock<TChange>) => spy.mock.calls.map(([payload]) => payload.newValue)

/** Набрать текст, как браузер: `beforeinput`, текст в ввод и `input`. */
function type(text: string): void {
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
		flushSync()
	}
}

/** Клавиша на вводе, как у пользователя: всплывает до корня. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	input().dispatchEvent(event)
	flushSync()

	return event
}

/** Нажатие указателем на кнопку шага. */
function pointer(target: Element, type: 'pointerdown' | 'pointerup'): void {
	target.dispatchEvent(
		new PointerEvent(type, {
			pointerType: 'mouse',
			button: 0,
			bubbles: true,
			cancelable: true,
		}),
	)
	flushSync()
}

/** Нажать и отпустить кнопку шага мышью. */
function click(selector: string): void {
	const target = button(selector)

	pointer(target, 'pointerdown')
	pointer(target, 'pointerup')
}

describe('NumberInput · разметка', () => {
	it('корень — коробка поля; ввод — счётчик с текстом и наборами ядра', async () => {
		await render({ value: 1234.5, min: 0, max: 10000 })

		const field = input()

		expect(root().localName).toBe('div')
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
		// Имени у ввода нет: в форму уходит число, а не текст
		expect(field.hasAttribute('name')).toBe(false)
	})

	it('у открытой стороны aria-valuemin и aria-valuemax нет', async () => {
		await render()

		expect(input().hasAttribute('aria-valuemin')).toBe(false)
		expect(input().hasAttribute('aria-valuemax')).toBe(false)
		expect(input().hasAttribute('aria-valuenow')).toBe(false)
	})

	it('кнопки шага — после слотов, не остановки Tab, со значками ролей minus и plus', async () => {
		await render({ clearable: true })

		const children = [...root().children].map((node) => node.className)
		const decrement = button('.so-number-input__decrement')
		const increment = button('.so-number-input__increment')

		expect(children.indexOf('so-number-input__stepper')).toBeGreaterThan(
			children.findIndex((name) => name.includes('so-number-input__trailing')),
		)
		expect(decrement.getAttribute('tabindex')).toBe('-1')
		expect(increment.getAttribute('tabindex')).toBe('-1')
		expect(decrement.getAttribute('type')).toBe('button')
		expect(increment.getAttribute('type')).toBe('button')
		expect(decrement.getAttribute('aria-label')).toBe('Decrease')
		expect(increment.getAttribute('aria-label')).toBe('Increase')
		expect(decrement.querySelector('svg')).not.toBeNull()
		expect(increment.querySelector('svg')).not.toBeNull()
	})

	it('порядок узлов — как у Vue: слоты, ввод, обёртка у конца, кнопки шага, скрытое поле', async () => {
		await render({ clearable: true, leading: markup('<i>№</i>') })

		expect(
			[...root().children].map((node) =>
				node.localName === 'input' ? `input.${node.getAttribute('type')}` : node.className,
			),
		).toEqual([
			'so-number-input__leading',
			'input.text',
			'so-number-input__trailing',
			'so-number-input__stepper',
			'input.hidden',
		])
	})

	/** Пробел между блоками Svelte оставил бы в обёртке текстом. */
	it('в обёртках узлы вплотную: без текста между ними', async () => {
		await render({ clearable: true, trailing: markup('<i>шт</i>') })

		for (const wrapper of ['.so-number-input__trailing', '.so-number-input__stepper']) {
			const texts = [...find(document, wrapper, HTMLElement).childNodes].filter(
				(node) => node instanceof Text && node.data.length > 0,
			)

			expect(texts).toEqual([])
		}
	})

	it('у края кнопка выключена: data-disabled; у readonly — обе', () => {
		const props = reactiveProps<NumberInputProps>({ value: 10, max: 10 })

		mount(NumberInput, props)

		expect(button('.so-number-input__increment').dataset['disabled']).toBe('true')
		expect(button('.so-number-input__decrement').dataset['disabled']).toBe('false')

		props.readonly = true
		flushSync()

		expect(button('.so-number-input__decrement').dataset['disabled']).toBe('true')
		expect(button('.so-number-input__increment').dataset['disabled']).toBe('true')
	})

	it('атрибуты снаружи: класс и стиль — корню, остальное — вводу', () => {
		const onkeydown = vi.fn()

		mount(NumberInput, {
			class: 'mine',
			style: 'width: 200px',
			'data-test': 'n',
			autocomplete: 'on',
			onkeydown,
		})

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().style.width).toBe('200px')
		expect(root().hasAttribute('data-test')).toBe(false)
		expect(input().getAttribute('data-test')).toBe('n')
		expect(input().classList.contains('mine')).toBe(false)
		// Атрибут потребителя — поверх статики разметки, как у Vue
		expect(input().getAttribute('autocomplete')).toBe('on')

		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(onkeydown).toHaveBeenCalledTimes(1)
	})

	it('id и placeholder — у ввода, dir ядра — на корне', () => {
		mount(NumberInput, { id: 'qty', placeholder: 'Сколько', direction: 'rtl' })

		expect(input().id).toBe('qty')
		expect(input().placeholder).toBe('Сколько')
		expect(root().getAttribute('dir')).toBe('rtl')
		// `dir` ввода — направление числа в формате, а не поля
		expect(input().getAttribute('dir')).toBe('ltr')
	})

	it('ru-RU от локали поддерева: текст и имена кнопок', () => {
		mount(LocaleNumberInput, { locale: ruRU, value: 1234.5, name: 'Количество' })

		expect(input().value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(button('.so-number-input__increment').getAttribute('aria-label')).toBe(
			'Увеличить Количество',
		)
	})
})

describe('NumberInput · скрытое поле формы', () => {
	it('имя и значение — число, а не текст ввода; пусто — пусто', () => {
		const props = reactiveProps<NumberInputProps>({
			name: 'price',
			value: 1234.5,
			formatOptions: { style: 'currency', currency: 'RUB' },
		})

		mount(NumberInput, props)

		expect(hidden().name).toBe('price')
		expect(hidden().value).toBe('1234.5')

		props.value = undefined
		flushSync()

		expect(hidden().value).toBe('')

		props.value = 7
		flushSync()

		expect(hidden().value).toBe('7')
	})

	it('у выключенного поля выключено и скрытое', () => {
		mount(NumberInput, { name: 'n', disabled: true })

		expect(hidden().disabled).toBe(true)
		expect(input().disabled).toBe(true)
	})
})

describe('NumberInput · значение и commit', () => {
	it('набор возвращает число через onChangeValue на каждый знак, commit — на уход фокуса', async () => {
		const onChangeValue = vi.fn<TChange>()
		const onCommit = vi.fn<TChange>()

		await render({ onChangeValue, onCommit })

		type('12.5')

		expect(values(onChangeValue)).toEqual([1, 12, 12.5])
		expect(input().value).toBe('12.5')

		input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		flushSync()

		expect(onCommit.mock.calls).toEqual([[{ newValue: 12.5, oldValue: undefined }]])
	})

	it('буква в ввод не встаёт', async () => {
		await render({ value: 5 })

		type('a')

		expect(input().value).toBe('5')
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем». Спред Svelte
	 * записал бы его второй раз.
	 */
	it('набор не переписывает ввод', async () => {
		await render()

		const write = vi.spyOn(input(), 'value', 'set')

		type('12')

		// Две записи — те, которыми тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(2)
	})

	it('эхо итога за max текст не трогает: набранное «150» не становится «100»', async () => {
		const onChangeValue = vi.fn<TChange>()

		await render({ max: 100, onChangeValue })

		type('150')

		expect(values(onChangeValue).at(-1)).toBe(100)
		expect(input().value).toBe('150')

		press('Enter')

		expect(input().value).toBe('100')
	})

	it('↑ — шаг с commit; кнопка шага — тоже', async () => {
		const onChangeValue = vi.fn<TChange>()
		const onCommit = vi.fn<TChange>()

		await render({ value: 5, step: 0.5, onChangeValue, onCommit })

		expect(press('ArrowUp').defaultPrevented).toBe(true)
		expect(input().value).toBe('5.5')

		click('.so-number-input__decrement')

		expect(values(onChangeValue).at(-1)).toBe(5)
		expect(input().value).toBe('5')
		expect(onCommit).toHaveBeenCalledTimes(2)
	})

	it('пока кнопку держат — data-pressed в её наборе', async () => {
		await render({ value: 5 })

		const target = button('.so-number-input__increment')

		pointer(target, 'pointerdown')

		expect(target.dataset['pressed']).toBe('true')

		pointer(target, 'pointerup')

		expect(target.hasAttribute('data-pressed')).toBe(false)
	})

	it('значение снаружи — текст строкой формата', () => {
		const props = reactiveProps<NumberInputProps>({ value: 1 })

		mount(NumberInput, props)

		props.value = 2000
		flushSync()

		expect(input().value).toBe('2,000')
	})

	it('внешний ctrl: разметка остаётся разметкой', () => {
		const ctrl = new TNumberInput({ value: 3 })

		mount(NumberInput, { ctrl, placeholder: 'Сколько' })

		expect(input().value).toBe('3')
		expect(input().placeholder).toBe('Сколько')

		ctrl.value = 42
		flushSync()

		expect(input().value).toBe('42')
		expect(hidden().value).toBe('42')
	})
})

describe('NumberInput · слоты', () => {
	it('leading и trailing получают инстанс поля; без слота обёрток нет', () => {
		const scopes = vi.fn()
		const props = reactiveProps<NumberInputProps>({
			leading: createRawSnippet((scope: () => { ctrl: INumberInput }) => {
				scopes(scope())

				return { render: () => '<span class="lead">№</span>' }
			}),
			trailing: markup('<span class="unit">шт</span>'),
		})

		mount(NumberInput, props)

		expect(find(document, '.so-number-input__leading .lead', HTMLElement).textContent).toBe('№')
		expect(find(document, '.so-number-input__trailing .unit', HTMLElement).textContent).toBe(
			'шт',
		)
		expect(scopes.mock.calls[0]?.[0]).toHaveProperty('ctrl')

		props.leading = undefined
		props.trailing = undefined
		flushSync()

		expect(document.querySelector('.so-number-input__leading')).toBeNull()
		expect(document.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('значки кнопок шага — свои слоты, кнопка остаётся своей', () => {
		mount(NumberInput, {
			'decrement-icon': markup('<i class="less"></i>'),
			'increment-icon': markup('<i class="more"></i>'),
		})

		expect(find(document, '.so-number-input__decrement .less', HTMLElement)).toBeTruthy()
		expect(find(document, '.so-number-input__increment .more', HTMLElement)).toBeTruthy()
		expect(document.querySelector('.so-number-input__decrement svg')).toBeNull()
		expect(button('.so-number-input__increment').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка очистки — по clearable; клик очищает число и текст, commit', async () => {
		const onChangeValue = vi.fn<TChange>()
		const onCommit = vi.fn<TChange>()
		const outside = vi.fn()

		await render({ value: 7, clearable: true, onChangeValue, onCommit })

		document.body.addEventListener('click', outside)

		const clear = button('.so-number-input__clear')

		expect(clear.getAttribute('type')).toBe('button')

		clear.click()
		flushSync()

		document.body.removeEventListener('click', outside)

		expect(values(onChangeValue)).toEqual([undefined])
		expect(input().value).toBe('')
		expect(onCommit.mock.calls).toEqual([[{ newValue: undefined, oldValue: 7 }]])
		// Клик очистки до корня и дальше не всплывает, как `@click.stop` у Vue
		expect(outside).not.toHaveBeenCalled()
	})

	it('своя кнопка — слот clear с командой очистки в scope', () => {
		const ctrl = new TNumberInput({ value: 7 })

		mount(NumberInput, {
			ctrl,
			clear: createRawSnippet((scope: () => { clear: () => void }) => ({
				render: () => '<button type="button" class="probe"></button>',
				setup(node) {
					node.addEventListener('click', () => scope().clear())
				},
			})),
		})

		expect(document.querySelector('.so-number-input__trailing > .probe')).not.toBeNull()
		expect(document.querySelector('.so-number-input__clear')).toBeNull()

		button('.probe').click()
		flushSync()

		expect(ctrl.value).toBeUndefined()
		expect(input().value).toBe('')
	})
})

describe('NumberInput · типы', () => {
	/**
	 * Значение — число, а не текст ввода: `value` и событие `commit` несут
	 * число или пусто. Умолчания текста (`defaultValue`) у поля нет: текст
	 * ведёт ядро, и умолчание было бы вторым путём к нему. Проверяет не
	 * vitest, а шаг CI «Типы — Svelte».
	 */
	it('value и onCommit — число или пусто; defaultValue — не атрибут', () => {
		expectTypeOf<NumberInputProps['value']>().toEqualTypeOf<TValue>()
		expectTypeOf<NonNullable<NumberInputProps['onCommit']>>().toEqualTypeOf<TChange>()
		expectTypeOf<NumberInputProps>().not.toHaveProperty('defaultValue')
	})
})
