/**
 * NumberInput под Angular — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`number-input.spec.ts`), React и Svelte.
 * Формат, разбор, шаг и буфер правки считает ядро
 * (`core/__tests__/number-input.spec.ts`), набор, клавиши и кнопки — плагины
 * (`plugins/__tests__/number-input.plugin.spec.ts`), раскладку и настоящий
 * ввод — браузер (`playground/vue/browser/number-input.spec.ts`). Здесь важно,
 * что они сходятся в разметке: ввод с текстом и наборами ядра, кнопки шага с
 * их наборами и выключенностью, скрытое поле с числом, слоты, значение,
 * которое потребитель возвращает входом, и `commit`.
 *
 * Своё у Angular — запись атрибутом: корень — сам `<div so-number-input>`, а
 * всё, что потребитель записал на нём, кроме класса и стиля, доходит до
 * ввода — статику переносит база, привязки и слушатели — рендерер адаптера
 * (`provideAttrs()`, подключён провайдерами спеков). Скрытое поле формы
 * написанного потребителем не получает. Текст ввода — буфер правки ядра — в
 * узел пишет директива текста поля, только когда он разошёлся с узлом.
 * Слушатели плагинов встают по `ready` узла — кадром позже. Сервер и
 * гидратацию проверяет `fields.server.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TNumberInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { LocaleProviderDirective, SlotDirective, TNumberInputComponent } from '@soldy-ui/angular'
import { find, findIn, markupOf, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Значение поля числа: число или пусто. */
type TValue = number | undefined

/** NumberInput, созданный самим TestBed: корень — `<div so-number-input>`. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TNumberInputComponent> {
	const fixture = TestBed.createComponent(TNumberInputComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Корень NumberInput, созданного самим TestBed, — его хост-элемент. */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Корень NumberInput в разметке хоста. */
const rootIn = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '[so-number-input]', HTMLElement)

/** Ввод — по своему классу: рядом в корне лежит скрытое поле формы. */
const input = (el: Element) => find(el, '.so-number-input__input', HTMLInputElement)

const hidden = (el: Element) => find(el, 'input[type="hidden"]', HTMLInputElement)

const button = (el: Element, selector: string) => find(el, selector, HTMLButtonElement)

/** Набрать текст, как браузер: `beforeinput`, текст в ввод и `input`. */
function type(fixture: ComponentFixture<unknown>, field: HTMLInputElement, text: string): void {
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
		fixture.detectChanges()
	}
}

/** Клавиша на вводе, как у пользователя: всплывает до корня. */
function press(
	fixture: ComponentFixture<unknown>,
	field: HTMLInputElement,
	key: string,
): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	field.dispatchEvent(event)
	fixture.detectChanges()

	return event
}

/** Нажатие указателем на кнопку шага. */
function pointer(
	fixture: ComponentFixture<unknown>,
	target: Element,
	kind: 'pointerdown' | 'pointerup',
): void {
	target.dispatchEvent(
		new PointerEvent(kind, {
			pointerType: 'mouse',
			button: 0,
			bubbles: true,
			cancelable: true,
		}),
	)
	fixture.detectChanges()
}

/** Нажать и отпустить кнопку шага мышью. */
function click(fixture: ComponentFixture<unknown>, target: Element): void {
	pointer(fixture, target, 'pointerdown')
	pointer(fixture, target, 'pointerup')
}

/**
 * Значение — по-настоящему: потребитель возвращает его входом, как привязка.
 * Смены значения и `commit` хост пишет в журнал. Начальные значения тест
 * задаёт сигналами до первой проверки (`mountModel`).
 */
@Component({
	selector: 'probe-number-model',
	standalone: true,
	imports: [TNumberInputComponent],
	template: `<div
		so-number-input
		[value]="value()"
		[max]="max()"
		[step]="step()"
		[clearable]="clearable()"
		(soChangeValue)="change($event)"
		(soCommit)="commits.push($event)"
	></div>`,
})
class ModelHost {
	readonly value = signal<TValue>(undefined)
	readonly max = signal<number | undefined>(undefined)
	readonly step = signal<number | undefined>(undefined)
	readonly clearable = signal(false)
	readonly changes: TValue[] = []
	readonly commits: TValuePayload<TValue>[] = []

	change(payload: TValuePayload<TValue>): void {
		this.changes.push(payload.newValue)
		this.value.set(payload.newValue)
	}
}

type TModel = {
	readonly value?: TValue
	readonly max?: number
	readonly step?: number
	readonly clearable?: boolean
}

/** Хост со значением, которое возвращает потребитель; слушатели плагинов уже стоят. */
async function mountModel(model: TModel = {}): Promise<ComponentFixture<ModelHost>> {
	const fixture = TestBed.createComponent(ModelHost)
	const page = fixture.componentInstance

	page.value.set(model.value)
	page.max.set(model.max)
	page.step.set(model.step)
	page.clearable.set(model.clearable ?? false)
	fixture.detectChanges()

	await nextFrame()

	return fixture
}

/** Слот `leading` перед числом, кнопка очистки и `trailing` после неё. */
@Component({
	selector: 'probe-number-sides',
	standalone: true,
	imports: [TNumberInputComponent, SlotDirective],
	template: `<div so-number-input [ctrl]="ctrl" clearable>
		<ng-template slot="leading"><i class="lead">№</i></ng-template>
		<ng-template slot="trailing" let-ctrl="ctrl"
			><b class="unit">{{ ctrl.value }}</b></ng-template
		>
	</div>`,
})
class SidesHost {
	readonly ctrl = new TNumberInput({ value: 3 })
}

/** Значки кнопок шага — свои шаблоны слотов. */
@Component({
	selector: 'probe-number-icons',
	standalone: true,
	imports: [TNumberInputComponent, SlotDirective],
	template: `<div so-number-input>
		<ng-template slot="decrement-icon"><i class="less"></i></ng-template>
		<ng-template slot="increment-icon"><i class="more"></i></ng-template>
	</div>`,
})
class IconsHost {}

/** Своя кнопка очистки — слот `clear` с командой очистки в scope. */
@Component({
	selector: 'probe-number-own-clear',
	standalone: true,
	imports: [TNumberInputComponent, SlotDirective],
	template: `<div so-number-input [ctrl]="ctrl">
		<ng-template slot="clear" let-clear="clear"
			><button type="button" class="probe" (click)="clear()"></button
		></ng-template>
	</div>`,
})
class OwnClearHost {
	readonly ctrl = new TNumberInput({ value: 7 })
}

/** Язык и строки — от провайдера поддерева. */
@Component({
	selector: 'probe-number-locale',
	standalone: true,
	imports: [TNumberInputComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale">
		<div so-number-input [value]="1234.5" name="Количество"></div>
	</div>`,
})
class LocaleHost {
	readonly locale = ruRU
}

describe('NumberInput · разметка', () => {
	it('корень — коробка поля; ввод — счётчик с текстом и наборами ядра', () => {
		const el = root(mount({ value: 1234.5, min: 0, max: 10000 }))
		const field = input(el)

		expect(el.localName).toBe('div')
		expect(el.classList.contains('so-number-input')).toBe(true)
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

	it('у открытой стороны aria-valuemin и aria-valuemax нет', () => {
		const field = input(root(mount()))

		expect(field.hasAttribute('aria-valuemin')).toBe(false)
		expect(field.hasAttribute('aria-valuemax')).toBe(false)
		expect(field.hasAttribute('aria-valuenow')).toBe(false)
	})

	it('кнопки шага — после слотов, не остановки Tab, со значками ролей minus и plus', () => {
		const el = root(mount({ clearable: true }))
		const children = [...el.children].map((node) => node.className)
		const decrement = button(el, '.so-number-input__decrement')
		const increment = button(el, '.so-number-input__increment')

		expect(children.indexOf('so-number-input__stepper')).toBeGreaterThan(
			children.indexOf('so-number-input__trailing'),
		)
		expect(decrement.getAttribute('tabindex')).toBe('-1')
		expect(increment.getAttribute('tabindex')).toBe('-1')
		expect(decrement.getAttribute('type')).toBe('button')
		expect(increment.getAttribute('type')).toBe('button')
		expect(decrement.getAttribute('aria-label')).toBe('Decrease')
		expect(increment.getAttribute('aria-label')).toBe('Increase')
		expect(decrement.querySelector('svg.so-icon')?.getAttribute('viewBox')).not.toBeNull()
		expect(increment.querySelector('svg.so-icon')?.getAttribute('viewBox')).not.toBeNull()
	})

	it('порядок узлов — как у Vue: слоты, ввод, обёртка у конца, кнопки шага, скрытое поле', () => {
		const el = rootIn(mountHost(SidesHost))

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

	it('у края кнопка выключена: data-disabled; у readonly — обе', () => {
		const fixture = mount({ value: 10, max: 10 })
		const el = root(fixture)

		expect(button(el, '.so-number-input__increment').dataset['disabled']).toBe('true')
		expect(button(el, '.so-number-input__decrement').dataset['disabled']).toBe('false')

		fixture.componentRef.setInput('readonly', true)
		fixture.detectChanges()

		expect(button(el, '.so-number-input__decrement').dataset['disabled']).toBe('true')
		expect(button(el, '.so-number-input__increment').dataset['disabled']).toBe('true')
	})

	it('id и placeholder — у ввода, атрибутов-входов на корне нет; dir ядра — на корне', () => {
		const el = root(mount({ id: 'qty', placeholder: 'Сколько', direction: 'rtl' }))
		const field = input(el)

		expect(field.id).toBe('qty')
		expect(field.placeholder).toBe('Сколько')
		expect(el.hasAttribute('id')).toBe(false)
		expect(el.hasAttribute('placeholder')).toBe(false)
		expect(el.getAttribute('dir')).toBe('rtl')
		// `dir` ввода — направление числа в формате, а не поля
		expect(field.getAttribute('dir')).toBe('ltr')
	})

	it('aria_label — имя ввода, а не корня', () => {
		const el = root(mount({ aria_label: 'Количество' }))

		expect(input(el).getAttribute('aria-label')).toBe('Количество')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('ru-RU от локали поддерева: текст, язык числа и имена кнопок', () => {
		const el = rootIn(mountHost(LocaleHost))

		expect(input(el).value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
		expect(input(el).getAttribute('lang')).toBe('ru-RU')
		expect(button(el, '.so-number-input__increment').getAttribute('aria-label')).toBe(
			'Увеличить Количество',
		)
		expect(button(el, '.so-number-input__decrement').getAttribute('aria-label')).toBe(
			'Уменьшить Количество',
		)
	})
})

/**
 * Атрибуты потребителя делятся, как у Vue и React: класс и стиль — корню,
 * остальное — вводу. Статику разметки переносит база, и атрибут потребителя
 * главнее статики шаблона (`autocomplete="off"` ввода); привязку и слушатель
 * доносит рендерер адаптера. Скрытое поле — значение для формы, а не поле:
 * написанного потребителем на нём нет. `name` — запись входа: имя у скрытого
 * поля, а не у ввода.
 */
@Component({
	selector: 'probe-number-forward',
	standalone: true,
	imports: [TNumberInputComponent],
	template: `<div
		so-number-input
		class="mine"
		style="width: 200px"
		data-test="n"
		autocomplete="on"
		name="qty"
		[attr.title]="title()"
		(keydown)="keys.push($event.key)"
	></div>`,
})
class ForwardHost {
	readonly title = signal('Количество')
	readonly keys: string[] = []
}

describe('NumberInput · атрибуты потребителя', () => {
	it('класс и стиль — на корне, статика из разметки — на вводе, поверх статики шаблона', () => {
		const el = rootIn(mountHost(ForwardHost))
		const field = input(el)

		expect(el.classList.contains('mine')).toBe(true)
		expect(el.classList.contains('so-number-input')).toBe(true)
		expect(el.style.width).toBe('200px')
		expect(el.hasAttribute('data-test')).toBe(false)
		expect(el.hasAttribute('autocomplete')).toBe(false)

		expect(field.classList.contains('mine')).toBe(false)
		expect(field.hasAttribute('style')).toBe(false)
		expect(field.getAttribute('data-test')).toBe('n')
		expect(field.getAttribute('autocomplete')).toBe('on')
	})

	it('name — вход: имя у скрытого поля, у ввода и корня его нет', () => {
		const el = rootIn(mountHost(ForwardHost))

		expect(hidden(el).name).toBe('qty')
		expect(input(el).hasAttribute('name')).toBe(false)
		expect(el.hasAttribute('name')).toBe(false)
	})

	it('привязка [attr.x] и слушатель — на вводе, а не на корне и не на скрытом поле', () => {
		const fixture = mountHost(ForwardHost)
		const el = rootIn(fixture)
		const field = input(el)

		expect(field.getAttribute('title')).toBe('Количество')
		expect(el.hasAttribute('title')).toBe(false)
		expect(hidden(el).hasAttribute('title')).toBe(false)
		expect(hidden(el).hasAttribute('data-test')).toBe(false)

		fixture.componentInstance.title.set('Штук')
		fixture.detectChanges()

		expect(field.getAttribute('title')).toBe('Штук')

		field.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
		el.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))

		expect(fixture.componentInstance.keys).toEqual(['1'])
	})
})

describe('NumberInput · скрытое поле формы', () => {
	it('имя и значение — число, а не текст ввода; пусто — пусто', () => {
		const fixture = mount({
			name: 'price',
			value: 1234.5,
			formatOptions: { style: 'currency', currency: 'RUB' },
		})
		const el = root(fixture)

		expect(hidden(el).name).toBe('price')
		expect(hidden(el).value).toBe('1234.5')
		expect(input(el).value).not.toBe('1234.5')

		fixture.componentRef.setInput('value', undefined)
		fixture.detectChanges()

		expect(hidden(el).value).toBe('')

		fixture.componentRef.setInput('value', 7)
		fixture.detectChanges()

		expect(hidden(el).value).toBe('7')
	})

	it('у выключенного поля выключено и скрытое', () => {
		const el = root(mount({ name: 'n', disabled: true }))

		expect(hidden(el).disabled).toBe(true)
		expect(input(el).disabled).toBe(true)
	})
})

describe('NumberInput · значение и commit', () => {
	it('набор возвращает число через soChangeValue на каждый знак, commit — на уход фокуса', async () => {
		const fixture = await mountModel()
		const page = fixture.componentInstance
		const field = input(rootIn(fixture))

		type(fixture, field, '12.5')

		expect(page.changes).toEqual([1, 12, 12.5])
		expect(field.value).toBe('12.5')

		field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		fixture.detectChanges()

		expect(page.commits).toEqual([{ newValue: 12.5, oldValue: undefined }])
	})

	it('буква в ввод не встаёт', async () => {
		const fixture = await mountModel({ value: 5 })
		const field = input(rootIn(fixture))

		type(fixture, field, 'a')

		expect(field.value).toBe('5')
	})

	/**
	 * Узел уже держит набранное, и ввод его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем». Привязка
	 * `[value]` записала бы его второй раз: она сверяет значение с прошлым
	 * значением привязки, а не с узлом.
	 */
	it('набор не переписывает ввод', async () => {
		const fixture = await mountModel()
		const field = input(rootIn(fixture))
		const write = vi.spyOn(field, 'value', 'set')

		type(fixture, field, '12')

		// Две записи — те, которыми тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(2)
	})

	it('эхо итога за max текст не трогает: набранное «150» не становится «100»', async () => {
		const fixture = await mountModel({ max: 100 })
		const page = fixture.componentInstance
		const field = input(rootIn(fixture))

		type(fixture, field, '150')

		expect(page.changes.at(-1)).toBe(100)
		expect(page.value()).toBe(100)
		expect(field.value).toBe('150')

		press(fixture, field, 'Enter')

		expect(field.value).toBe('100')
	})

	it('↑ — шаг с commit; кнопка шага — тоже', async () => {
		const fixture = await mountModel({ value: 5, step: 0.5 })
		const page = fixture.componentInstance
		const el = rootIn(fixture)
		const field = input(el)

		expect(press(fixture, field, 'ArrowUp').defaultPrevented).toBe(true)
		expect(field.value).toBe('5.5')

		click(fixture, button(el, '.so-number-input__decrement'))

		expect(page.changes.at(-1)).toBe(5)
		expect(field.value).toBe('5')
		expect(page.commits).toHaveLength(2)
	})

	it('пока кнопку держат — data-pressed в её наборе', async () => {
		const fixture = mount({ value: 5 })
		const target = button(root(fixture), '.so-number-input__increment')

		await nextFrame()

		pointer(fixture, target, 'pointerdown')

		expect(target.dataset['pressed']).toBe('true')

		pointer(fixture, target, 'pointerup')

		expect(target.hasAttribute('data-pressed')).toBe(false)
	})

	it('значение снаружи — текст строкой формата', async () => {
		const fixture = await mountModel({ value: 1 })

		fixture.componentInstance.value.set(2000)
		fixture.detectChanges()

		expect(input(rootIn(fixture)).value).toBe('2,000')
	})

	it('внешний ctrl: разметка остаётся разметкой, смена значения — в ввод и скрытое поле', () => {
		const ctrl = new TNumberInput({ value: 3 })
		const fixture = mount({ ctrl, placeholder: 'Сколько' })
		const el = root(fixture)

		expect(input(el).value).toBe('3')
		expect(input(el).placeholder).toBe('Сколько')

		ctrl.value = 42
		fixture.detectChanges()

		expect(input(el).value).toBe('42')
		expect(hidden(el).value).toBe('42')
	})
})

describe('NumberInput · слоты', () => {
	it('leading и trailing — по сторонам числа, scope — инстанс поля', () => {
		const el = rootIn(mountHost(SidesHost))

		expect(markupOf(find(el, '.so-number-input__leading', HTMLElement))).toBe(
			'<i class="lead">№</i>',
		)
		expect(find(el, '.so-number-input__trailing .unit', HTMLElement).textContent).toBe('3')
	})

	it('слот не передан — обёрток нет', () => {
		const el = root(mount())

		expect(el.querySelector('.so-number-input__leading')).toBeNull()
		expect(el.querySelector('.so-number-input__trailing')).toBeNull()
	})

	it('слоты — не атрибуты ввода и корня', () => {
		const el = rootIn(mountHost(SidesHost))

		expect(el.hasAttribute('leading')).toBe(false)
		expect(input(el).hasAttribute('leading')).toBe(false)
	})

	it('значки кнопок шага — свои слоты, кнопка остаётся своей', () => {
		const el = rootIn(mountHost(IconsHost))

		expect(find(el, '.so-number-input__decrement .less', HTMLElement)).toBeTruthy()
		expect(find(el, '.so-number-input__increment .more', HTMLElement)).toBeTruthy()
		expect(el.querySelector('.so-number-input__decrement svg')).toBeNull()
		expect(button(el, '.so-number-input__increment').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка очистки — по clearable, первой в обёртке у конца, перед trailing', () => {
		const el = rootIn(mountHost(SidesHost))
		const clear = button(el, '.so-number-input__clear')

		expect(clear.parentElement?.firstElementChild).toBe(clear)
		expect(clear.getAttribute('type')).toBe('button')
		expect(clear.getAttribute('aria-label')).toBe('Clear')
		expect(el.classList.contains('so-number-input--clearable')).toBe(true)
	})

	it('кнопка очистки: клик очищает число и текст, commit, до корня не всплывает', async () => {
		const fixture = await mountModel({ value: 7, clearable: true })
		const page = fixture.componentInstance
		const el = rootIn(fixture)
		const outside = vi.fn()

		el.addEventListener('click', outside)

		button(el, '.so-number-input__clear').click()
		fixture.detectChanges()

		expect(page.changes).toEqual([undefined])
		expect(input(el).value).toBe('')
		expect(page.commits).toEqual([{ newValue: undefined, oldValue: 7 }])
		expect(outside).not.toHaveBeenCalled()
	})

	it('своя кнопка — слот clear с командой очистки в scope, вместо встроенной', () => {
		const fixture = mountHost(OwnClearHost)
		const el = rootIn(fixture)

		expect(el.querySelector('.so-number-input__trailing > .probe')).not.toBeNull()
		expect(el.querySelector('.so-number-input__clear')).toBeNull()

		button(el, '.probe').click()
		fixture.detectChanges()

		expect(fixture.componentInstance.ctrl.value).toBeUndefined()
		expect(input(el).value).toBe('')
		expect(el.hasAttribute('clear')).toBe(false)
	})
})
