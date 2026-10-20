/**
 * Textarea под Angular — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`textarea.spec.ts`) и React. Свойства, `aria`
 * и `data-limit` считает ядро, текст счётчика и высоту — плагины, раскладку и
 * настоящий ввод — браузер (`playground/vue/browser/textarea.spec.ts`). Здесь
 * важно, что они сходятся в разметке: наборы на своих узлах, нативные
 * атрибуты у `<textarea>`, ввод — в ядро и выход `soChangeValue`, счётчик по
 * локали поддерева — пояснением поля, — и подпись и справка поля формы.
 *
 * Угол зрения здесь свой, как у Input. Селектор атрибутный: корень — сам
 * `<div so-textarea>`, а всё, что потребитель записал на нём, кроме класса и
 * стиля, доходит до `<textarea>`: статику переносит база, привязки и
 * слушатели — рендерер адаптера. В узел текст пишет директива текста поля,
 * только когда он разошёлся с узлом. Серверный рендер и гидратацию сторожит
 * `fields.server.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TTextarea, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { LocaleProviderDirective, TFieldComponent, TTextareaComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Textarea. */
const field = (root: ParentNode) => find(root, 'textarea', HTMLTextAreaElement)

/** Счётчик символов; нет его — `null`. */
const counter = (root: ParentNode) => root.querySelector('.so-textarea__counter')

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Корень Textarea, созданного самим TestBed, — его хост-элемент. */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Textarea, созданный самим TestBed: корень — `<div so-textarea>`. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TTextareaComponent> {
	const fixture = TestBed.createComponent(TTextareaComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Сменить входы и перепроверить шаблон. */
function update(fixture: ComponentFixture<unknown>, inputs: Record<string, unknown>): void {
	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()
}

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(fixture: ComponentFixture<unknown>, textarea: HTMLTextAreaElement, text: string) {
	textarea.value = text
	textarea.dispatchEvent(new Event('input', { bubbles: true }))
	fixture.detectChanges()
}

describe('Textarea · разметка', () => {
	it('корень — div с классами и dataset, внутри — поле без класса', () => {
		const el = root(mount({ size: 'lg', readonly: true, required: true, direction: 'rtl' }))

		expect(el.localName).toBe('div')
		expect([...el.classList]).toEqual(
			expect.arrayContaining([
				'so-textarea',
				'so-textarea--size-lg',
				'so-textarea--readonly',
				'so-textarea--required',
			]),
		)
		expect(el.dataset['disabled']).toBe('false')
		expect(el.getAttribute('dir')).toBe('rtl')
		expect([...el.children].map((node) => node.localName)).toEqual(['textarea'])
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('нативные атрибуты — у <textarea>: id, name, rows, maxlength, placeholder', () => {
		const el = root(
			mount({
				id: 'about',
				name: 'about',
				rows: 4,
				maxlength: 200,
				placeholder: 'О себе',
				value: 'Текст',
			}),
		)
		const textarea = field(el)

		expect([textarea.id, textarea.name, textarea.placeholder]).toEqual([
			'about',
			'about',
			'О себе',
		])
		expect([textarea.rows, textarea.maxLength]).toEqual([4, 200])
		expect(textarea.value).toBe('Текст')
		// Входы — не атрибуты корня
		expect(['id', 'name', 'rows', 'maxlength'].filter((name) => el.hasAttribute(name))).toEqual(
			[],
		)
	})

	it('без rows — две строки, как у браузера; без maxlength — атрибута нет', () => {
		const textarea = field(root(mount()))

		expect(textarea.getAttribute('rows')).toBe('2')
		expect(textarea.hasAttribute('maxlength')).toBe(false)
	})

	it('disabled, readonly, required — нативные, без ARIA-дублей; имя — у поля', () => {
		const el = root(
			mount({ disabled: true, readonly: true, required: true, aria_label: 'О себе' }),
		)
		const textarea = field(el)

		expect([textarea.disabled, textarea.readOnly, textarea.required]).toEqual([
			true,
			true,
			true,
		])
		expect(textarea.hasAttribute('aria-disabled')).toBe(false)
		expect(textarea.hasAttribute('aria-readonly')).toBe(false)
		// Поле только для чтения браузер не проверяет — обязательность скажет ARIA
		expect(textarea.getAttribute('aria-required')).toBe('true')
		expect(textarea.getAttribute('aria-label')).toBe('О себе')
		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.dataset['disabled']).toBe('true')
	})
})

/**
 * Атрибуты потребителя делятся, как у Input: класс и стиль — корню, всё
 * остальное — полю. Статику переносит база, а слушатель рендерер адаптера
 * ставит на поле: событие, отправленное в корень, до него не доходит.
 */
@Component({
	selector: 'probe-textarea-forward',
	standalone: true,
	imports: [TTextareaComponent],
	template: `<div
		so-textarea
		class="app-field"
		style="flex: 1"
		data-testid="field"
		autocomplete="off"
		name="about"
		(keydown)="keys.push($event.key)"
	></div>`,
})
class ForwardHost {
	readonly keys: string[] = []
}

describe('Textarea · атрибуты потребителя', () => {
	it('класс и стиль — на корне, атрибуты из разметки — на поле', () => {
		const el = findIn(mountHost(ForwardHost), '[so-textarea]', HTMLElement)
		const textarea = field(el)

		expect(el.classList.contains('so-textarea')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.flex).not.toBe('')
		expect(el.hasAttribute('data-testid')).toBe(false)
		expect(el.hasAttribute('autocomplete')).toBe(false)

		expect(textarea.hasAttribute('class')).toBe(false)
		expect(textarea.hasAttribute('style')).toBe(false)
		expect(textarea.getAttribute('data-testid')).toBe('field')
		expect(textarea.getAttribute('autocomplete')).toBe('off')
	})

	it('атрибут-вход доходит до ядра, а не до поля атрибутом потребителя', () => {
		const el = findIn(mountHost(ForwardHost), '[so-textarea]', HTMLElement)

		expect(el.hasAttribute('name')).toBe(false)
		expect(field(el).name).toBe('about')
	})

	it('слушатель — на поле, а не на корне', () => {
		const fixture = mountHost(ForwardHost)
		const el = findIn(fixture, '[so-textarea]', HTMLElement)

		field(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }))

		expect(fixture.componentInstance.keys).toEqual(['a'])
	})
})

describe('Textarea · ввод', () => {
	it('набранное — в ctrl.value и одним soChangeValue', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const fixture = mount({ ctrl })
		const changes: unknown[] = []
		const textarea = field(root(fixture))

		fixture.componentInstance.soChangeValue.subscribe((change) => changes.push(change))

		await nextFrame()
		type(fixture, textarea, 'а\nб')

		expect(ctrl.value).toBe('а\nб')
		expect(textarea.value).toBe('а\nб')
		expect(changes).toEqual([{ newValue: 'а\nб', oldValue: 'а' }])
	})

	it('readonly — ввод в значение не уходит', async () => {
		const fixture = mount({ value: 'а', readonly: true })
		const changes: unknown[] = []

		fixture.componentInstance.soChangeValue.subscribe((change) => changes.push(change))

		await nextFrame()
		type(fixture, field(root(fixture)), 'аб')

		expect(changes).toEqual([])
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем» — браузер
	 * перестал бы проверять `minlength` и `maxlength`, — а набор через IME
	 * могла бы прервать. Привязка `[value]` записала бы его второй раз.
	 */
	it('набор не переписывает поле', async () => {
		const fixture = mount()
		const textarea = field(root(fixture))

		await nextFrame()

		const write = vi.spyOn(textarea, 'value', 'set')

		type(fixture, textarea, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	it('значение из кода — в поле, и после ввода тоже', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const fixture = mount({ ctrl })
		const textarea = field(root(fixture))

		await nextFrame()
		type(fixture, textarea, 'аб')

		ctrl.value = 'новое'
		fixture.detectChanges()

		expect(textarea.value).toBe('новое')
	})

	/**
	 * Хост перерисовался — прежний `value` в ядро не пишется, и набранное
	 * остаётся. Новый `value` — запись, снятый возвращает умолчание: пустое
	 * поле, как у Vue.
	 */
	it('перерисовка хоста: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const fixture = mount({ value: 'a' })
		const textarea = field(root(fixture))

		await nextFrame()
		type(fixture, textarea, 'ab')

		update(fixture, { placeholder: 'Текст' })

		expect(textarea.value).toBe('ab')

		update(fixture, { value: 'c' })

		expect(textarea.value).toBe('c')

		update(fixture, { value: undefined })

		expect(textarea.value).toBe('')
	})
})

/**
 * Событие ядра `input` — выход `soInput`, а `(input)` на поле — событие
 * браузера, как на нативной `<textarea>`. Обработчики точного типа, их сверяет
 * «Типы — Angular».
 */
@Component({
	selector: 'probe-textarea-events',
	standalone: true,
	imports: [TTextareaComponent],
	template: `<div so-textarea (input)="onDomInput($event)" (soInput)="onInput($event)"></div>`,
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

describe('Textarea · события', () => {
	it('(input) — событие браузера, (soInput) — событие ядра: по одному на нажатие', async () => {
		const fixture = mountHost(InputEventsHost)
		const textarea = field(findIn(fixture, '[so-textarea]', HTMLElement))

		await nextFrame()
		type(fixture, textarea, 'a')

		const { domInputs, inputs } = fixture.componentInstance

		expect(domInputs).toHaveLength(1)
		expect(domInputs[0].target).toBe(textarea)
		expect(inputs).toEqual([{ newValue: 'a', oldValue: '' }])
	})
})

/** Счётчик под провайдером локали: шаблон и числа — по его локали. */
@Component({
	selector: 'probe-textarea-locale',
	standalone: true,
	imports: [TTextareaComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale">
		<div so-textarea [value]="value" [maxlength]="5000" counter></div>
	</div>`,
})
class LocaleHost {
	readonly locale = ruRU
	readonly value = 'x'.repeat(1234)
}

describe('Textarea · счётчик', () => {
	it('без counter счётчика нет', () => {
		expect(counter(root(mount({ value: 'abc', maxlength: 10 })))).toBeNull()
	})

	it('без предела — одно число, с пределом — набрано / предел; следует за вводом', async () => {
		const fixture = mount({ value: 'abc', counter: true })

		expect(counter(root(fixture))?.textContent).toBe('3')

		update(fixture, { maxlength: 200 })

		expect(counter(root(fixture))?.textContent).toBe('3 / 200')

		await nextFrame()
		type(fixture, field(root(fixture)), 'abcd')

		expect(counter(root(fixture))?.textContent).toBe('4 / 200')
	})

	it('data-limit корня: ровно предел — reached, больше — exceeded, меньше — нет', () => {
		const fixture = mount({ value: 'abc', maxlength: 3, counter: true })
		const el = root(fixture)

		expect(el.dataset['limit']).toBe('reached')

		update(fixture, { value: 'abcd' })

		expect(el.dataset['limit']).toBe('exceeded')
		expect(counter(el)?.textContent).toBe('4 / 3')

		update(fixture, { value: 'ab' })

		expect(el.hasAttribute('data-limit')).toBe(false)
	})

	it('счётчик — пояснение поля: aria-describedby на его id, без живого региона', () => {
		const fixture = mount({ value: 'abc', maxlength: 200, counter: true })
		const el = root(fixture)
		const id = counter(el)?.id ?? ''

		expect(id).not.toBe('')
		expect(field(el).getAttribute('aria-describedby')).toBe(id)
		expect(counter(el)?.hasAttribute('aria-live')).toBe(false)

		update(fixture, { counter: false })

		expect(counter(el)).toBeNull()
		expect(field(el).hasAttribute('aria-describedby')).toBe(false)

		update(fixture, { counter: true })

		expect(field(el).getAttribute('aria-describedby')).toBe(counter(el)?.id)
	})

	it('своё пояснение — после счётчика', () => {
		const el = root(mount({ counter: true, aria_describedBy: 'hint' }))

		expect(field(el).getAttribute('aria-describedby')).toBe(`${counter(el)?.id} hint`)
	})

	it('под провайдером — числа по его локали', () => {
		const el = findIn(mountHost(LocaleHost), '[so-textarea]', HTMLElement)

		expect(counter(el)?.textContent).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)
	})
})

describe('Textarea · авторост', () => {
	it('включён — ручки нет; выключили — стили автороста сняты', async () => {
		const fixture = mount({ autoresize: true })
		const textarea = field(root(fixture))

		await nextFrame()

		expect(textarea.style.resize).toBe('none')

		update(fixture, { autoresize: false })
		await nextFrame()

		expect(textarea.style.resize).toBe('')
		expect(textarea.style.overflowY).toBe('')
		expect(textarea.style.height).toBe('')
	})

	it('без автороста инлайн-стилей у поля нет', async () => {
		const textarea = field(root(mount({ value: 'текст' })))

		await nextFrame()

		expect(textarea.hasAttribute('style')).toBe(false)
	})
})

@Component({
	selector: 'probe-textarea-field',
	standalone: true,
	imports: [TFieldComponent, TTextareaComponent],
	template: `<div so-field label="О себе"><div so-textarea></div></div>`,
})
class FieldHost {}

@Component({
	selector: 'probe-textarea-field-counter',
	standalone: true,
	imports: [TFieldComponent, TTextareaComponent],
	template: `<div so-field label="О себе" helper="Подсказка">
		<div so-textarea counter [maxlength]="200"></div>
	</div>`,
})
class FieldCounterHost {}

describe('Textarea · в поле формы', () => {
	it('подпись называет поле своим for — на id поля, ссылки нет', () => {
		const fixture = mountHost(FieldHost)
		const textarea = field(findIn(fixture, '[so-textarea]', HTMLElement))

		expect(textarea.id).not.toBe('')
		expect(findIn(fixture, '.so-field__label', HTMLLabelElement).htmlFor).toBe(textarea.id)
		expect(textarea.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('в aria-describedby поля — справка, за ней счётчик', () => {
		const fixture = mountHost(FieldCounterHost)

		expect(
			refsOf(field(findIn(fixture, '[so-textarea]', HTMLElement)), 'aria-describedby'),
		).toEqual([
			findIn(fixture, '.so-field__helper', HTMLElement).id,
			findIn(fixture, '.so-textarea__counter', HTMLElement).id,
		])
	})
})

/** Значение хоста по ходу теста — сигнал: хост `OnPush`. */
@Component({
	selector: 'probe-textarea-signal',
	standalone: true,
	imports: [TTextareaComponent],
	template: `<div so-textarea [value]="value()" counter></div>`,
})
class SignalHost {
	readonly value = signal('ab')
}

describe('Textarea · вход из шаблона', () => {
	it('смена привязки value — в поле и счётчик', () => {
		const fixture = mountHost(SignalHost)
		const el = findIn(fixture, '[so-textarea]', HTMLElement)

		expect(field(el).value).toBe('ab')
		expect(counter(el)?.textContent).toBe('2')

		fixture.componentInstance.value.set('abc')
		fixture.detectChanges()

		expect(field(el).value).toBe('abc')
		expect(counter(el)?.textContent).toBe('3')
	})
})
