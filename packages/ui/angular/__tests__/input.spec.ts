/**
 * Input под Angular: текстовое поле, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у React (`input.spec.tsx`) и Vue
 * (`input-control-attrs.spec.ts`, `input-clear.spec.ts`): корень, `<input>`
 * внутри, слоты по сторонам; наборы ядра — каждый на своём элементе: `attrs`
 * (`dir`) на корне, `aria` на поле; нативные атрибуты поля без ARIA-дублей.
 *
 * Угол зрения здесь свой. Селектор — элементный: корень — сам `<so-input>`,
 * а атрибуты, которые потребитель записал на нём в разметке, кроме класса и
 * стиля, база переносит на `<input>`. Текст в ядро несёт `TInputPlugin`, его
 * слушатель встаёт по `ready` узла — кадром позже, — а в узел текст пишет
 * директива текста поля, только когда он разошёлся с узлом.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TInput, type IInput, type TValuePayload } from '@soldy-ui/core'
import { SlotDirective, TInputComponent } from '@soldy-ui/angular'
import { find, findIn, markupOf, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Input. */
const field = (root: Element) => find(root, 'input', HTMLInputElement)

/** Корень Input, созданного самим TestBed, — его хост-элемент. */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Input, созданный самим TestBed: корень — `<so-input>`. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TInputComponent> {
	const fixture = TestBed.createComponent(TInputComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(fixture: ComponentFixture<unknown>, input: HTMLInputElement, text: string): void {
	input.value = text
	input.dispatchEvent(new Event('input', { bubbles: true }))
	fixture.detectChanges()
}

@Component({
	standalone: true,
	imports: [TInputComponent, SlotDirective],
	template: `<so-input [ctrl]="ctrl">
		<ng-template slot="leading"><i>L</i></ng-template>
		<ng-template slot="trailing" let-ctrl="ctrl"
			><b>{{ ctrl.value }}</b></ng-template
		>
	</so-input>`,
})
class SidesHost {
	readonly ctrl = new TInput({ value: 'текст' })
}

describe('Input · разметка', () => {
	it('корень — so-input, внутри текстовое поле', () => {
		const el = root(mount())

		expect(el.localName).toBe('so-input')
		expect(el.classList.contains('so-input')).toBe(true)
		expect(field(el).type).toBe('text')
	})

	it('слоты leading и trailing — по сторонам поля, scope — инстанс поля', () => {
		const el = findIn(mountHost(SidesHost), 'so-input', HTMLElement)

		expect([...el.children].map((part) => part.localName + '.' + part.className)).toEqual([
			'div.so-input__leading',
			'input.',
			'div.so-input__trailing',
		])
		expect(markupOf(find(el, '.so-input__leading', HTMLElement))).toBe('<i>L</i>')
		expect(markupOf(find(el, '.so-input__trailing', HTMLElement))).toBe('<b>текст</b>')
	})

	it('слот не передан — обёртки нет', () => {
		const el = root(mount())

		expect(el.querySelector('.so-input__leading')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
		expect(el.children).toHaveLength(1)
	})

	it('слоты — не атрибуты поля и корня', () => {
		const el = findIn(mountHost(SidesHost), 'so-input', HTMLElement)

		expect(el.hasAttribute('leading')).toBe(false)
		expect(field(el).hasAttribute('leading')).toBe(false)
	})
})

describe('Input · атрибуты', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(root(mount({ disabled: true, required: true })))

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const input = field(root(mount({ readonly: true })))

		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const input = field(root(mount({ required: true, readonly: true })))

		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.getAttribute('aria-required')).toBe('true')
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(root(mount({ disabled: true })).hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = root(mount({ direction: 'rtl' }))

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('id, name и placeholder — на поле, атрибутов-входов на корне нет', () => {
		const el = root(mount({ id: 'email', name: 'email', placeholder: 'Почта' }))
		const input = field(el)

		expect(input.id).toBe('email')
		expect(input.name).toBe('email')
		expect(input.placeholder).toBe('Почта')
		expect(el.hasAttribute('id')).toBe(false)
		expect(el.hasAttribute('name')).toBe(false)
		expect(el.hasAttribute('placeholder')).toBe(false)
	})

	it('без своего id атрибута нет: автоматического id у поля нет', () => {
		expect(field(root(mount())).hasAttribute('id')).toBe(false)
	})

	it('aria_label доходит до <input>', () => {
		const el = root(mount({ aria_label: 'Поиск' }))

		expect(field(el).getAttribute('aria-label')).toBe('Поиск')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})
})

/**
 * Атрибуты потребителя делятся, как у Vue и React: класс и стиль — корню,
 * атрибуты из разметки — полю. Чей атрибут, база узнаёт по разметке
 * потребителя, а не по узлу: атрибут инкапсуляции стилей хоста
 * (`_ngcontent-*`) потребитель не писал, и он остаётся на корне — по нему
 * стили хоста находят `.app-field`.
 */
@Component({
	standalone: true,
	imports: [TInputComponent],
	styles: ['.app-field { color: red; }'],
	template: `<so-input
		class="app-field"
		style="flex: 1"
		data-testid="field"
		autocomplete="email"
		name="email"
		[attr.title]="title()"
		(keydown)="keys.push($event.key)"
	/>`,
})
class ForwardHost {
	readonly title = signal('Почта')
	readonly keys: string[] = []
}

describe('Input · атрибуты потребителя', () => {
	it('класс и стиль — на корне, атрибуты из разметки — на поле', () => {
		const el = findIn(mountHost(ForwardHost), 'so-input', HTMLElement)
		const input = field(el)

		expect(el.classList.contains('so-input')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.flex).not.toBe('')
		expect(el.hasAttribute('data-testid')).toBe(false)
		expect(el.hasAttribute('autocomplete')).toBe(false)

		expect(input.hasAttribute('class')).toBe(false)
		expect(input.hasAttribute('style')).toBe(false)
		expect(input.getAttribute('data-testid')).toBe('field')
		expect(input.getAttribute('autocomplete')).toBe('email')
	})

	it('атрибут-вход доходит до ядра, а не до поля атрибутом потребителя', () => {
		const el = findIn(mountHost(ForwardHost), 'so-input', HTMLElement)

		expect(el.hasAttribute('name')).toBe(false)
		expect(field(el).name).toBe('email')
	})

	/**
	 * Пометку `ng-version` на хост корневого компонента Angular пишет сам, и
	 * разметке хоста она выглядит его атрибутом. Поле бывает корневым — у
	 * `createComponent` и TestBed, — и пометка остаётся на корне.
	 */
	it('пометка корневого компонента ng-version остаётся на корне', () => {
		const el = root(mount())

		expect(el.hasAttribute('ng-version')).toBe(true)
		expect(field(el).hasAttribute('ng-version')).toBe(false)
	})

	it('атрибут инкапсуляции стилей хоста остаётся на корне', () => {
		const el = findIn(mountHost(ForwardHost), 'so-input', HTMLElement)
		const scoped = (element: Element) =>
			element.getAttributeNames().filter((name) => name.startsWith('_ngcontent-'))

		expect(scoped(el)).toHaveLength(1)
		expect(scoped(field(el))).toEqual([])
	})

	/**
	 * Привязку и слушатель Angular ставит на элемент, который написан в
	 * разметке, — они остаются на корне. Всплывающее событие поля до корня
	 * доходит само.
	 */
	it('привязка [attr.x] и слушатель — на корне, keydown поля до него всплывает', () => {
		const fixture = mountHost(ForwardHost)
		const el = findIn(fixture, 'so-input', HTMLElement)

		expect(el.getAttribute('title')).toBe('Почта')
		expect(field(el).hasAttribute('title')).toBe(false)

		field(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(fixture.componentInstance.keys).toEqual(['a'])
	})
})

describe('Input · значение', () => {
	it('из пропа — в поле', () => {
		expect(field(root(mount({ value: 'abc' }))).value).toBe('abc')
	})

	it('без значения — пустое поле', () => {
		expect(field(root(mount())).value).toBe('')
	})

	it('ввод — в ctrl.value и одним soChangeValue', async () => {
		const ctrl = new TInput()
		const fixture = mount({ ctrl })
		const changes: unknown[] = []
		const input = field(root(fixture))

		fixture.componentInstance.soChangeValue.subscribe((change) => changes.push(change))

		await nextFrame()
		type(fixture, input, 'abc')

		expect(ctrl.value).toBe('abc')
		expect(input.value).toBe('abc')
		expect(changes).toEqual([{ newValue: 'abc', oldValue: undefined }])
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем» — браузер
	 * перестал бы проверять `minlength` и `maxlength`, — а набор через IME
	 * могла бы прервать. Привязка `[value]` записала бы его второй раз: она
	 * сверяет значение с прошлым значением привязки, а не с узлом.
	 */
	it('набор не переписывает поле', async () => {
		const fixture = mount()
		const input = field(root(fixture))

		await nextFrame()

		const write = vi.spyOn(input, 'value', 'set')

		type(fixture, input, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	/**
	 * Ввод в середину текста: браузер вставил символ и поставил каретку за
	 * ним, ядро приняло текст — каретка на месте, а не в конце поля.
	 */
	it('ввод в середину текста — каретка на месте, после того как ядро приняло значение', async () => {
		const ctrl = new TInput({ value: 'abcd' })
		const fixture = mount({ ctrl })
		const input = field(root(fixture))

		await nextFrame()

		input.value = 'abXcd'
		input.setSelectionRange(3, 3)
		input.dispatchEvent(new Event('input', { bubbles: true }))
		fixture.detectChanges()

		expect(ctrl.value).toBe('abXcd')
		expect(input.selectionStart).toBe(3)
		expect(input.selectionEnd).toBe(3)
	})

	it('ctrl.value из кода после ввода — в поле', async () => {
		const ctrl = new TInput()
		const fixture = mount({ ctrl })
		const input = field(root(fixture))

		await nextFrame()
		type(fixture, input, 'abc')

		ctrl.value = 'xyz'
		fixture.detectChanges()

		expect(input.value).toBe('xyz')
	})

	/**
	 * Хост перерисовался — прежний `value` в ядро не пишется, и набранное
	 * остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * `undefined` — пустое поле, как у Vue.
	 */
	it('перерисовка хоста: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const fixture = mount({ value: 'a' })
		const input = field(root(fixture))

		await nextFrame()
		type(fixture, input, 'ab')

		fixture.componentRef.setInput('placeholder', 'Текст')
		fixture.detectChanges()

		expect(input.value).toBe('ab')

		fixture.componentRef.setInput('value', 'c')
		fixture.detectChanges()

		expect(input.value).toBe('c')

		fixture.componentRef.setInput('value', undefined)
		fixture.detectChanges()

		expect(input.value).toBe('')
	})
})

/**
 * Событие ядра `input` — выход `soInput`, а `(input)` на поле — событие
 * браузера, как на нативном `<input>`. На `(x)` у элемента Angular ставит и
 * подписку на выход `x`, и слушатель события DOM `x`: пока выход назывался
 * `input`, обработчик получал на каждое нажатие два вызова — событие ядра и
 * всплывшее от `<input>` событие браузера, хотя строгий шаблон обещал ему
 * только первое. Обработчики здесь точного типа, их сверяет «Типы — Angular»:
 * с выходом `input` у `(input)` был бы `$event` события ядра, а не `Event`.
 */
@Component({
	standalone: true,
	imports: [TInputComponent],
	template: `<so-input (input)="onDomInput($event)" (soInput)="onInput($event)" />`,
})
class InputEventsHost {
	readonly domInputs: Event[] = []
	readonly inputs: TValuePayload<string>[] = []

	onDomInput(event: Event): void {
		this.domInputs.push(event)
	}

	onInput(payload: TValuePayload<string>): void {
		this.inputs.push(payload)
	}
}

describe('Input · события', () => {
	it('(input) — событие браузера, (soInput) — событие ядра: по одному на нажатие', async () => {
		const fixture = mountHost(InputEventsHost)
		const input = field(findIn(fixture, 'so-input', HTMLElement))

		await nextFrame()
		type(fixture, input, 'a')

		const { domInputs, inputs } = fixture.componentInstance

		expect(domInputs).toHaveLength(1)
		expect(domInputs[0].target).toBe(input)
		expect(inputs).toEqual([{ newValue: 'a', oldValue: undefined }])
	})
})

/** Поле с кнопкой очистки и слотом `trailing` рядом с ней. */
@Component({
	standalone: true,
	imports: [TInputComponent, SlotDirective],
	template: `<so-input clearable name="Город">
		<ng-template slot="trailing"><i class="probe"></i></ng-template>
	</so-input>`,
})
class ClearableHost {}

/** Своя кнопка очистки — слот `clear` с командой очистки в scope. */
@Component({
	standalone: true,
	imports: [TInputComponent, SlotDirective],
	template: `<so-input [ctrl]="ctrl" [clearable]="clearable()">
		<ng-template slot="clear" let-clear="clear"
			><button type="button" class="probe" (click)="clear()"></button
		></ng-template>
	</so-input>`,
})
class OwnClearHost {
	readonly ctrl = new TInput({ value: 'текст' })
	readonly clearable = signal(false)
}

describe('Input · кнопка очистки', () => {
	/** Кнопка очистки внутри корня. */
	const clearOf = (el: Element) => find(el, '.so-input__clear', HTMLButtonElement)

	it('без clearable кнопки нет, и обёртки у конца поля тоже', () => {
		const el = root(mount({ value: 'текст' }))

		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
	})

	it('по clearable — первой в обёртке у конца, перед содержимым trailing', () => {
		const el = findIn(mountHost(ClearableHost), 'so-input', HTMLElement)
		const parts = ['.so-input__clear', '.probe']

		expect(
			[...find(el, '.so-input__trailing', HTMLElement).children].map((node) =>
				parts.find((part) => node.matches(part)),
			),
		).toEqual(parts)
		expect(el.classList.contains('so-input--clearable')).toBe(true)
		expect(clearOf(el).getAttribute('aria-label')).toBe('Clear Город')
	})

	/**
	 * Имя кнопке пишет не она сама: это набор поля `clearAria`, и его на
	 * кнопку кладёт разметка поля — поверх того, что кнопка пишет себе сама.
	 * Своё у кнопки остаётся рядом: классы, `data-disabled`.
	 */
	it('набор поля на кнопке — рядом с её собственными наборами и классами', () => {
		const el = findIn(mountHost(ClearableHost), 'so-input', HTMLElement)
		const button = clearOf(el)

		expect(button.getAttribute('aria-label')).toBe('Clear Город')
		expect(button.getAttribute('data-disabled')).toBe('false')
		expect(button.classList.contains('so-button')).toBe(true)
		expect(button.classList.contains('so-input__clear')).toBe(true)
		expect(button.querySelector('svg.so-icon')?.getAttribute('viewBox')).not.toBeNull()
	})

	it('размер — поля, выключена — вместе с полем, readonly её не гасит', () => {
		const fixture = mount({ clearable: true, size: 'lg', readonly: true })

		expect(clearOf(root(fixture)).classList.contains('so-button--size-lg')).toBe(true)
		expect(clearOf(root(fixture)).disabled).toBe(false)

		fixture.componentRef.setInput('disabled', true)
		fixture.detectChanges()

		expect(clearOf(root(fixture)).disabled).toBe(true)
	})

	it('клик очищает поле и до корня не всплывает', async () => {
		const ctrl = new TInput({ value: 'текст' })
		const fixture = mount({ ctrl, clearable: true })
		const changes: unknown[] = []
		const presses: unknown[] = []
		const outside = vi.fn()

		fixture.componentInstance.soChangeValue.subscribe((change) => changes.push(change))
		fixture.componentInstance.soActionPress.subscribe((event) => presses.push(event))
		root(fixture).addEventListener('click', outside)

		// Корень слушает нажатия своим TActionPlugin — он встаёт с `ready`
		await nextFrame()

		clearOf(root(fixture)).click()
		fixture.detectChanges()

		expect(ctrl.value).toBe('')
		expect(field(root(fixture)).value).toBe('')
		expect(changes).toHaveLength(1)
		expect(presses).toEqual([])
		expect(outside).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду ядра — clear приходит и у пустого поля', () => {
		const ctrl: IInput = new TInput({ value: '' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		const fixture = mount({ ctrl, clearable: true })

		clearOf(root(fixture)).click()

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Своя кнопка заменяет встроенную целиком и рисуется, когда задана, — и без
	 * `clearable`, и при нём. Команду очистки она берёт из scope и зовёт голой
	 * функцией.
	 */
	it('своя кнопка — слот clear с командой очистки в scope, вместо встроенной', () => {
		const fixture = mountHost(OwnClearHost)
		const el = findIn(fixture, 'so-input', HTMLElement)

		expect(el.querySelector('.so-input__trailing > .probe')).not.toBeNull()
		expect(el.querySelector('.so-input__clear')).toBeNull()

		fixture.componentInstance.clearable.set(true)
		fixture.detectChanges()

		expect(el.querySelector('.so-input__clear')).toBeNull()

		find(el, '.probe', HTMLButtonElement).click()
		fixture.detectChanges()

		expect(fixture.componentInstance.ctrl.value).toBe('')
		expect(field(el).value).toBe('')
		expect(el.hasAttribute('clear')).toBe(false)
	})
})
