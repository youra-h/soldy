/**
 * DatePicker под Angular — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`date-picker.spec.ts`), Svelte и React;
 * `v-model` Vue здесь — выходы `(soChangeValue)` и `(soChangeOpen)`, которые
 * хост возвращает входами. Модель — общее полям и календарю, одно значение на
 * две стороны, открытость — проверяет ядро, фокус панели и то, что её
 * открывает, — тест плагинов, раскладку и фокус в браузере —
 * `playground/vue/browser/date-picker.spec.ts`. Здесь важно, что экземпляры
 * ядра доезжают до компонентов (`[ctrl]`, `[engine]`), наборы — на свои узлы,
 * а выбор дня и набор в поле на настоящей разметке возвращаются выходами.
 *
 * Своё у Angular — разметка и слой. Корень — сам `<div so-date-picker>`, и всё,
 * что потребитель на нём написал, остаётся на нём; `id` — вход, и на корень
 * его кладёт база (`TRootSpec.id`). Поля — `<div so-date-input>` в шаблоне,
 * кнопки одной даты — шаблоны слотов поля. Панель — Frame в шаблоне, увезённый
 * в `body`; якорь панели — корень, его узел шаблону отдаёт база
 * (`rootElement()`). Корень Angular не снимается, а прячется, поэтому
 * `rendered: false` DatePicker передаёт и панели. Слоты — шаблоны: подвал
 * календарю и очистку полю DatePicker отдаёт, только когда в них есть что
 * рисовать.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TDatePicker, type TDatePickerValue, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { LocaleProviderDirective, SlotDirective, TDatePickerComponent } from '@soldy-ui/angular'
import { find, nextFrame } from './mount'

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<unknown> | null = null

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	current = null
	vi.useRealTimers()
	vi.restoreAllMocks()
})

/**
 * Смонтировать хост и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, а панель уезжает в `body` после отрисовки.
 * `prepare` задаёт входы до первой отрисовки — так, как они стоят в разметке с
 * самого начала.
 */
async function render<T>(host: Type<T>, prepare?: (page: T) => void): Promise<ComponentFixture<T>> {
	const fixture = TestBed.createComponent(host)

	current = fixture
	prepare?.(fixture.componentInstance)
	fixture.detectChanges()

	await settle()

	return fixture
}

/**
 * Перепроверить хост: событие дошло до ядра и его состояния, а разметку
 * приложение без Zone.js перепроверяет на своём такте — тест делает это сразу.
 */
function check(): void {
	current?.detectChanges()
}

/** Перерисовка и кадр. */
async function settle(): Promise<void> {
	check()
	await nextFrame()
	check()
}

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

function nodes(selector: string): HTMLElement[] {
	return [...document.querySelectorAll(selector)].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	)
}

/** Ячейка дня по его имени — полной дате, как её прочтёт скринридер. */
function dayCell(date: string): HTMLElement {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)

	return node(`.so-calendar-item[aria-label="${label}"]`)
}

const root = () => node('.so-date-picker')
const trigger = () => node('.so-date-picker__trigger')
const panel = () => node('.so-date-picker__panel')
const isOpen = () => panel().style.display !== 'none'

/** Скрытые поля формы в корне — значения полей DatePicker'а. */
const hiddenValues = () =>
	[...root().querySelectorAll('input[type="hidden"]')].map((input) =>
		input instanceof HTMLInputElement ? input.value : null,
	)

/** Скрытое поле формы поля одной даты. */
const fieldValue = () =>
	find(node('.so-date-picker__field'), 'input[type="hidden"]', HTMLInputElement).value

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	from.dispatchEvent(event)
	check()

	return event
}

/** Набрать строку с узла под фокусом документа. */
function type(keys: string): void {
	for (const key of keys) {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, key)
	}
}

/** Клик и кадр: открытая панель берёт координаты и фокус кадром позже. */
async function click(target: HTMLElement): Promise<void> {
	target.click()
	await settle()
}

/**
 * DatePicker: значение и открытость — по-настоящему, потребитель возвращает их
 * входами, как `v-model` и `v-model:open`. Входы — сигналы: хост `OnPush`, и
 * смена входа — смена сигнала; неопределённый сигнал — вход не задан. Клики,
 * дошедшие до корня, хост пишет в журнал.
 */
@Component({
	selector: 'probe-date-picker-page',
	standalone: true,
	imports: [TDatePickerComponent],
	template: `<div
		so-date-picker
		[ctrl]="ctrl()"
		[id]="id()"
		[aria_label]="label()"
		[mode]="mode()"
		[value]="value()"
		[open]="opened()"
		[disabled]="disabled()"
		[readonly]="readonly()"
		[size]="size()"
		[clearable]="clearable()"
		[confirmable]="confirmable()"
		[name]="name()"
		[swipe]="swipe()"
		[rendered]="rendered()"
		(soChangeValue)="change($event)"
		(soChangeOpen)="opened.set($event)"
		(click)="clicks.push($event)"
	></div>`,
})
class Page {
	readonly ctrl = signal<TDatePicker | undefined>(undefined)
	readonly id = signal<string | undefined>(undefined)
	readonly label = signal<string | undefined>(undefined)
	readonly mode = signal<TDatePickerComponent['mode']>(undefined)
	readonly value = signal<TDatePickerValue>(undefined)
	readonly opened = signal<boolean | undefined>(undefined)
	readonly disabled = signal<boolean | undefined>(undefined)
	readonly readonly = signal<boolean | undefined>(undefined)
	readonly size = signal<TDatePickerComponent['size']>(undefined)
	readonly clearable = signal<boolean | undefined>(undefined)
	readonly confirmable = signal<boolean | undefined>(undefined)
	readonly name = signal<string | undefined>(undefined)
	readonly swipe = signal<TDatePickerComponent['swipe']>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
	/** Клики, дошедшие до корня. */
	readonly clicks: Event[] = []

	change(payload: TValuePayload<TDatePickerValue>): void {
		this.value.set(payload.newValue)
	}
}

/** Всё, что потребитель записал на корень, — статикой. */
@Component({
	selector: 'probe-date-picker-attrs',
	standalone: true,
	imports: [TDatePickerComponent],
	template: `<div so-date-picker class="mine" data-probe="1" title="Заезд"></div>`,
})
class AttrsHost {}

/** DatePicker в провайдере русской локали: подвал и проверка набора. */
@Component({
	selector: 'probe-date-picker-russian',
	standalone: true,
	imports: [TDatePickerComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<div so-date-picker [confirmable]="confirmable()" [validate]="validate()"></div>
	</ng-container>`,
})
class RussianHost {
	readonly locale = ruRU
	readonly confirmable = signal<boolean | undefined>(undefined)
	readonly validate = signal<boolean | undefined>(undefined)
}

/** Своя кнопка очистки — шаблон `clear` с командой DatePicker'а в scope. */
@Component({
	selector: 'probe-date-picker-own-clear',
	standalone: true,
	imports: [TDatePickerComponent, SlotDirective],
	template: `<div so-date-picker [ctrl]="ctrl" [mode]="mode()" [clearable]="clearable()">
		<ng-template slot="clear" let-clear="clear"
			><button type="button" class="probe-clear" (click)="clear()"></button
		></ng-template>
	</div>`,
})
class OwnClearHost {
	readonly ctrl = new TDatePicker({ value: '2026-09-10' })
	readonly mode = signal<TDatePickerComponent['mode']>(undefined)
	readonly clearable = signal<boolean | undefined>(undefined)
}

/** Значок кнопки календаря — свой шаблон `trigger-icon`. */
@Component({
	selector: 'probe-date-picker-icon',
	standalone: true,
	imports: [TDatePickerComponent, SlotDirective],
	template: `<div so-date-picker>
		<ng-template slot="trigger-icon"><span class="so-test-icon">📅</span></ng-template>
	</div>`,
})
class IconHost {}

/** Содержимое дня — шаблон `item`: scope — сам день. */
@Component({
	selector: 'probe-date-picker-item',
	standalone: true,
	imports: [TDatePickerComponent, SlotDirective],
	template: `<div so-date-picker>
		<ng-template slot="item" let-item="item"
			><span class="so-test-day">«{{ item.text }}»</span></ng-template
		>
	</div>`,
})
class ItemHost {}

/** Содержимое дня — шаблон `item`: в scope и номер дня — scope слота календаря целиком. */
@Component({
	selector: 'probe-date-picker-item-text',
	standalone: true,
	imports: [TDatePickerComponent, SlotDirective],
	template: `<div so-date-picker>
		<ng-template slot="item" let-item="item" let-text="text"
			><span class="so-test-day">{{ text }}·{{ item.date.slice(5) }}</span></ng-template
		>
	</div>`,
})
class ItemTextHost {}

/** DatePicker в форме: что уйдёт при отправке, считает сам браузер. */
@Component({
	selector: 'probe-date-picker-form',
	standalone: true,
	imports: [TDatePickerComponent],
	template: `<form>
		<div
			so-date-picker
			[ctrl]="ctrl()"
			[mode]="mode()"
			[name]="name()"
			[startName]="startName()"
			[endName]="endName()"
			[value]="value()"
		></div>
	</form>`,
})
class FormHost {
	readonly ctrl = signal<TDatePicker | undefined>(undefined)
	readonly mode = signal<TDatePickerComponent['mode']>(undefined)
	readonly name = signal<string | undefined>(undefined)
	readonly startName = signal<string | undefined>(undefined)
	readonly endName = signal<string | undefined>(undefined)
	readonly value = signal<TDatePickerValue>(undefined)
}

describe('одна дата', () => {
	it('поле с кнопкой календаря в слоте, панель — диалог в body', async () => {
		await render(Page, (page) => {
			page.id.set('when')
			page.label.set('Дата заезда')
		})

		const field = node('.so-date-picker__field')

		expect(root().classList.contains('so-date-picker--single')).toBe(true)
		expect(root().id).toBe('when')
		expect(root().hasAttribute('role')).toBe(false)
		// Группа частей — само поле: имя DatePicker уходит ему
		expect(field.getAttribute('role')).toBe('group')
		expect(field.getAttribute('aria-label')).toBe('Дата заезда')
		expect(field.querySelector('.so-date-input__trailing .so-date-picker__trigger')).toBe(
			trigger(),
		)
		expect(panel().parentElement).toBe(document.body)
		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('aria-label')).toBe('Choose date')
		expect(isOpen()).toBe(false)
	})

	/**
	 * `id` — вход: статический атрибут с его именем база с хоста снимает, а на
	 * корень кладёт своим эффектом — значение и его смену, а снятое значение
	 * снимает и атрибут. Полю он не уходит: у поля одной даты свой `id` нет.
	 */
	it('id — на корне: смена доходит до атрибута, снятый вход снимает его; полю он не уходит', async () => {
		const fixture = await render(Page, (page) => page.id.set('when'))

		expect(root().id).toBe('when')
		expect(node('.so-date-picker__field').hasAttribute('id')).toBe(false)

		fixture.componentInstance.id.set('arrival')
		check()

		expect(root().id).toBe('arrival')

		fixture.componentInstance.id.set(undefined)
		check()

		expect(root().hasAttribute('id')).toBe(false)
	})

	it('кнопка — связка с панелью по id и вид «нажат», пока панель открыта', async () => {
		await render(Page)

		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-label')).toBe('Choose date')
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().id).not.toBe('')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset['selected']).toBe('false')

		await click(trigger())

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset['selected']).toBe('true')
		expect(root().dataset['open']).toBe('true')
	})

	it('выбор дня — выход soChangeValue, дата в поле, панель закрывается', async () => {
		const fixture = await render(Page)
		const page = fixture.componentInstance

		await click(trigger())
		expect(page.opened()).toBe(true)

		await click(dayCell('2026-09-10'))

		expect(page.value()).toBe('2026-09-10')
		expect(page.opened()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(fieldValue()).toBe('2026-09-10')
	})

	it('набор в поле — выход soChangeValue и выбранный день в календаре', async () => {
		const fixture = await render(Page)

		// en-US: месяц, день, год
		node('.so-date-input__segment[data-type="month"]').focus()
		type('09122026')
		await settle()

		expect(fixture.componentInstance.value()).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
	})

	it('выключенный — кнопка выключена, панель не открывается', async () => {
		await render(Page, (page) => page.disabled.set(true))

		expect(trigger().hasAttribute('disabled')).toBe(true)
		expect(node('.so-date-picker__field').dataset['disabled']).toBe('true')
	})

	it('атрибуты снаружи — корню, а не полю', async () => {
		await render(AttrsHost)

		const field = node('.so-date-picker__field')

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().dataset['probe']).toBe('1')
		expect(root().title).toBe('Заезд')
		expect(field.classList.contains('mine')).toBe(false)
		expect(field.hasAttribute('data-probe')).toBe(false)
		expect(field.hasAttribute('title')).toBe(false)
	})

	/**
	 * Якорь — корень, его узел шаблону отдаёт база: открытая панель встаёт под
	 * корнем, в 4 px от него.
	 */
	it('якорь — корень: открытая панель встаёт под ним, в 4 px', async () => {
		await render(Page)

		vi.spyOn(root(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 200, 32))

		await click(trigger())

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('100px')
		expect(panel().style.top).toBe('86px')
	})

	/**
	 * Корень Angular не снимается, а прячется, а панель увезена в `body`:
	 * `rendered` DatePicker передаёт ей сам, иначе открытая панель осталась бы
	 * на виду без своего поля. Снова отрисованный — панель на виду, как и была.
	 */
	it('rendered: false прячет корень и открытую панель', async () => {
		const fixture = await render(Page)

		await click(trigger())

		fixture.componentInstance.rendered.set(false)
		check()

		expect(root().style.display).toBe('none')
		expect(isOpen()).toBe(false)

		fixture.componentInstance.rendered.set(true)
		check()

		expect(root().style.display).toBe('')
		expect(isOpen()).toBe(true)
	})
})

describe('диапазон', () => {
	it('корень — группа с именем, поля концов названы, тире немое', async () => {
		await render(Page, (page) => {
			page.mode.set('range')
			page.label.set('Поездка')
		})

		const start = node('.so-date-picker__start')
		const end = node('.so-date-picker__end')

		expect(root().classList.contains('so-date-picker--range')).toBe(true)
		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Поездка')
		expect(start.getAttribute('aria-label')).toBe('Start date')
		expect(end.getAttribute('aria-label')).toBe('End date')
		expect(node('.so-date-picker__dash').getAttribute('aria-hidden')).toBe('true')
		// Кнопка — после поля конца, не в его слоте
		expect(end.nextElementSibling).toBe(trigger())
		expect(nodes('.so-date-picker__field')).toHaveLength(0)
	})

	it('в коробке диапазона узлы вплотную: текста между ними нет', async () => {
		await render(Page, (page) => {
			page.mode.set('range')
			page.clearable.set(true)
		})

		const texts = [...root().childNodes].filter(
			(child) => child instanceof Text && child.data.length > 0,
		)

		// Тире — в своём `span`, а пустые текстовые узлы шаблона Angular вырезает
		expect(texts).toEqual([])
		expect(node('.so-date-picker__dash').textContent).toBe('–')
	})

	it('два дня в календаре — пара в выходе и в поля, панель — до второго дня', async () => {
		const fixture = await render(Page, (page) => page.mode.set('range'))
		const page = fixture.componentInstance

		await click(trigger())
		await click(dayCell('2026-09-14'))

		expect(isOpen()).toBe(true)
		expect(page.value()).toBeUndefined()

		await click(dayCell('2026-09-10'))

		expect(page.value()).toEqual(['2026-09-10', '2026-09-14'])
		expect(isOpen()).toBe(false)
		expect(hiddenValues()).toEqual(['2026-09-10', '2026-09-14'])
	})

	it('смена режима перерисовывает поля нового режима', async () => {
		const fixture = await render(Page, (page) => {
			page.mode.set('single')
			page.value.set('2026-09-10')
		})

		fixture.componentInstance.mode.set('range')
		await settle()

		expect(nodes('.so-date-picker__field')).toHaveLength(0)
		expect(
			find(node('.so-date-picker__start'), 'input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-10')
	})
})

/**
 * Выбор с подтверждением: модель — черновик в календаре, «OK» и сброс при
 * закрытии — проверяет ядро. Здесь — подвал на настоящей разметке: он есть
 * только при `confirmable`, текст кнопок — строки локали поддерева, «OK»
 * гаснет посреди диапазона, а нажатия доходят до выходов.
 */
describe('выбор с подтверждением', () => {
	const footer = () => document.querySelector('.so-date-picker__panel .so-calendar__footer')
	const cancel = () => node('.so-date-picker__cancel')
	const confirm = () => node('.so-date-picker__confirm')

	/** DatePicker с подтверждением, значением и открытостью во входах — открыт. */
	async function bound(
		initial: TDatePickerValue,
		mode: TDatePickerComponent['mode'] = undefined,
	): Promise<Page> {
		const fixture = await render(Page, (page) => {
			page.confirmable.set(true)
			page.mode.set(mode)
			page.value.set(initial)
		})

		await click(trigger())

		return fixture.componentInstance
	}

	it('без confirmable подвала нет; с ним — «Отмена», потом «OK», в подвале календаря', async () => {
		const ctrl = new TDatePicker()

		await render(Page, (page) => page.ctrl.set(ctrl))

		expect(footer()).toBeNull()

		ctrl.confirmable = true
		await settle()

		expect([...(footer()?.children ?? [])]).toEqual([cancel(), confirm()])
		expect(cancel().textContent?.trim()).toBe('Cancel')
		expect(confirm().textContent?.trim()).toBe('OK')
		expect(confirm().hasAttribute('disabled')).toBe(false)

		ctrl.confirmable = false
		await settle()

		expect(footer()).toBeNull()
	})

	it('текст кнопок — от локали поддерева', async () => {
		await render(RussianHost, (page) => page.confirmable.set(true))

		expect(cancel().textContent?.trim()).toBe(ruRU.translations.datePicker.cancel)
		expect(confirm().textContent?.trim()).toBe(ruRU.translations.datePicker.confirm)
	})

	it('выбор дня — черновик: значение прежнее, панель открыта; «OK» — значение и закрытие', async () => {
		const page = await bound('2026-09-10')

		await click(dayCell('2026-09-12'))

		expect(page.value()).toBe('2026-09-10')
		expect(page.opened()).toBe(true)
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
		expect(fieldValue()).toBe('2026-09-10')

		await click(confirm())

		expect(page.value()).toBe('2026-09-12')
		expect(page.opened()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(fieldValue()).toBe('2026-09-12')
	})

	it('«Отмена» — панель закрыта, черновик сброшен, значение прежнее', async () => {
		const page = await bound('2026-09-10')

		await click(dayCell('2026-09-12'))
		await click(cancel())

		expect(page.opened()).toBe(false)
		expect(page.value()).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('false')
	})

	it('диапазон: «OK» гаснет на первом дне и загорается на втором', async () => {
		const page = await bound(undefined, 'range')

		await click(dayCell('2026-09-14'))

		expect(confirm().hasAttribute('disabled')).toBe(true)

		await click(dayCell('2026-09-10'))

		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(page.value()).toBeUndefined()

		await click(confirm())

		expect(page.value()).toEqual(['2026-09-10', '2026-09-14'])
	})
})

/**
 * Кнопка очистки — DatePicker'а: он сам поле (база `TClearable`), и кнопка у него
 * одна на значение. У одной даты она стоит в слоте `clear` поля — первой у его
 * конца, перед кнопкой календаря, — у диапазона одна на период, после поля
 * конца. Своей кнопки поля не рисуют. Что очистка делает с моделью — у обоих
 * концов, и у набранного не до конца, — проверяет ядро
 * (`core/__tests__/date-picker.spec.ts`), форму кнопки — браузерный прогон.
 */
describe('кнопка очистки', () => {
	const clearButtons = () => nodes('.so-date-picker__clear')
	const clearButton = () => node('.so-date-picker__clear')

	it('без clearable кнопки нет — ни у одной даты, ни у диапазона', async () => {
		const fixture = await render(Page, (page) => {
			page.mode.set('single')
			page.value.set('2026-09-10')
		})

		expect(clearButtons()).toHaveLength(0)

		fixture.componentInstance.mode.set('range')
		await settle()

		expect(clearButtons()).toHaveLength(0)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('одна дата: первой в слоте у конца поля, перед кнопкой календаря; у поля своей нет', async () => {
		await render(Page, (page) => {
			page.clearable.set(true)
			page.name.set('Заезд')
		})

		const slot = node('.so-date-picker__field .so-date-input__trailing')

		expect([...slot.children]).toEqual([clearButton(), trigger()])
		expect(clearButton().getAttribute('aria-label')).toBe('Clear Заезд')
		expect(root().classList.contains('so-date-picker--clearable')).toBe(true)
		expect(node('.so-date-picker__field').classList.contains('so-date-input--clearable')).toBe(
			false,
		)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: одна на период — после поля конца, перед кнопкой календаря', async () => {
		await render(Page, (page) => {
			page.mode.set('range')
			page.clearable.set(true)
		})

		expect(clearButtons()).toHaveLength(1)
		expect(node('.so-date-picker__end').nextElementSibling).toBe(clearButton())
		expect(clearButton().nextElementSibling).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear')
		// У полей концов своих кнопок нет: `clearable` им не уходит
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: клик очищает оба конца — выход видит пустое, клик не всплывает', async () => {
		const fixture = await render(Page, (page) => {
			page.mode.set('range')
			page.clearable.set(true)
			page.value.set(['2026-09-10', '2026-09-14'])
		})

		await click(clearButton())

		expect(fixture.componentInstance.value()).toBeUndefined()
		expect(hiddenValues()).toEqual(['', ''])
		expect(fixture.componentInstance.clicks).toEqual([])
	})

	it('кнопка зовёт команду DatePicker: clear — у него, в обоих режимах', async () => {
		const ctrl = new TDatePicker({ clearable: true, value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render(Page, (page) => page.ctrl.set(ctrl))

		await click(clearButton())

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)

		ctrl.mode = 'range'
		ctrl.value = ['2026-09-10', '2026-09-14']
		await settle()

		await click(clearButton())

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(2)
	})

	it('размер — DatePicker, выключена — вместе с ним, readonly её не гасит', async () => {
		const fixture = await render(Page, (page) => {
			page.clearable.set(true)
			page.size.set('lg')
			page.readonly.set(true)
			page.disabled.set(false)
		})

		expect(clearButton().classList.contains('so-button--size-lg')).toBe(true)
		expect(clearButton().hasAttribute('disabled')).toBe(false)

		fixture.componentInstance.disabled.set(true)
		await settle()

		expect(clearButton().hasAttribute('disabled')).toBe(true)
	})

	it('своя кнопка — слот clear с командой DatePicker в scope, у одной даты — в слоте поля', async () => {
		const fixture = await render(OwnClearHost)
		const { ctrl } = fixture.componentInstance
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		expect(node('.so-date-picker__field .so-date-input__trailing > .probe-clear')).toBeTruthy()
		expect(clearButtons()).toHaveLength(0)

		await click(node('.probe-clear'))

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)
	})

	it('своя кнопка у диапазона — после поля конца, вместо встроенной', async () => {
		await render(OwnClearHost, (page) => {
			page.mode.set('range')
			page.clearable.set(true)
		})

		expect(node('.so-date-picker__end').nextElementSibling).toBe(node('.probe-clear'))
		expect(clearButtons()).toHaveLength(0)
	})
})

/**
 * Ошибку считает ядро поля; здесь — что она доходит до разметки: смена одного
 * правила недоступности перечитывает части (`aria-invalid`) и набор корня
 * поля (`data-invalid`).
 */
describe('ошибка в поле', () => {
	it('правило недоступности, заданное позже, помечает части и корень поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-15' })

		await render(Page, (page) => page.ctrl.set(ctrl))

		const field = node('.so-date-picker__field')
		const parts = () => nodes('.so-date-picker__field .so-date-input__segment')

		expect(field.dataset['invalid']).toBeUndefined()
		expect(parts().some((part) => part.hasAttribute('aria-invalid'))).toBe(false)

		ctrl.unavailable = (date) => date === '2026-09-15'
		await settle()

		expect(field.dataset['invalid']).toBe('true')
		expect(parts().every((part) => part.getAttribute('aria-invalid') === 'true')).toBe(true)
	})

	it('конец раньше начала — ошибка у поля конца, у начала её нет', async () => {
		await render(Page, (page) => {
			page.mode.set('range')
			page.value.set(['2026-09-20', '2026-09-10'])
		})

		expect(node('.so-date-picker__end').dataset['invalid']).toBe('true')
		expect(node('.so-date-picker__start').dataset['invalid']).toBeUndefined()
	})
})

/**
 * Проверка набора — вход DatePicker'а: полям его отдаёт ядро, а разметка на
 * `<div so-date-input>` его не пробрасывает. Здесь — весь путь: вход из
 * разметки — ядру, ядро — полю, и смонтированный DateInput, которому вход не
 * задан, не перетирает его своим умолчанием. Та же пара, что «00» на дне у
 * DateInput (`date-input.spec.ts`), и на том же русском формате: день, месяц,
 * год.
 */
describe('проверка набора', () => {
	/** Часть поля одной даты по типу. */
	const segment = (type: string) =>
		node(`.so-date-picker__field .so-date-input__segment[data-type="${type}"]`)

	it('«00» на дне без validate — день 00, фокус уходит на месяц', async () => {
		await render(RussianHost)

		segment('day').focus()
		type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('«00» на дне с validate — фокус стоит, часть ждёт цифры', async () => {
		await render(RussianHost, (page) => page.validate.set(true))

		segment('day').focus()
		type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('day'))
	})
})

/**
 * Значение в форму отдают поля — скрытым полем DateInput. Что уйдёт при
 * отправке, считает сам браузер (`FormData`): поле без имени он пропускает.
 */
describe('форма', () => {
	function entries(): [string, FormDataEntryValue][] {
		return [...new FormData(find(document, 'form', HTMLFormElement)).entries()]
	}

	it('одна дата — под name', async () => {
		await render(FormHost, (page) => {
			page.name.set('date')
			page.startName.set('from')
			page.endName.set('to')
			page.value.set('2026-09-10')
		})

		expect(entries()).toEqual([['date', '2026-09-10']])
	})

	it('концы диапазона — под startName и endName', async () => {
		const fixture = await render(FormHost, (page) => {
			page.mode.set('range')
			page.name.set('date')
			page.startName.set('from')
			page.endName.set('to')
			page.value.set(['2026-09-10', '2026-09-14'])
		})

		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', '2026-09-14'],
		])

		fixture.componentInstance.startName.set('checkIn')
		fixture.componentInstance.endName.set('checkOut')
		await settle()

		expect(entries()).toEqual([
			['checkIn', '2026-09-10'],
			['checkOut', '2026-09-14'],
		])
	})

	it('недонабранный период: каждый конец уходит своим значением', async () => {
		const ctrl = new TDatePicker({ mode: 'range', startName: 'from', endName: 'to' })

		await render(FormHost, (page) => page.ctrl.set(ctrl))

		ctrl.start.paste('2026-09-10')
		await settle()

		// Значения у DatePicker ещё нет, а начало в форме — есть
		expect(ctrl.value).toBeUndefined()
		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', ''],
		])
	})

	it('без имён концов диапазон в форму не уходит', async () => {
		await render(FormHost, (page) => {
			page.mode.set('range')
			page.name.set('date')
			page.value.set(['2026-09-10', '2026-09-14'])
		})

		expect(entries()).toEqual([])
	})
})

describe('экземпляры ядра', () => {
	it('внешний ctrl: поле, календарь и движок — его', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })

		await render(Page, (page) => page.ctrl.set(ctrl))

		expect(ctrl.engine.options.get('owner')).toBe(ctrl.calendar)
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')

		ctrl.engine.extensions.selection.chooseDate('2026-09-20')
		await settle()

		expect(ctrl.value).toBe('2026-09-20')
		expect(fieldValue()).toBe('2026-09-20')
	})
})

describe('слоты', () => {
	it('trigger-icon подменяет значок кнопки', async () => {
		await render(IconHost)

		expect(trigger().querySelector('.so-test-icon')).not.toBeNull()
		expect(trigger().querySelector('svg')).toBeNull()
	})

	it('item уходит в дни календаря со scope { item }', async () => {
		await render(ItemHost)

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('«10»')
	})

	it('item получает и номер дня — scope слота календаря целиком', async () => {
		await render(ItemTextHost)

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('10·09-10')
	})

	it('без слота item день рисует свой номер', async () => {
		await render(Page)

		expect(dayCell('2026-09-10').textContent).toBe('10')
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`), раскладку, прокрутку и настоящую
 * мышь — браузер (`playground/vue/browser/anchored-swipe.spec.ts`). Здесь —
 * проводка: полоса и признак «тянут» на телепортированной панели, календарь в
 * своём содержимом, а закрытие жестом доходит до выхода.
 */
describe('жест', () => {
	const handle = () => document.querySelector('.so-date-picker__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (kind: string, target: Element, y: number) =>
		target.dispatchEvent(
			new PointerEvent(kind, {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: y,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				isPrimary: true,
			}),
		)

	it('без жеста полосы нет; с жестом — первая в панели, немая; календарь — в содержимом', async () => {
		const ctrl = new TDatePicker()

		await render(Page, (page) => page.ctrl.set(ctrl))

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')
		expect(node('.so-date-picker__content').parentElement).toBe(panel())
		expect(node('.so-date-picker__calendar').parentElement).toBe(
			node('.so-date-picker__content'),
		)

		ctrl.swipe = 'handle'
		await settle()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после flip
	 * плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по полосе
	 * вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от поля — закрыта, выход видит закрытие, признак «тянут» на панели', async () => {
		const fixture = await render(Page, (page) => page.swipe.set('handle'))
		const page = fixture.componentInstance

		await click(trigger())

		expect(page.opened()).toBe(true)
		expect(panel().dataset['placement']).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 320))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 145)
		check()

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('100px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 150)
		await settle()

		expect(page.opened()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
	})
})
