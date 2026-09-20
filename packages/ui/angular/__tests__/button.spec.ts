/**
 * Button под Angular — тот же сценарий, что в `button.spec.*` остальных пяти
 * адаптеров: на каком теге какой набор ядра попадает в DOM и как проецируются
 * слоты.
 *
 * Угол зрения здесь свой. Наборы `attrs`, `aria` и `dataset` Angular
 * раскладывает не спредом, а входами `AriaDirective`, а корень живёт внутри
 * `@if` и пересоздаётся вместе с `tag` — за ним следит стратегия `'view'`
 * в `TComponentBase`. Забытый вход директивы или потерянная привязка узла
 * ловятся только отсюда: `ngc` шаблон компилирует, но не исполняет.
 *
 * Входы задаются `componentRef.setInput()`, а не полями: имена пропсов
 * объявлены генерированным массивом `inputs`, полей класса под них нет.
 * `setInput` даёт тот же `ngOnChanges`, что и привязка у родителя.
 */

import { describe, it, expect } from 'vitest'
import { Component, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TButton } from '@soldy/core'
import { SlotDirective, TButtonComponent } from '@soldy/ui-angular'
import { announced, elementPlugin } from './element-plugin'

function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TButtonComponent> {
	const fixture = TestBed.createComponent(TButtonComponent)

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/**
 * Корень компонента — первый элемент внутри хоста. Именно элемент, а не
 * `firstChild`: `@if` оставляет перед корнем узел-якорь.
 */
function root(fixture: ComponentFixture<unknown>): Element {
	const host: HTMLElement = fixture.nativeElement
	const element = host.firstElementChild

	if (!element) throw new Error('Корень Button не отрисован')

	return element
}

const text = (fixture: ComponentFixture<unknown>) =>
	root(fixture).querySelector('.s-button__text')?.textContent?.trim()

describe('Button · наборы ядра на корне', () => {
	it('на <button> — нативный disabled из attrs, без aria-disabled', () => {
		const el = root(mount({ disabled: true }))

		expect(el.tagName.toLowerCase()).toBe('button')
		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
	})

	it('на <div> — role и aria-disabled из aria, без нативного disabled', () => {
		const el = root(mount({ tag: 'div', disabled: true }))

		expect(el.tagName.toLowerCase()).toBe('div')
		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	it('не-нативный тег без disabled фокусируем', () => {
		const el = root(mount({ tag: 'div' }))

		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
	})

	/**
	 * Известное ограничение адаптера (`docs/architecture.md`, «Layer 8: Angular
	 * Adapter → Известные ограничения»): имя тега в шаблоне Angular не
	 * подставляется, поэтому веток ровно две — `<button>` и `<div>`. Остальные
	 * пять адаптеров отдают тег как есть. Сторож здесь, чтобы расхождение
	 * оставалось объявленным: снимут ограничение — тест упадёт и будет
	 * переписан.
	 */
	it('произвольный тег схлопывается в <div>, набор ядра при этом от тега', () => {
		const el = root(mount({ tag: 'a', disabled: true }))

		expect(el.tagName.toLowerCase()).toBe('div')
		// `a` для ядра не нативный: disabled уходит в aria, а не в attrs
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	/**
	 * Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не
	 * пропавший атрибут. Вход `dataset` у `AriaDirective` — единственное
	 * место, где этот набор попадает в разметку Angular.
	 */
	it('data-disabled стоит на обеих ветках и в обоих значениях', () => {
		expect(root(mount()).getAttribute('data-disabled')).toBe('false')
		expect(root(mount({ disabled: true })).getAttribute('data-disabled')).toBe('true')
		expect(root(mount({ tag: 'div' })).getAttribute('data-disabled')).toBe('false')
		expect(root(mount({ tag: 'div', disabled: true })).getAttribute('data-disabled')).toBe(
			'true',
		)
	})

	it('direction уходит в dir, inherit снимает атрибут', () => {
		const fixture = mount({ direction: 'rtl' })

		expect(root(fixture).getAttribute('dir')).toBe('rtl')
		expect(root(mount()).hasAttribute('dir')).toBe(false)

		fixture.componentRef.setInput('direction', 'inherit')
		fixture.detectChanges()

		expect(root(fixture).hasAttribute('dir')).toBe(false)
	})

	it('атрибут, ушедший из набора, снимается с корня', () => {
		const fixture = mount({ tag: 'div' })

		expect(root(fixture).getAttribute('tabindex')).toBe('0')

		fixture.componentRef.setInput('disabled', true)
		fixture.detectChanges()

		// disabled выключает элемент из порядка обхода: tabindex ушёл из набора
		expect(root(fixture).hasAttribute('tabindex')).toBe(false)
		expect(root(fixture).getAttribute('aria-disabled')).toBe('true')
		expect(root(fixture).getAttribute('data-disabled')).toBe('true')
	})
})

describe('Button · входы', () => {
	it('по умолчанию рендерит <button> с базовыми классами', () => {
		const el = root(mount())

		expect(el.tagName.toLowerCase()).toBe('button')
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['s-button', 's-button--size-normal']),
		)
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(el.className).not.toMatch(/--(variant|view)-/)
	})

	it('отображает text и применяет классы variant/size/view', () => {
		const fixture = mount({ text: 'Hello', variant: 'brand', size: 'xl', view: 'ghost' })

		expect(text(fixture)).toBe('Hello')
		expect(Array.from(root(fixture).classList)).toEqual(
			expect.arrayContaining([
				's-button',
				's-button--size-xl',
				's-button--variant-brand',
				's-button--view-ghost',
			]),
		)
		// Старые классы заменены, а не накоплены
		expect(root(fixture).className).not.toContain('s-button--size-normal')
	})

	it('rendered=false убирает корень, visible=false прячет его', () => {
		const fixture = mount()
		const host: HTMLElement = fixture.nativeElement

		fixture.componentRef.setInput('visible', false)
		fixture.detectChanges()

		expect(host.querySelector('button')?.style.display).toBe('none')

		fixture.componentRef.setInput('rendered', false)
		fixture.detectChanges()

		expect(host.firstElementChild).toBeNull()
	})
})

describe('Button · внешний ctrl', () => {
	it('отражает состояние инстанса и его мутации', () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand' })
		const fixture = mount({ ctrl })

		expect(text(fixture)).toBe('FromCtrl')
		expect(root(fixture).className).toContain('s-button--variant-brand')

		ctrl.text = 'Changed'
		fixture.detectChanges()

		expect(text(fixture)).toBe('Changed')
	})

	/**
	 * Стратегия `'view'`: смена `tag` переключает ветку `@if`, и `#root` —
	 * уже другой узел. Обычный `@ViewChild` после этого указывал бы на
	 * мёртвый элемент, а плагин остался бы связан с ним.
	 */
	it('смена tag пересоздаёт корень, и плагин узла связан с новым', async () => {
		const ctrl = new TButton({ text: 'Hi', disabled: true })
		const fixture = TestBed.createComponent(TButtonComponent)
		const plugin = elementPlugin(fixture)

		fixture.componentRef.setInput('ctrl', ctrl)
		fixture.detectChanges()

		await announced()

		const before = root(fixture)

		expect(before.tagName.toLowerCase()).toBe('button')
		expect(plugin().element).toBe(before)

		ctrl.tag = 'div'
		fixture.detectChanges()

		const after = root(fixture)

		expect(after).not.toBe(before)
		expect(after.tagName.toLowerCase()).toBe('div')
		expect(plugin().element).toBe(after)

		// Новый узел пуст: текст и наборы обязаны примениться заново
		expect(text(fixture)).toBe('Hi')
		expect(after.getAttribute('aria-disabled')).toBe('true')
		expect(after.getAttribute('data-disabled')).toBe('true')
	})
})

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button [text]="text"
		><i slot="leading">L</i><i slot="trailing">T</i></soldy-button
	>`,
})
class NamedSlotsHost {
	text = 'Mid'
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button text="ignored"><b>Custom</b></soldy-button>`,
})
class DefaultSlotHost {}

@Component({
	standalone: true,
	imports: [TButtonComponent, SlotDirective],
	template: `<soldy-button [text]="text">
		<ng-template slot="default" let-scope="text"
			><b>{{ scope }}!</b></ng-template
		>
	</soldy-button>`,
})
class ScopedSlotHost {
	text = 'Scoped'
}

/** Слоты объявляет потребитель, поэтому проверяются они через хост-компонент. */
function mountHost<T>(host: Type<T>): Element {
	const fixture = TestBed.createComponent(host)

	fixture.detectChanges()

	const element: HTMLElement = fixture.nativeElement
	const button = element.querySelector('soldy-button')?.firstElementChild

	if (!button) throw new Error('Корень Button не отрисован')

	return button
}

describe('Button · слоты', () => {
	it('leading стоит перед текстом, trailing — после', () => {
		const el = mountHost(NamedSlotsHost)

		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('именованные слоты не подавляют text из входа', () => {
		const el = mountHost(NamedSlotsHost)

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Mid')
	})

	it('содержимое по умолчанию переопределяет text', () => {
		const el = mountHost(DefaultSlotHost)

		expect(el.querySelector('.s-button__text b')?.textContent).toBe('Custom')
		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Custom')
	})

	it('<ng-template slot="default"> получает scope с text', () => {
		const el = mountHost(ScopedSlotHost)

		expect(el.querySelector('.s-button__text b')?.textContent).toBe('Scoped!')
	})

	it('слоты не становятся атрибутами корня', () => {
		const el = mountHost(NamedSlotsHost)

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})
