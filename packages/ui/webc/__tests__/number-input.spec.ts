/**
 * `<div is="so-number-input">` — поле числа, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у Vue (`number-input.spec.ts`), React, Solid и
 * Svelte, без сервера и `act`. Формат, разбор, шаг и буфер правки считает
 * ядро (`core/__tests__/number-input.spec.ts`), набор, клавиши и кнопки —
 * плагины (`plugins/__tests__/number-input.plugin.spec.ts`), раскладку и
 * настоящий ввод — браузер (`playground/vue/browser/number-input.spec.ts` и
 * `webc-fields.spec.ts`). Здесь важно, что они сходятся в разметке: ввод с
 * текстом и наборами ядра, кнопки шага с их наборами и выключенностью,
 * скрытое поле с числом, слоты, `so:change:value` и `so:commit`.
 *
 * Угол зрения здесь свой, как у Input. Корень — элемент потребителя, и
 * статические атрибуты разметки на нём база переносит на ввод, кроме класса,
 * стиля и входов пропов. Слой владельца у элемента один, поэтому наборы ввода
 * и наборы кнопки шага шаблон кладёт одной привязкой. Scope у слотов нет:
 * данные поля содержимое берёт у элемента (`el.ctrl`).
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TNumberInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU, zhCN } from '@soldy-ui/plugins'
import { NumberInputDescriptor } from '@soldy-ui/setup'
import {
	TButtonElement,
	TIconElement,
	TLocaleProviderElement,
	TNumberInputElement,
	type TButtonElementProps,
	type TNumberInputElementProps,
} from '@soldy-ui/webc'
import { numberInputTemplate } from '../src/components/number-input/number-input.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

/** Значение поля числа: число или пусто. */
type TValue = number | undefined

function isNumberInput(node: Element | null): node is TNumberInputElementProps {
	return node instanceof TNumberInputElement
}

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Разметка в неподключённом узле: до вставки можно найти узлы и повесить слушатели. */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

/** Поле soldy в разметке. */
function numberInputOf(root: ParentNode): TNumberInputElementProps {
	const node = root.querySelector('[is="so-number-input"]')

	if (!isNumberInput(node)) throw new Error('<div is="so-number-input"> нет')

	return node
}

/** Поле soldy из разметки, подключённое к документу; узел другой — тест падает здесь. */
function mount(html: string): TNumberInputElementProps {
	const host = markup(html)

	document.body.appendChild(host)

	return numberInputOf(host)
}

/** Поле над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(
	ctrl: TNumberInput,
	attributes: Record<string, string> = {},
): TNumberInputElementProps {
	const node = document.createElement('div', { is: 'so-number-input' })

	if (!isNumberInput(node)) throw new Error('<div is="so-number-input"> нет')

	node.ctrl = ctrl

	for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)

	document.body.appendChild(node)

	return node
}

/**
 * Поле, чьё значение возвращает потребитель, — как `v-model` у Vue: на каждую
 * смену он пишет число обратно в свойство элемента. Слушатели плагинов встают
 * по `ready` узла — кадром позже.
 */
async function mountModel(html: string): Promise<TNumberInputElementProps> {
	const host = markup(html)
	const el = numberInputOf(host)

	el.addEventListener('so:change:value', (event) => {
		if (event instanceof CustomEvent) el.value = payloadOf(event.detail).newValue
	})
	document.body.appendChild(host)
	await nextFrame()

	return el
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Ввод — по своему классу: рядом в корне лежит скрытое поле формы. */
const field = (root: ParentNode) => find(root, '.so-number-input__input', HTMLInputElement)

const hidden = (root: ParentNode) => find(root, 'input[type="hidden"]', HTMLInputElement)

/** Кнопка детали по классу. */
function buttonOf(root: ParentNode, selector: string): TButtonElementProps {
	const node = root.querySelector(selector)

	if (!isButton(node)) throw new Error(`${selector}: кнопки нет`)

	return node
}

/** Пара «стало, было» события значения — вид проверяется здесь, а не берётся на веру. */
function payloadOf(detail: unknown): TValuePayload<TValue> {
	if (typeof detail !== 'object' || detail === null || !('newValue' in detail)) {
		throw new Error('у события нет пары значений')
	}

	const { newValue } = detail
	const oldValue = 'oldValue' in detail ? detail.oldValue : undefined
	const value = (item: unknown): TValue => (typeof item === 'number' ? item : undefined)

	return { newValue: value(newValue), oldValue: value(oldValue) }
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Новые значения из событий `so:change:value` — по порядку. */
const valuesOf = (seen: readonly unknown[]) => seen.map((detail) => payloadOf(detail).newValue)

/** Набрать текст, как браузер: `beforeinput`, текст в ввод и `input`. */
function type(node: HTMLInputElement, text: string): void {
	for (const char of text) {
		const before = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: char,
			bubbles: true,
			cancelable: true,
		})

		node.setSelectionRange(node.value.length, node.value.length)
		node.dispatchEvent(before)

		if (before.defaultPrevented) continue

		node.value += char
		node.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))
	}
}

/** Клавиша на вводе, как у пользователя: всплывает до корня. */
function press(node: HTMLInputElement, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	node.dispatchEvent(event)

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
}

describe('NumberInput · разметка', () => {
	it('корень — div потребителя; ввод — счётчик с текстом и наборами ядра', () => {
		const el = mount('<div is="so-number-input" value="1234.5" min="0" max="10000"></div>')
		const node = field(el)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(el.classList.contains('so-number-input')).toBe(true)
		expect(el.ctrl?.tag).toBe('div')
		expect(node.type).toBe('text')
		expect(node.value).toBe(new Intl.NumberFormat('en-US').format(1234.5))
		expect(node.getAttribute('role')).toBe('spinbutton')
		expect(node.getAttribute('aria-valuenow')).toBe('1234.5')
		expect(node.getAttribute('aria-valuetext')).toBe(node.value)
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('10000')
		expect(node.getAttribute('inputmode')).toBe('decimal')
		expect(node.getAttribute('dir')).toBe('ltr')
		expect(node.getAttribute('lang')).toBe('en-US')
		expect(node.getAttribute('autocomplete')).toBe('off')
		expect(node.getAttribute('spellcheck')).toBe('false')
		// Имени у ввода нет: в форму уходит число, а не текст
		expect(node.hasAttribute('name')).toBe(false)
	})

	it('у открытой стороны aria-valuemin и aria-valuemax нет', () => {
		const node = field(mount('<div is="so-number-input"></div>'))

		expect(node.hasAttribute('aria-valuemin')).toBe(false)
		expect(node.hasAttribute('aria-valuemax')).toBe(false)
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
	})

	/** Три набора ввода лежат в одном слое владельца: смена одного не стирает другие. */
	it('смена числа не стирает имя ввода и его клавиатуру', async () => {
		const el = mount('<div is="so-number-input" aria_label="Количество" value="1"></div>')

		el.value = 2
		await flush()

		const node = field(el)

		expect(node.getAttribute('aria-valuenow')).toBe('2')
		expect(node.getAttribute('aria-label')).toBe('Количество')
		expect(node.getAttribute('inputmode')).toBe('decimal')
	})

	it('порядок узлов — как у Vue: слоты, ввод, обёртка у конца, кнопки шага, скрытое поле', () => {
		const el = mount(`<div is="so-number-input" clearable>
			<i slot="leading">№</i>
		</div>`)

		expect(
			[...el.children].map((node) =>
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

	it('кнопки шага — не остановки Tab, со значками ролей minus и plus', () => {
		const el = mount('<div is="so-number-input"></div>')
		const decrement = buttonOf(el, '.so-number-input__decrement')
		const increment = buttonOf(el, '.so-number-input__increment')

		expect(decrement.getAttribute('tabindex')).toBe('-1')
		expect(increment.getAttribute('tabindex')).toBe('-1')
		expect(decrement.getAttribute('type')).toBe('button')
		expect(increment.getAttribute('type')).toBe('button')
		expect(decrement.getAttribute('aria-label')).toBe('Decrease')
		expect(increment.getAttribute('aria-label')).toBe('Increase')
		expect(decrement.querySelector('.so-icon')?.getAttribute('icon')).toBe('minus')
		expect(increment.querySelector('.so-icon')?.getAttribute('icon')).toBe('plus')
		expect(decrement.querySelector('svg')).not.toBeNull()
	})

	/**
	 * Кнопки и иконки — детали разметки поля: элементы soldy с именами места.
	 * Набор поля на кнопке — поверх того, что она пишет себе сама: свои классы
	 * и `data-disabled` у неё остаются.
	 */
	it('кнопки шага и их иконки — элементы soldy с именами места', () => {
		const el = mount('<div is="so-number-input"></div>')
		const decrement = buttonOf(el, '.so-number-input__decrement')
		const icon = decrement.querySelector('.so-icon')

		expect(decrement.getAttribute('embedded')).toBe('number-input.decrement')
		expect(buttonOf(el, '.so-number-input__increment').getAttribute('embedded')).toBe(
			'number-input.increment',
		)
		expect(icon).toBeInstanceOf(TIconElement)
		expect(icon?.getAttribute('embedded')).toBe('number-input.decrement-icon')
		expect(decrement.classList.contains('so-button')).toBe(true)
		expect(decrement.getAttribute('data-disabled')).toBe('false')
	})

	it('у края кнопка выключена: data-disabled; у readonly — обе', async () => {
		const el = mount('<div is="so-number-input" value="10" max="10"></div>')

		expect(buttonOf(el, '.so-number-input__increment').dataset['disabled']).toBe('true')
		expect(buttonOf(el, '.so-number-input__decrement').dataset['disabled']).toBe('false')

		el.readonly = true
		await flush()

		expect(buttonOf(el, '.so-number-input__decrement').dataset['disabled']).toBe('true')
		expect(buttonOf(el, '.so-number-input__increment').dataset['disabled']).toBe('true')
	})

	it('пробелы в разметке не приносят узлов', () => {
		const el = mount(`<div is="so-number-input">
		</div>`)

		expect(el.querySelector('.so-number-input__leading')).toBeNull()
		expect(el.querySelector('.so-number-input__trailing')).toBeNull()
		expect(el.childNodes).toHaveLength(3)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, в порядке разметки Vue', () => {
		const root = document.createElement('div')
		const targets = numberInputTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(NumberInputDescriptor().slots.map((slot) => slot.name))
		expect(Object.keys(targets)).toEqual([
			'leading',
			'clear',
			'trailing',
			'decrement-icon',
			'increment-icon',
		])
	})
})

/**
 * Атрибуты потребителя делятся, как у Input: класс и стиль — корню,
 * статические атрибуты разметки — вводу, поверх его наборов. Входы пропов
 * остаются на корне: через них потребитель задаёт пропы.
 */
describe('NumberInput · атрибуты разметки', () => {
	it('класс и стиль — на корне, autocomplete, aria-label и data-* — на вводе', () => {
		const el = mount(
			'<div is="so-number-input" class="mine" style="flex: 1" data-test="n" autocomplete="on" aria-label="Количество"></div>',
		)
		const node = field(el)

		expect(el.classList.contains('mine')).toBe(true)
		expect(el.style.flex).not.toBe('')
		expect(
			['data-test', 'autocomplete', 'aria-label'].filter((name) => el.hasAttribute(name)),
		).toEqual([])
		expect(node.classList.contains('mine')).toBe(false)
		expect(node.hasAttribute('style')).toBe(false)
		expect(node.getAttribute('data-test')).toBe('n')
		// Атрибут потребителя — поверх статики разметки, как у Vue
		expect(node.getAttribute('autocomplete')).toBe('on')
		expect(node.getAttribute('aria-label')).toBe('Количество')
	})

	it('id и placeholder — у ввода; ctrl.id совпадает с id, на корне его нет', () => {
		const el = mount('<div is="so-number-input" id="qty" placeholder="Сколько"></div>')

		expect(el.hasAttribute('id')).toBe(false)
		expect(field(el).id).toBe('qty')
		expect(field(el).placeholder).toBe('Сколько')
		expect(el.ctrl?.id).toBe('qty')
		expect(document.querySelectorAll('#qty')).toHaveLength(1)
	})

	it('direction ядра — dir на корне; dir ввода — направление числа в формате', () => {
		const el = mount('<div is="so-number-input" direction="rtl"></div>')

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).getAttribute('dir')).toBe('ltr')
	})

	it('слушатель на корне слышит keydown ввода', () => {
		const el = mount('<div is="so-number-input"></div>')
		const keys: string[] = []

		el.addEventListener('keydown', (event) => keys.push(event.key))
		field(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(keys).toEqual(['a'])
	})
})

describe('NumberInput · локаль поддерева', () => {
	it('ru-RU: текст и имена кнопок; смена локали — без пересборки', async () => {
		const host = markup(
			'<so-locale-provider><div is="so-number-input" value="1234.5" name="Количество"></div></so-locale-provider>',
		)
		const provider = host.firstElementChild
		const el = numberInputOf(host)

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		provider.locale = ruRU
		document.body.appendChild(host)
		await flush()

		const increment = buttonOf(el, '.so-number-input__increment')

		expect(field(el).value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(field(el).getAttribute('lang')).toBe('ru-RU')
		expect(increment.getAttribute('aria-label')).toBe('Увеличить Количество')

		provider.locale = zhCN
		await flush()

		const text = new Intl.NumberFormat('zh-CN').format(1234.5)

		expect(buttonOf(el, '.so-number-input__increment')).toBe(increment)
		expect(field(el).value).toBe(text)
		expect(field(el).getAttribute('lang')).toBe('zh-CN')
		expect(field(el).getAttribute('aria-valuetext')).toBe(text)
		expect(increment.getAttribute('aria-label')).toContain('Количество')
		expect(increment.getAttribute('aria-label')).not.toBe('Увеличить Количество')
	})
})

describe('NumberInput · скрытое поле формы', () => {
	it('имя и значение — число, а не текст ввода; пусто — пусто', async () => {
		const el = mount('<div is="so-number-input" name="price" value="1234.5"></div>')

		el.formatOptions = { style: 'currency', currency: 'RUB' }
		await flush()

		expect(field(el).value).not.toBe('1234.5')
		expect(hidden(el).name).toBe('price')
		expect(hidden(el).value).toBe('1234.5')

		el.value = undefined
		await flush()

		expect(hidden(el).value).toBe('')
	})

	it('у выключенного поля выключено и скрытое', () => {
		const el = mount('<div is="so-number-input" name="n" disabled></div>')

		expect(hidden(el).disabled).toBe(true)
		expect(field(el).disabled).toBe(true)
		expect(el.hasAttribute('disabled')).toBe(true)
	})

	/** Форма видит поле сама: скрытое поле лежит в обычном DOM страницы. */
	it('FormData получает число, а не текст ввода', () => {
		const host = markup(`<form>
			<div is="so-number-input" name="qty" value="1234.5"></div>
		</form>`)

		document.body.appendChild(host)

		expect([...new FormData(find(host, 'form', HTMLFormElement))]).toEqual([['qty', '1234.5']])
	})
})

describe('NumberInput · значение и commit', () => {
	it('набор — so:change:value на каждый знак, so:commit — на уход фокуса', async () => {
		const el = await mountModel('<div is="so-number-input"></div>')
		const changes = collect(el, 'so:change:value')
		const commits = collect(el, 'so:commit')

		type(field(el), '12.5')
		await flush()

		expect(valuesOf(changes)).toEqual([1, 12, 12.5])
		expect(field(el).value).toBe('12.5')

		field(el).dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		await flush()

		expect(commits.map(payloadOf)).toEqual([{ newValue: 12.5, oldValue: undefined }])
	})

	it('буква в ввод не встаёт', async () => {
		const el = await mountModel('<div is="so-number-input" value="5"></div>')

		type(field(el), 'a')
		await flush()

		expect(field(el).value).toBe('5')
	})

	/**
	 * Узел уже держит набранное, и шаблон его не трогает: запись того же
	 * текста сбросила бы каретку в конец, а набор через IME — прервала бы.
	 */
	it('набор не переписывает ввод', async () => {
		const el = await mountModel('<div is="so-number-input"></div>')
		const write = vi.spyOn(field(el), 'value', 'set')

		type(field(el), '12')
		await flush()

		// Две записи — те, которыми тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(2)
	})

	it('эхо итога за max текст не трогает: набранное «150» не становится «100»', async () => {
		const el = await mountModel('<div is="so-number-input" max="100"></div>')

		type(field(el), '150')
		await flush()

		expect(el.value).toBe(100)
		expect(field(el).value).toBe('150')

		press(field(el), 'Enter')
		await flush()

		expect(field(el).value).toBe('100')
	})

	it('↑ — шаг с commit; кнопка шага — тоже', async () => {
		const el = await mountModel('<div is="so-number-input" value="5" step="0.5"></div>')
		const commits = collect(el, 'so:commit')

		expect(press(field(el), 'ArrowUp').defaultPrevented).toBe(true)
		await flush()

		expect(field(el).value).toBe('5.5')

		const decrement = buttonOf(el, '.so-number-input__decrement')

		pointer(decrement, 'pointerdown')
		pointer(decrement, 'pointerup')
		await flush()

		expect(el.value).toBe(5)
		expect(field(el).value).toBe('5')
		expect(commits).toHaveLength(2)
	})

	/**
	 * Наборы кнопки — имя с остановкой Tab и удержание — лежат в одном слое
	 * владельца: смена одного не стирает другой.
	 */
	it('пока кнопку держат — data-pressed в её наборе, имя и tabindex на месте', async () => {
		const el = await mountModel('<div is="so-number-input" value="5"></div>')
		const increment = buttonOf(el, '.so-number-input__increment')

		pointer(increment, 'pointerdown')
		await flush()

		expect(increment.dataset['pressed']).toBe('true')
		expect(increment.getAttribute('aria-label')).toBe('Increase')
		expect(increment.getAttribute('tabindex')).toBe('-1')

		pointer(increment, 'pointerup')
		await flush()

		expect(increment.hasAttribute('data-pressed')).toBe(false)
		expect(increment.getAttribute('aria-label')).toBe('Increase')
	})

	it('значение снаружи — текст строкой формата', async () => {
		const el = mount('<div is="so-number-input" value="1"></div>')

		el.value = 2000
		await flush()

		expect(field(el).value).toBe('2,000')
	})

	it('внешний ctrl: разметка остаётся разметкой', async () => {
		const ctrl = new TNumberInput({ value: 3 })
		const el = mountCtrl(ctrl, { placeholder: 'Сколько' })

		expect(field(el).value).toBe('3')
		expect(field(el).placeholder).toBe('Сколько')

		ctrl.value = 42
		await flush()

		expect(field(el).value).toBe('42')
		expect(hidden(el).value).toBe('42')
	})
})

/**
 * Слоты — как у Input, scope у них нет: данные и команды поля содержимое
 * берёт у элемента (`el.ctrl`).
 */
describe('NumberInput · слоты', () => {
	it('leading и trailing — по сторонам числа; без слота обёрток нет', () => {
		const el = mount(`<div is="so-number-input">
			<span slot="trailing" class="unit">шт</span>
			<span slot="leading" class="lead">№</span>
		</div>`)

		expect(find(el, '.so-number-input__leading .lead', HTMLElement).textContent).toBe('№')
		expect(find(el, '.so-number-input__trailing .unit', HTMLElement).textContent).toBe('шт')

		const bare = mount('<div is="so-number-input"></div>')

		expect(bare.querySelector('.so-number-input__leading')).toBeNull()
		expect(bare.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('значки кнопок шага — свои слоты, кнопка остаётся своей', () => {
		const el = mount(`<div is="so-number-input">
			<i slot="increment-icon" class="more"></i>
			<i slot="decrement-icon" class="less"></i>
		</div>`)
		const decrement = buttonOf(el, '.so-number-input__decrement')

		expect(decrement.querySelector('.less')).not.toBeNull()
		expect(buttonOf(el, '.so-number-input__increment').querySelector('.more')).not.toBeNull()
		expect(decrement.querySelector('.so-icon')).toBeNull()
		expect(decrement.getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка очистки — по clearable, первой в обёртке у конца, перед trailing', () => {
		const el = mount(
			'<div is="so-number-input" clearable name="Количество"><i slot="trailing" class="probe"></i></div>',
		)
		const clear = buttonOf(el, '.so-number-input__clear')
		const parts = ['.so-number-input__clear', '.probe']

		expect(
			[...find(el, '.so-number-input__trailing', HTMLElement).children].map((node) =>
				parts.find((part) => node.matches(part)),
			),
		).toEqual(parts)
		expect(clear.getAttribute('embedded')).toBe('number-input.clear')
		expect(clear.getAttribute('type')).toBe('button')
		expect(clear.getAttribute('aria-label')).toBe('Clear Количество')
		expect(clear.querySelector('.so-icon')?.getAttribute('embedded')).toBe(
			'number-input.clear-icon',
		)
	})

	/**
	 * Обёртку у конца числа приносит и `clearable`, поставленный позже: она
	 * встаёт перед кнопками шага, а не в конец корня.
	 */
	it('clearable поставлен позже — обёртка перед кнопками шага, снят — уходит', async () => {
		const el = mount('<div is="so-number-input"></div>')

		el.clearable = true
		await flush()

		expect([...el.children].map((node) => node.className).slice(1, 3)).toEqual([
			'so-number-input__trailing',
			'so-number-input__stepper',
		])

		el.clearable = false
		await flush()

		expect(el.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('клик очищает число и текст, so:commit; до корня не всплывает', async () => {
		const el = await mountModel('<div is="so-number-input" value="7" clearable></div>')
		const commits = collect(el, 'so:commit')
		const outside = vi.fn()

		document.body.addEventListener('click', outside)

		buttonOf(el, '.so-number-input__clear').click()
		await flush()

		document.body.removeEventListener('click', outside)

		expect(el.value).toBeUndefined()
		expect(field(el).value).toBe('')
		expect(commits.map(payloadOf)).toEqual([{ newValue: undefined, oldValue: 7 }])
		expect(outside).not.toHaveBeenCalled()
	})

	it('своя кнопка — слот clear вместо встроенной; команду берёт у элемента', async () => {
		const el = mount(`<div is="so-number-input" value="7" clearable>
			<button slot="clear" type="button" class="probe"></button>
		</div>`)

		expect(el.querySelector('.so-number-input__trailing > .probe')).not.toBeNull()
		expect(el.querySelector('.so-number-input__clear')).toBeNull()

		find(el, '.probe', HTMLButtonElement).addEventListener('click', () => el.ctrl?.clear())
		find(el, '.probe', HTMLButtonElement).click()
		await flush()

		expect(el.ctrl?.value).toBeUndefined()
		expect(field(el).value).toBe('')
	})
})
