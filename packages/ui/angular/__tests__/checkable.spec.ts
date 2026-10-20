/**
 * CheckBox и Switch под Angular: корень, вложенный `<input type="checkbox">` и
 * декор — коробка с отметкой или дорожка с ручкой.
 *
 * Сценарии — те же, что у React (`checkable.spec.tsx`) и Vue
 * (`input-control-attrs.spec.ts`, `input-bool.spec.ts`). Наборы ядра стоят на
 * разных элементах: `attrs` (`dir`) — на корне, `aria` — на `<input>`;
 * нативные `disabled` и `required` поля без ARIA-дублей, `readonly` — только
 * `aria-readonly`: HTML не знает его у чекбокса. Контрол кладут в подпись
 * `Label`, поэтому всё внутри — строчная разметка, а декор скрыт
 * `aria-hidden`: всё внутри `label` входит в имя поля.
 *
 * Угол зрения здесь свой. Селектор поля атрибутный: корень — сам
 * `<span so-check-box>`, классы и `attrs` на него кладёт база компонента,
 * `aria` на `<input>` — директива набора. Отметку и «выбрано частично» сообщают
 * нативные `checked` и `indeterminate` — привязки свойств `<input>`, Angular
 * пишет их на смену значения ядра. Переключает значение `TInputBoolPlugin` по
 * `change` поля, его слушатели встают по `ready` — кадром позже.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TCheckBox, TSwitch, type ISwitch } from '@soldy-ui/core'
import { useIcons, type TIconSource } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { SlotDirective, TCheckBoxComponent, TSwitchComponent } from '@soldy-ui/angular'
import { find, findIn, markupOf, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня. */
const field = (root: Element) => find(root, 'input', HTMLInputElement)

/** Корень поля, созданного самим TestBed, — его хост-элемент. */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Флажок или переключатель — у них общие входы и выходы. */
type TCheckable = TCheckBoxComponent | TSwitchComponent

/** Поле, созданное самим TestBed: корень — элемент его селектора. */
function mount<T extends TCheckable>(
	component: Type<T>,
	inputs: Record<string, unknown> = {},
): ComponentFixture<T> {
	const fixture = TestBed.createComponent(component, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Клик по полю — браузер переключает его и шлёт `change`. */
function click(fixture: ComponentFixture<unknown>, input: HTMLInputElement): void {
	input.click()
	fixture.detectChanges()
}

/**
 * Хосты с атрибутами потребителя. Селектор у каждого свой: их разметка
 * различается только тегом, а тег в id компонента Angular не входит — без
 * селектора id совпал бы (предупреждение NG0912).
 */
@Component({
	selector: 'probe-check-box-forward',
	standalone: true,
	imports: [TCheckBoxComponent],
	template: `<span so-check-box class="app-control" style="color: red" title="Согласие"></span>`,
})
class CheckBoxForwardHost {}

@Component({
	selector: 'probe-switch-forward',
	standalone: true,
	imports: [TSwitchComponent],
	template: `<span so-switch class="app-control" style="color: red" title="Согласие"></span>`,
})
class SwitchForwardHost {}

/** Случай таблицы: компонент, хост с атрибутами потребителя, селектор, декор и инстанс. */
type TCheckableCase = {
	readonly component: Type<TCheckable>
	readonly forward: Type<unknown>
	readonly selector: string
	readonly decor: string
	readonly ctrl: (readonly?: boolean) => TCheckBox | TSwitch
}

const CHECKABLES: ReadonlyArray<readonly [string, TCheckableCase]> = [
	[
		'CheckBox',
		{
			component: TCheckBoxComponent,
			forward: CheckBoxForwardHost,
			selector: '[so-check-box]',
			decor: '.so-check-box__container',
			ctrl: (readonly = false) => new TCheckBox({ readonly }),
		},
	],
	[
		'Switch',
		{
			component: TSwitchComponent,
			forward: SwitchForwardHost,
			selector: '[so-switch]',
			decor: '.so-switch__track',
			ctrl: (readonly = false) => new TSwitch({ readonly }),
		},
	],
]

describe.each(CHECKABLES)('%s · разметка', (_name, { component, forward, selector, decor }) => {
	/**
	 * Контрол кладут в подпись `Label`, а внутри `label` HTML разрешает только
	 * строчную разметку: `div` там невалиден. Корень — элемент компонента, по
	 * первому селектору — строчный `span`.
	 */
	it('корень — span, и всё внутри — не div', () => {
		const el = root(mount(component))

		expect(el.localName).toBe('span')
		expect(el.querySelectorAll('div')).toHaveLength(0)
	})

	/**
	 * Имя контролу даёт подпись вокруг, и в него вошёл бы весь текст внутри
	 * `label`, включая слоты иконок и `on`/`off`. Декор из имени убран.
	 */
	it('декор скрыт от скринридера — aria-hidden', () => {
		const el = root(mount(component, { value: true }))

		expect(find(el, decor, HTMLElement).getAttribute('aria-hidden')).toBe('true')
	})

	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(root(mount(component, { disabled: true, required: true })))

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — aria-readonly на <input>: HTML не знает readonly у чекбокса', () => {
		const input = field(root(mount(component, { readonly: true })))

		expect(input.getAttribute('aria-readonly')).toBe('true')
		expect(input.hasAttribute('readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(root(mount(component, { disabled: true })).hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = root(mount(component, { direction: 'rtl' }))

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('aria_label доходит до <input>, а не до корня', () => {
		const el = root(mount(component, { aria_label: 'Согласие' }))

		expect(field(el).getAttribute('aria-label')).toBe('Согласие')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('id и name — на поле', () => {
		const el = root(mount(component, { id: 'agree', name: 'agree' }))

		expect(field(el).id).toBe('agree')
		expect(field(el).name).toBe('agree')
		expect(el.hasAttribute('id')).toBe(false)
		expect(el.hasAttribute('name')).toBe(false)
	})

	it.each([true, false])('value: %s — нативный checked у <input>, без aria-checked', (value) => {
		const input = field(root(mount(component, { value })))

		expect(input.checked).toBe(value)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена value доходит до checked в обе стороны', () => {
		const fixture = mount(component)

		fixture.componentRef.setInput('value', true)
		fixture.detectChanges()

		expect(field(root(fixture)).checked).toBe(true)

		fixture.componentRef.setInput('value', false)
		fixture.detectChanges()

		expect(field(root(fixture)).checked).toBe(false)
	})

	/**
	 * Атрибуты потребителя у поля делятся, как у Vue и React: класс и стиль —
	 * корню, статический атрибут из разметки — полю.
	 */
	it('класс и стиль — на корне, атрибут из разметки — на поле', () => {
		const el = findIn(mountHost(forward), selector, HTMLElement)

		expect(el.classList.contains('app-control')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(el.hasAttribute('title')).toBe(false)
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('style')).toBe(false)
		expect(field(el).getAttribute('title')).toBe('Согласие')
	})
})

describe.each(CHECKABLES)('%s · клик', (_name, { component, ctrl: create }) => {
	it('переключает DOM и модель', async () => {
		const ctrl = create()
		const fixture = mount(component, { ctrl })
		const input = field(root(fixture))

		await nextFrame()
		click(fixture, input)

		expect(input.checked).toBe(true)
		expect(ctrl.value).toBe(true)
	})

	it('один клик — одно soChangeValue', async () => {
		const fixture = mount(component)
		const changes: unknown[] = []

		fixture.componentInstance.soChangeValue.subscribe((change) => changes.push(change))

		await nextFrame()
		click(fixture, field(root(fixture)))

		expect(changes).toEqual([{ newValue: true, oldValue: false }])
	})

	it('readonly — клик отменён: DOM и модель не меняются', async () => {
		const ctrl = create(true)
		const fixture = mount(component, { ctrl })
		const input = field(root(fixture))

		await nextFrame()
		click(fixture, input)

		expect(input.checked).toBe(false)
		expect(ctrl.value).toBe(false)
	})

	/** После клика отметка узла — уже его собственная; значение из кода доходит свойством. */
	it('ctrl.value из кода после клика — в DOM', async () => {
		const ctrl = create()
		const fixture = mount(component, { ctrl })
		const input = field(root(fixture))

		await nextFrame()
		click(fixture, input)

		ctrl.value = false
		fixture.detectChanges()

		expect(input.checked).toBe(false)
	})
})

describe('CheckBox · indeterminate', () => {
	it('DOM-свойство <input>, а не aria-checked="mixed"', () => {
		const input = field(root(mount(TCheckBoxComponent, { indeterminate: true })))

		expect(input.indeterminate).toBe(true)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена пропа доходит до свойства в обе стороны', () => {
		const fixture = mount(TCheckBoxComponent)

		expect(field(root(fixture)).indeterminate).toBe(false)

		fixture.componentRef.setInput('indeterminate', true)
		fixture.detectChanges()

		expect(field(root(fixture)).indeterminate).toBe(true)

		fixture.componentRef.setInput('indeterminate', false)
		fixture.detectChanges()

		expect(field(root(fixture)).indeterminate).toBe(false)
	})

	it('клик снимает indeterminate и отмечает', async () => {
		const ctrl = new TCheckBox({ indeterminate: true })
		const fixture = mount(TCheckBoxComponent, { ctrl })
		const input = field(root(fixture))

		await nextFrame()
		click(fixture, input)

		expect(input.indeterminate).toBe(false)
		expect(input.checked).toBe(true)
		expect(ctrl.indeterminate).toBe(false)
		expect(ctrl.value).toBe(true)
	})

	it('клик не снимает indeterminate у readonly', async () => {
		const ctrl = new TCheckBox({ indeterminate: true, readonly: true })
		const fixture = mount(TCheckBoxComponent, { ctrl })
		const input = field(root(fixture))

		await nextFrame()
		click(fixture, input)

		expect(input.indeterminate).toBe(true)
		expect(ctrl.indeterminate).toBe(true)
	})
})

/** Содержимое `<svg>` иконки так, как его сериализует документ. */
function bodyOf(source: TIconSource): string {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

	svg.innerHTML = source.body

	return svg.innerHTML
}

@Component({
	standalone: true,
	imports: [TCheckBoxComponent, SlotDirective],
	template: `<span so-check-box [value]="value()" [indeterminate]="indeterminate()" [ctrl]="ctrl">
		<ng-template slot="icon" let-value="value" let-indeterminate="indeterminate"
			><b>{{ value }}/{{ indeterminate }}</b></ng-template
		>
		<ng-template slot="indeterminate-icon" let-value="value" let-indeterminate="indeterminate"
			><i>{{ value }}/{{ indeterminate }}</i></ng-template
		>
	</span>`,
})
class MarkSlotsHost {
	readonly ctrl = new TCheckBox()
	readonly value = signal(true)
	readonly indeterminate = signal(false)
}

describe('CheckBox · отметка', () => {
	/** Отметка — в коробке: иконка или содержимое слота. */
	const mark = (el: Element) => find(el, '.so-check-box__container', HTMLElement)

	it('выбранный — иконка из пакета по роли check', () => {
		const svg = find(
			mark(root(mount(TCheckBoxComponent, { value: true }))),
			'svg',
			SVGSVGElement,
		)

		expect(svg.getAttribute('viewBox')).toBe(material.check.viewBox)
		expect(svg.innerHTML).toBe(bodyOf(material.check))
		expect(svg.classList.contains('so-check-box__mark')).toBe(true)
	})

	it('частично выбранный — иконка по роли checkIndeterminate, и поверх значения', () => {
		const el = root(mount(TCheckBoxComponent, { value: true, indeterminate: true }))
		const svg = find(mark(el), 'svg', SVGSVGElement)

		expect(svg.innerHTML).toBe(bodyOf(material.checkIndeterminate))
	})

	it('невыбранный — в коробке пусто', () => {
		const box = mark(root(mount(TCheckBoxComponent)))

		expect(box.children).toHaveLength(0)
		expect(box.textContent).toBe('')
	})

	/**
	 * Отметка — `svg` роли, а не компонент Icon: тот собирал бы свой контекст и
	 * плагины на каждую смену отметки, в таблице — тысячами. У Icon корень
	 * всегда с классом `so-icon`, у отметки его нет; размер ей даёт тема флажка.
	 */
	it('отметка — не компонент Icon, и на смену отметки Icon не собирается', () => {
		const fixture = mount(TCheckBoxComponent, { value: true })

		for (const [name, value] of [
			['indeterminate', true],
			['indeterminate', false],
			['value', false],
			['value', true],
			['size', 'lg'],
		] as const) {
			fixture.componentRef.setInput(name, value)
			fixture.detectChanges()
		}

		const svg = find(mark(root(fixture)), 'svg', SVGSVGElement)

		expect(svg.classList.contains('so-check-box__mark')).toBe(true)
		expect(root(fixture).querySelector('.so-icon')).toBeNull()
	})

	it('иконка переживает перерисовку — тот же узел', () => {
		const fixture = mount(TCheckBoxComponent, { value: true })
		const svg = find(mark(root(fixture)), 'svg', SVGSVGElement)

		fixture.componentRef.setInput('size', 'lg')
		fixture.detectChanges()

		expect(find(mark(root(fixture)), 'svg', SVGSVGElement)).toBe(svg)
	})

	/**
	 * Роль читается, когда отметка появляется: пакет, подключённый позже, виден
	 * у следующей отметки.
	 */
	it('иконка по роли — из пакета на момент, когда отметка появилась', () => {
		const custom: TIconSource = { viewBox: '0 0 10 10', body: '<circle r="5"></circle>' }
		const fixture = mount(TCheckBoxComponent, { value: false })

		try {
			useIcons({ check: custom })
			fixture.componentRef.setInput('value', true)
			fixture.detectChanges()

			const svg = find(mark(root(fixture)), 'svg', SVGSVGElement)

			expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
			expect(svg.innerHTML).toBe(bodyOf(custom))
		} finally {
			useIcons(material)
		}
	})

	it('слот icon подменяет иконку и получает scope', () => {
		const el = findIn(mountHost(MarkSlotsHost), '[so-check-box]', HTMLElement)

		expect(markupOf(mark(el))).toBe('<b>true/false</b>')
	})

	it('слот indeterminate-icon подменяет иконку частично выбранного', () => {
		const fixture = mountHost(MarkSlotsHost)

		fixture.componentInstance.value.set(false)
		fixture.componentInstance.indeterminate.set(true)
		fixture.detectChanges()

		expect(markupOf(mark(findIn(fixture, '[so-check-box]', HTMLElement)))).toBe(
			'<i>false/true</i>',
		)
	})

	it('слоты — не атрибуты поля и корня', () => {
		const el = findIn(mountHost(MarkSlotsHost), '[so-check-box]', HTMLElement)

		expect(field(el).hasAttribute('icon')).toBe(false)
		expect(el.hasAttribute('icon')).toBe(false)
	})
})

@Component({
	standalone: true,
	imports: [TSwitchComponent, SlotDirective],
	template: `<span so-switch [ctrl]="ctrl">
		<ng-template slot="on" let-value="value" let-ctrl="ctrl"
			><i>вкл:{{ value }}:{{ ctrl === own }}</i></ng-template
		>
		<ng-template slot="off" let-value="value"
			><i>выкл:{{ value }}</i></ng-template
		>
	</span>`,
})
class ThumbSlotsHost {
	readonly ctrl = new TSwitch()
	readonly own: ISwitch = this.ctrl
}

describe('Switch · роль и ручка', () => {
	/** Содержимое ручки. */
	const thumb = (el: Element) => find(el, '.so-switch__track--thumb', HTMLElement)

	it('role="switch" на <input>, а не на корне', () => {
		const el = root(mount(TSwitchComponent))

		expect(field(el).getAttribute('role')).toBe('switch')
		expect(el.hasAttribute('role')).toBe(false)
	})

	it('в ручке — слот off у выключенного и on у включённого, scope — значение и инстанс', () => {
		const fixture = mountHost(ThumbSlotsHost)
		const el = findIn(fixture, '[so-switch]', HTMLElement)

		expect(markupOf(thumb(el))).toBe('<i>выкл:false</i>')

		fixture.componentInstance.ctrl.value = true
		fixture.detectChanges()

		expect(markupOf(thumb(el))).toBe('<i>вкл:true:true</i>')
	})

	it('без слотов ручка пуста', () => {
		const box = thumb(root(mount(TSwitchComponent)))

		expect(box.children).toHaveLength(0)
		expect(box.textContent).toBe('')
	})
})
