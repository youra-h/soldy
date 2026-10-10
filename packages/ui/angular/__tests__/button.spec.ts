/**
 * Button под Angular — тот же сценарий, что в `button.spec.*` остальных пяти
 * адаптеров: на каком теге какой набор ядра попадает в DOM и как проецируются
 * слоты.
 *
 * Угол зрения здесь свой. Обёртки нет: корень — сам элемент, на котором
 * потребитель написал селектор (`<button so-button>`, `<div so-button>`). Тег
 * ядро берёт у него, а классы, скрытие и наборы ядра `TComponentBase`
 * раскладывает на него же, рядом с тем, что написал потребитель. Атрибут
 * потребителя, который перебило ядро, или вход, оставшийся атрибутом корня,
 * ловятся только отсюда: `ngc` шаблон компилирует, но не исполняет.
 *
 * Входы задаются привязкой в разметке хоста или `componentRef.setInput()`, а
 * не полями: поля входов сгенерированный `TButtonSurface` только объявляет, и
 * запись в поле мимо Angular до ядра не дойдёт. `setInput` даёт тот же
 * `ngOnChanges`, что и привязка у родителя.
 *
 * `TestBed.createComponent` вешает компонент на `<div id="rootN">`, поэтому
 * тег корня задаёт либо хост с разметкой, либо `inferTagName: true` — тег
 * первого селектора, `button`.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { NgClass } from '@angular/common'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TButton, type TComponentSize } from '@soldy-ui/core'
import { SlotDirective, TButtonComponent } from '@soldy-ui/angular'
import { announced, elementPlugin } from './element-plugin'

/** Button сам по себе: корень — `<button>`, тег первого селектора. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TButtonComponent> {
	const fixture = TestBed.createComponent(TButtonComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Корень Button, созданного самим TestBed, — его хост-элемент. */
function root(fixture: ComponentFixture<TButtonComponent>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Хост с разметкой: тег корня — тот, что написан в шаблоне. */
function mountHost<T>(host: Type<T>): ComponentFixture<T> {
	const fixture = TestBed.createComponent(host)

	fixture.detectChanges()

	return fixture
}

/** Корни Button в разметке хоста — элементы с атрибутом селектора. */
function roots(fixture: ComponentFixture<unknown>): HTMLElement[] {
	const host: HTMLElement = fixture.nativeElement

	return Array.from(host.querySelectorAll<HTMLElement>('[so-button]'))
}

function firstRoot(fixture: ComponentFixture<unknown>): HTMLElement {
	const [element] = roots(fixture)

	if (!element) throw new Error('Корень Button не отрисован')

	return element
}

const text = (element: Element) => element.querySelector('.s-button__text')?.textContent?.trim()

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button disabled></button>`,
})
class DisabledButtonHost {}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<div so-button [disabled]="disabled()"></div>`,
})
class DivHost {
	readonly disabled = signal(false)
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<a so-button href="/next" [ctrl]="ctrl"></a><span so-button></span>`,
})
class OtherTagsHost {
	readonly ctrl = new TButton({ text: 'Дальше' })
}

describe('Button · наборы ядра на корне', () => {
	/**
	 * Статический `disabled` Angular ставит на элемент до конструктора, а база
	 * его снимает: атрибут на корне — запись ядра, со значением из `attrs`.
	 */
	it('<button so-button disabled> — нативный disabled из attrs, без role и tabindex', () => {
		const el = firstRoot(mountHost(DisabledButtonHost))

		expect(el.localName).toBe('button')
		expect(el.getAttribute('disabled')).toBe('disabled')
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
	})

	it('<div so-button> — role и tabindex="0", с disabled — aria-disabled', () => {
		const fixture = mountHost(DivHost)
		const el = firstRoot(fixture)

		expect(el.localName).toBe('div')
		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
		expect(el.hasAttribute('aria-disabled')).toBe(false)

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		// disabled выключает элемент из порядка обхода: tabindex ушёл из набора
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('tabindex')).toBe(false)
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	it('<a so-button href> и <span so-button> остаются своими тегами, href на месте', () => {
		const [link, span] = roots(mountHost(OtherTagsHost))

		expect(link.localName).toBe('a')
		expect(link.getAttribute('href')).toBe('/next')
		expect(span.localName).toBe('span')

		// Для ядра `a` и `span` не нативные кнопки: роль и фокус — из `aria`
		expect(link.getAttribute('role')).toBe('button')
		expect(span.getAttribute('role')).toBe('button')
		expect(span.getAttribute('tabindex')).toBe('0')
	})

	/**
	 * Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не
	 * пропавший атрибут, на любом теге.
	 */
	it('data-disabled стоит на любом теге и в обоих значениях', () => {
		expect(root(mount()).getAttribute('data-disabled')).toBe('false')
		expect(root(mount({ disabled: true })).getAttribute('data-disabled')).toBe('true')

		const fixture = mountHost(DivHost)

		expect(firstRoot(fixture).getAttribute('data-disabled')).toBe('false')

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		expect(firstRoot(fixture).getAttribute('data-disabled')).toBe('true')
	})

	it('direction уходит в dir, inherit снимает атрибут', () => {
		const fixture = mount({ direction: 'rtl' })

		expect(root(fixture).getAttribute('dir')).toBe('rtl')
		expect(root(mount()).hasAttribute('dir')).toBe(false)

		fixture.componentRef.setInput('direction', 'inherit')
		fixture.detectChanges()

		expect(root(fixture).hasAttribute('dir')).toBe(false)
	})
})

describe('Button · входы', () => {
	it('по умолчанию корень — <button> с базовыми классами', () => {
		const el = root(mount())

		expect(el.localName).toBe('button')
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['s-button', 's-button--size-normal']),
		)
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(el.className).not.toMatch(/--(variant|view)-/)
	})

	it('отображает text и применяет классы variant/size/view', () => {
		const fixture = mount({ text: 'Hello', variant: 'brand', size: 'xl', view: 'ghost' })

		expect(text(root(fixture))).toBe('Hello')
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

	/**
	 * Элемент потребителя компонент убрать не может, поэтому `rendered` его
	 * прячет, как `visible`: элемент тот же, содержимое на месте, и
	 * `TElementPlugin` связан с ним всё время.
	 */
	it('visible=false и rendered=false прячут корень, элемент тот же и связан с TElementPlugin', async () => {
		const fixture = TestBed.createComponent(TButtonComponent, { inferTagName: true })
		const plugin = elementPlugin(fixture)

		fixture.componentRef.setInput('text', 'Сохранить')
		fixture.detectChanges()

		await announced()

		const el = root(fixture)

		expect(plugin().element).toBe(el)
		expect(el.style.display).toBe('')

		fixture.componentRef.setInput('visible', false)
		fixture.detectChanges()

		expect(el.style.display).toBe('none')

		fixture.componentRef.setInput('visible', true)
		fixture.componentRef.setInput('rendered', false)
		fixture.detectChanges()

		expect(root(fixture)).toBe(el)
		expect(el.style.display).toBe('none')
		expect(text(el)).toBe('Сохранить')
		expect(plugin().element).toBe(el)

		fixture.componentRef.setInput('rendered', true)
		fixture.detectChanges()

		expect(el.style.display).toBe('')
	})
})

describe('Button · внешний ctrl', () => {
	it('отражает состояние инстанса и его мутации', () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand' })
		const fixture = mount({ ctrl })

		expect(text(root(fixture))).toBe('FromCtrl')
		expect(root(fixture).className).toContain('s-button--variant-brand')

		ctrl.text = 'Changed'
		fixture.detectChanges()

		expect(text(root(fixture))).toBe('Changed')
	})

	it('получает тег элемента', () => {
		const fixture = mountHost(OtherTagsHost)

		expect(fixture.componentInstance.ctrl.tag).toBe('a')
	})
})

@Component({
	standalone: true,
	imports: [TButtonComponent, NgClass],
	template: `<button
		so-button
		class="own"
		[size]="size()"
		[class.marked]="marked()"
		[ngClass]="{ picked: picked() }"
		[style.flex]="flex()"
		[attr.title]="title()"
	></button>`,
})
class ForwardHost {
	readonly size = signal<TComponentSize>('normal')
	readonly marked = signal(true)
	readonly picked = signal(true)
	readonly flex = signal<string | null>('1')
	readonly title = signal<string | null>('Сохранить')
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<div so-button style="display: inline-flex" [visible]="visible()"></div>`,
})
class InlineDisplayHost {
	readonly visible = signal(true)
}

/** Класс потребителя с именем модификатора ядра: стоял до того, как ядро его назвало. */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button class="s-button--size-normal" [size]="size()"></button>`,
})
class SameClassHost {
	readonly size = signal<TComponentSize>('normal')
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<div so-button tabindex="-1" [disabled]="disabled()"></div>
		<a so-button href="/next" role="link" [disabled]="disabled()"></a>`,
})
class ConsumerAttributesHost {
	readonly disabled = signal(false)
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button
		so-button
		text="Сохранить"
		size="xl"
		aria_label="Сохранить файл"
		disabled
		[ctrl]="ctrl"
	></button>`,
})
class StaticInputsHost {
	readonly ctrl = new TButton()
}

describe('Button · разметка потребителя на корне', () => {
	it('[class.x], [ngClass], [style.flex] и [attr.title] ставятся и снимаются, size меняет только классы ядра', () => {
		const fixture = mountHost(ForwardHost)
		const el = firstRoot(fixture)
		const flex = el.style.flex

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining([
				'own',
				'marked',
				'picked',
				's-button',
				's-button--size-normal',
			]),
		)
		expect(flex).not.toBe('')
		expect(el.getAttribute('title')).toBe('Сохранить')

		fixture.componentInstance.size.set('xl')
		fixture.detectChanges()

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 'marked', 'picked', 's-button', 's-button--size-xl']),
		)
		expect(el.classList).not.toContain('s-button--size-normal')
		expect(el.style.flex).toBe(flex)
		expect(el.getAttribute('title')).toBe('Сохранить')

		fixture.componentInstance.marked.set(false)
		fixture.componentInstance.picked.set(false)
		fixture.componentInstance.flex.set(null)
		fixture.componentInstance.title.set(null)
		fixture.detectChanges()

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 's-button', 's-button--size-xl']),
		)
		expect(el.classList).not.toContain('marked')
		expect(el.classList).not.toContain('picked')
		expect(el.style.flex).toBe('')
		expect(el.hasAttribute('title')).toBe(false)
	})

	/**
	 * Скрытие — привязка хоста `[style.display]`, и шаблон потребителя главнее
	 * неё: видимый корень своего `display` не теряет, а скрытие ему уступает
	 * (во Vue и React наоборот, см. `TComponentBase`).
	 */
	it('инлайновый display потребителя остаётся на корне и главнее скрытия', () => {
		const fixture = mountHost(InlineDisplayHost)
		const el = firstRoot(fixture)

		expect(el.style.display).toBe('inline-flex')

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		expect(el.style.display).toBe('inline-flex')

		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(el.style.display).toBe('inline-flex')
	})

	it('класс потребителя с именем класса ядра ядро не снимает', () => {
		const fixture = mountHost(SameClassHost)
		const el = firstRoot(fixture)

		fixture.componentInstance.size.set('xl')
		fixture.detectChanges()

		expect(el.classList).toContain('s-button--size-xl')
		expect(el.classList).toContain('s-button--size-normal')
	})

	/**
	 * Атрибут потребителя главнее набора ядра: ядро пишет кнопке на `div`
	 * `tabindex="0"`, снимает его с выключенной и возвращает включённой — и ни
	 * разу не трогает чужое значение.
	 */
	it('tabindex="-1" на <div so-button> переживает смену disabled', () => {
		const fixture = mountHost(ConsumerAttributesHost)
		const [div] = roots(fixture)

		expect(div.getAttribute('tabindex')).toBe('-1')

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		expect(div.getAttribute('tabindex')).toBe('-1')
		expect(div.getAttribute('aria-disabled')).toBe('true')

		fixture.componentInstance.disabled.set(false)
		fixture.detectChanges()

		expect(div.getAttribute('tabindex')).toBe('-1')
		expect(div.hasAttribute('aria-disabled')).toBe(false)
	})

	it('role="link" на <a so-button> остаётся', () => {
		const fixture = mountHost(ConsumerAttributesHost)
		const [, link] = roots(fixture)

		expect(link.getAttribute('role')).toBe('link')

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		expect(link.getAttribute('role')).toBe('link')
		expect(link.getAttribute('aria-disabled')).toBe('true')
	})

	/**
	 * Статический атрибут с именем входа — запись входа: значения дошли до
	 * ядра, а на корне таких атрибутов нет.
	 */
	it('атрибутов text, size и aria_label на корне нет', () => {
		const el = firstRoot(mountHost(StaticInputsHost))

		expect(el.hasAttribute('text')).toBe(false)
		expect(el.hasAttribute('size')).toBe(false)
		expect(el.hasAttribute('aria_label')).toBe(false)

		expect(text(el)).toBe('Сохранить')
		expect(el.classList).toContain('s-button--size-xl')
		expect(el.getAttribute('aria-label')).toBe('Сохранить файл')
	})

	/**
	 * Нативный `disabled` ведёт только набор `attrs`: останься на корне
	 * статический атрибут, включённая кнопка осталась бы выключенной.
	 */
	it('disabled уходит с корня после ctrl.disabled = false', () => {
		const fixture = mountHost(StaticInputsHost)
		const el = firstRoot(fixture)

		expect(el.hasAttribute('disabled')).toBe(true)

		fixture.componentInstance.ctrl.disabled = false
		fixture.detectChanges()

		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('false')
	})
})

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button [text]="text">
		<i slot="leading">L</i><i slot="trailing">T</i>
	</button>`,
})
class NamedSlotsHost {
	text = 'Mid'
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button text="ignored"><b>Custom</b></button>`,
})
class DefaultSlotHost {}

@Component({
	standalone: true,
	imports: [TButtonComponent, SlotDirective],
	template: `<button so-button [text]="text">
		<ng-template slot="default" let-scope="text"
			><b>{{ scope }}!</b></ng-template
		>
	</button>`,
})
class ScopedSlotHost {
	text = 'Scoped'
}

describe('Button · слоты', () => {
	it('leading стоит перед текстом, trailing — после', () => {
		const el = firstRoot(mountHost(NamedSlotsHost))

		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('именованные слоты не подавляют text из входа', () => {
		const el = firstRoot(mountHost(NamedSlotsHost))

		expect(text(el)).toBe('Mid')
	})

	it('содержимое по умолчанию переопределяет text', () => {
		const el = firstRoot(mountHost(DefaultSlotHost))

		expect(el.querySelector('.s-button__text b')?.textContent).toBe('Custom')
		expect(text(el)).toBe('Custom')
	})

	it('<ng-template slot="default"> получает scope с text', () => {
		const el = firstRoot(mountHost(ScopedSlotHost))

		expect(el.querySelector('.s-button__text b')?.textContent).toBe('Scoped!')
	})

	it('слоты не становятся атрибутами корня', () => {
		const el = firstRoot(mountHost(NamedSlotsHost))

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})
