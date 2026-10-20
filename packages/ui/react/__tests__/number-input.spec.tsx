/**
 * NumberInput в React — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`number-input.spec.ts`). Формат, разбор, шаг и
 * буфер правки считает ядро (`core/__tests__/number-input.spec.ts`), набор,
 * клавиши и кнопки — плагины (`plugins/__tests__/number-input.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер
 * (`playground/vue/browser/number-input.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ввод с текстом и наборами ядра, кнопки шага с их
 * наборами и выключенностью, скрытое поле с числом, слоты, управляемое
 * значение и `commit`.
 *
 * Своё у React — текст ввода. Привязки свойства DOM у разметки React нет, и
 * текст — буфер правки ядра (`text`), а не значение — проводит поле адаптера
 * (`NativeInput`): умолчание — атрибутом, свойство — в узел, если разошлось с
 * ним. Контролируемого поля React нет, а `inputmode` набора ядра уходит
 * пропом `inputMode`: предупреждение React в консоль уронило бы тест (сторож
 * консоли в `setup.ts`). Скрытое поле держит строку и без числа — пустую:
 * `undefined`, сменившийся числом, React счёл бы переходом неуправляемого поля
 * в управляемое.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach, type Mock } from 'vitest'
import { act, useState, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TNumberInput, type INumberInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Field, LocaleProvider, NumberInput, type NumberInputProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Значение поля числа: число или пусто. */
type TValue = number | undefined

/**
 * Поле, чьё значение возвращается пропом, — как `v-model` у Vue: значение
 * держит состояние родителя, а смена приходит `onChangeValue`.
 */
function Controlled(props: NumberInputProps): ReactElement {
	const [value, setValue] = useState(props.value)

	return (
		<NumberInput
			{...props}
			value={value}
			onChangeValue={(payload) => {
				setValue(payload.newValue)
				props.onChangeValue?.(payload)
			}}
		/>
	)
}

/** Поле с управляемым значением в документе; плагины встают кадром. */
async function render(props: NumberInputProps = {}): Promise<void> {
	mount(<Controlled {...props} />)
	await nextFrame()
}

/** Корень поля. */
const root = () => find(document, '.so-number-input', HTMLElement)

/** Ввод — по своему классу: рядом в корне лежит скрытое поле формы. */
const input = () => find(document, '.so-number-input__input', HTMLInputElement)

const hidden = () => find(document, '.so-number-input input[type="hidden"]', HTMLInputElement)

const button = (selector: string) => find(document, selector, HTMLButtonElement)

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

		act(() => {
			field.setSelectionRange(field.value.length, field.value.length)
			field.dispatchEvent(before)

			if (before.defaultPrevented) return

			field.value += char
			field.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))
		})
	}
}

/** Клавиша на вводе, как у пользователя: всплывает до корня. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	act(() => {
		input().dispatchEvent(event)
	})

	return event
}

/** Нажать и отпустить кнопку шага мышью. */
function click(selector: string): void {
	const target = button(selector)

	act(() => {
		target.dispatchEvent(
			new PointerEvent('pointerdown', {
				pointerType: 'mouse',
				button: 0,
				bubbles: true,
				cancelable: true,
			}),
		)
		target.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
	})
}

/** Колбэк смены значения и `commit`: пара «стало, было». */
type TChange = (payload: TValuePayload<TValue>) => void

/** Значения из событий `onChangeValue` — по порядку. */
const values = (spy: Mock<TChange>) => spy.mock.calls.map(([payload]) => payload.newValue)

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
		// Имя у ввода нет: в форму уходит число, а не текст
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
		await render({ clearable: true, leading: <i>№</i> })

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

	it('у края кнопка выключена: data-disabled; у readonly — обе', async () => {
		const { render: rerender } = mount(<NumberInput value={10} max={10} />)

		expect(button('.so-number-input__increment').dataset['disabled']).toBe('true')
		expect(button('.so-number-input__decrement').dataset['disabled']).toBe('false')

		rerender(<NumberInput value={10} max={10} readonly />)

		expect(button('.so-number-input__decrement').dataset['disabled']).toBe('true')
		expect(button('.so-number-input__increment').dataset['disabled']).toBe('true')
	})

	it('атрибуты снаружи: класс и стиль — корню, остальное — вводу', () => {
		const onKeyDown = vi.fn()

		mount(
			<NumberInput
				className="mine"
				style={{ width: '200px' }}
				data-test="n"
				autoComplete="on"
				onKeyDown={onKeyDown}
			/>,
		)

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().style.width).toBe('200px')
		expect(root().hasAttribute('data-test')).toBe(false)
		expect(input().getAttribute('data-test')).toBe('n')
		expect(input().classList.contains('mine')).toBe(false)
		// Атрибут потребителя — поверх статики разметки, как у Vue
		expect(input().getAttribute('autocomplete')).toBe('on')

		act(() => {
			input().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
		})

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('id и placeholder — у ввода, dir ядра — на корне', () => {
		mount(<NumberInput id="qty" placeholder="Сколько" direction="rtl" />)

		expect(input().id).toBe('qty')
		expect(input().placeholder).toBe('Сколько')
		expect(root().getAttribute('dir')).toBe('rtl')
		// `dir` ввода — направление числа в формате, а не поля
		expect(input().getAttribute('dir')).toBe('ltr')
	})

	it('ru-RU от локали поддерева: текст и имена кнопок', () => {
		mount(
			<LocaleProvider locale={ruRU}>
				<NumberInput value={1234.5} name="Количество" />
			</LocaleProvider>,
		)

		expect(input().value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(button('.so-number-input__increment').getAttribute('aria-label')).toBe(
			'Увеличить Количество',
		)
	})
})

describe('NumberInput · скрытое поле формы', () => {
	it('имя и значение — число, а не текст ввода; пусто — пусто', () => {
		const { render: rerender } = mount(
			<NumberInput
				name="price"
				value={1234.5}
				formatOptions={{ style: 'currency', currency: 'RUB' }}
			/>,
		)

		expect(hidden().name).toBe('price')
		expect(hidden().value).toBe('1234.5')

		rerender(
			<NumberInput name="price" formatOptions={{ style: 'currency', currency: 'RUB' }} />,
		)

		expect(hidden().value).toBe('')

		// Пусто сменилось числом: поле осталось управляемым, React не предупреждает
		rerender(
			<NumberInput
				name="price"
				value={7}
				formatOptions={{ style: 'currency', currency: 'RUB' }}
			/>,
		)

		expect(hidden().value).toBe('7')
	})

	it('у выключенного поля выключено и скрытое', () => {
		mount(<NumberInput name="n" disabled />)

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

		act(() => {
			input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		})

		expect(onCommit.mock.calls).toEqual([[{ newValue: 12.5, oldValue: undefined }]])
	})

	it('буква в ввод не встаёт', async () => {
		await render({ value: 5 })

		type('a')

		expect(input().value).toBe('5')
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * в `value` сбросила бы каретку в конец, а во время набора через IME —
	 * прервала бы его.
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

		act(() => {
			target.dispatchEvent(
				new PointerEvent('pointerdown', {
					pointerType: 'mouse',
					button: 0,
					bubbles: true,
					cancelable: true,
				}),
			)
		})

		expect(target.dataset['pressed']).toBe('true')

		act(() => {
			target.dispatchEvent(
				new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }),
			)
		})

		expect(target.hasAttribute('data-pressed')).toBe(false)
	})

	it('значение снаружи — текст строкой формата', () => {
		const { render: rerender } = mount(<NumberInput value={1} />)

		rerender(<NumberInput value={2000} />)

		expect(input().value).toBe('2,000')
	})

	it('внешний ctrl: разметка остаётся разметкой', () => {
		const ctrl = new TNumberInput({ value: 3 })

		mount(<NumberInput ctrl={ctrl} placeholder="Сколько" />)

		expect(input().value).toBe('3')
		expect(input().placeholder).toBe('Сколько')

		act(() => {
			ctrl.value = 42
		})

		expect(input().value).toBe('42')
		expect(hidden().value).toBe('42')
	})
})

describe('NumberInput · слоты', () => {
	it('leading и trailing получают инстанс поля; без слота обёрток нет', () => {
		const scopes = vi.fn()
		const { render: rerender } = mount(
			<NumberInput
				leading={(scope: { ctrl: INumberInput }) => {
					scopes(scope)

					return <span className="lead">№</span>
				}}
				trailing={<span className="unit">шт</span>}
			/>,
		)

		expect(find(document, '.so-number-input__leading .lead', HTMLElement).textContent).toBe('№')
		expect(find(document, '.so-number-input__trailing .unit', HTMLElement).textContent).toBe(
			'шт',
		)
		expect(scopes.mock.calls[0]?.[0]).toHaveProperty('ctrl')

		rerender(<NumberInput />)

		expect(document.querySelector('.so-number-input__leading')).toBeNull()
		expect(document.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('значки кнопок шага — свои слоты, кнопка остаётся своей', () => {
		mount(
			<NumberInput
				decrement-icon={<i className="less" />}
				increment-icon={<i className="more" />}
			/>,
		)

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

		act(() => clear.click())

		document.body.removeEventListener('click', outside)

		expect(values(onChangeValue)).toEqual([undefined])
		expect(input().value).toBe('')
		expect(onCommit.mock.calls).toEqual([[{ newValue: undefined, oldValue: 7 }]])
		// Клик очистки до корня и дальше не всплывает, как `@click.stop` у Vue
		expect(outside).not.toHaveBeenCalled()
	})

	it('своя кнопка — слот clear с командой очистки в scope', () => {
		const ctrl = new TNumberInput({ value: 7 })

		mount(
			<NumberInput
				ctrl={ctrl}
				clear={({ clear }: { clear: () => void }) => (
					<button type="button" className="probe" onClick={() => clear()} />
				)}
			/>,
		)

		expect(document.querySelector('.so-number-input__trailing > .probe')).not.toBeNull()
		expect(document.querySelector('.so-number-input__clear')).toBeNull()

		act(() => button('.probe').click())

		expect(ctrl.value).toBeUndefined()
		expect(input().value).toBe('')
	})
})

describe('NumberInput · серверный рендер', () => {
	/** Сервер и браузер в одном процессе: рендер сервера и гидратация — одна разметка. */
	function hydrate(element: ReactElement): {
		container: HTMLElement
		onRecoverableError: ReturnType<typeof vi.fn>
	} {
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		return { container, onRecoverableError }
	}

	it('renderToString несёт текст в формате атрибутом value, число — в скрытом поле', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<LocaleProvider locale={ruRU}>
				<NumberInput name="qty" value={1234.5} />
			</LocaleProvider>,
		)

		expect(
			find(container, '.so-number-input__input', HTMLInputElement).getAttribute('value'),
		).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(
			find(container, 'input[type="hidden"]', HTMLInputElement).getAttribute('value'),
		).toBe('1234.5')
	})

	/**
	 * Гидратация без расхождений: разметку сервера и браузера строит одно и то
	 * же, а `id` ввода от поля формы — от `useId` (id монтирования), не от
	 * счётчика процесса. От счётчика React сообщил бы о расхождении атрибута
	 * (сторож консоли уронил бы тест).
	 */
	it('гидратация без расхождений: текст на месте, подпись называет ввод', () => {
		const { container, onRecoverableError } = hydrate(
			<Field label="Количество">
				<NumberInput value={42} />
			</Field>,
		)
		const field = find(container, '.so-number-input__input', HTMLInputElement)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(field.value).toBe('42')
		expect(field.id).not.toBe('')
		expect(find(container, '.so-field__label', HTMLLabelElement).htmlFor).toBe(field.id)
	})
})

describe('NumberInput · типы', () => {
	/**
	 * Значение — число, а не текст ввода: `value` и событие `commit` несут
	 * число или пусто. «Только чтение» — вход `readonly`: атрибут `readOnly`
	 * был бы вторым путём к тому же состоянию. Проверяет не vitest, а шаг CI
	 * «Типы — React».
	 */
	it('value и onCommit — число или пусто; readOnly — не атрибут', () => {
		expectTypeOf<NumberInputProps['value']>().toEqualTypeOf<TValue>()
		expectTypeOf<NonNullable<NumberInputProps['onCommit']>>().toEqualTypeOf<
			(payload: TValuePayload<TValue>) => void
		>()
		expectTypeOf<NumberInputProps>().not.toHaveProperty('readOnly')
	})
})
