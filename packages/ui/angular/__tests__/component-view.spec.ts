/**
 * ComponentView — стратегия `'host'` из `TComponentBase`, как у Button.
 *
 * Корень — сам элемент потребителя (`<section so-component-view>`): тег ядро
 * берёт у него, классы, скрытие и наборы `aria`, `attrs` и `dataset` база
 * раскладывает на него же и связывает его с `TElementPlugin`. Шаблона на
 * корень у компонента нет, поэтому раскладку проверяет только рантайм — `ngc`
 * её не видит. Атрибуты потребителя главнее наборов ядра.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TComponentView } from '@soldy-ui/core'
import { TComponentViewComponent } from '@soldy-ui/angular'
import { announced, elementPlugin } from './element-plugin'

/** Форма потребителя: корень — его элемент, роль на нём — тоже его. */
@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<section so-component-view role="region" [ctrl]="ctrl"><b>внутри</b></section>`,
})
class SectionHost {
	readonly ctrl = new TComponentView({ direction: 'rtl' })
}

/** Роль потребителя привязкой: появляется уже поверх роли ядра. */
@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<div so-component-view [ctrl]="ctrl" [attr.role]="role()"></div>`,
})
class BoundRoleHost {
	readonly ctrl = new TComponentView()
	readonly role = signal<string | null>(null)
}

function mountSection(): { fixture: ComponentFixture<SectionHost>; section: HTMLElement } {
	const fixture = TestBed.createComponent(SectionHost)

	fixture.detectChanges()

	const host: HTMLElement = fixture.nativeElement
	const section = host.querySelector('section')

	if (!section) throw new Error('<section so-component-view> не отрисован')

	return { fixture, section }
}

/**
 * ComponentView, созданный самим TestBed: корень — `<div id="rootN">`, тот же
 * тег, что Angular берёт для атрибутного селектора, — умолчание ядра.
 */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TComponentViewComponent> {
	const fixture = TestBed.createComponent(TComponentViewComponent)

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Корень стратегии `'host'` — сам хост-элемент компонента. */
function host(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

describe('ComponentView · элемент потребителя как корень', () => {
	it('тег у ядра — тег элемента', () => {
		const { fixture, section } = mountSection()

		expect(fixture.componentInstance.ctrl.tag).toBe('section')
		expect(section.localName).toBe('section')
	})

	it('классы и наборы ядра лежат на элементе, содержимое — внутри', () => {
		const { fixture, section } = mountSection()

		fixture.componentInstance.ctrl.dataset.add('state', 'open')
		fixture.detectChanges()

		expect(Array.from(section.classList)).toContain('s-component-view')
		expect(section.getAttribute('dir')).toBe('rtl')
		expect(section.getAttribute('data-state')).toBe('open')
		expect(section.querySelector('b')?.textContent).toBe('внутри')
	})

	it('role потребителя главнее role ядра', () => {
		const { fixture, section } = mountSection()
		const { ctrl } = fixture.componentInstance

		ctrl.aria.add('role', 'group')
		fixture.detectChanges()

		expect(section.getAttribute('role')).toBe('region')

		// Чужой атрибут база не считает своим и не снимает
		ctrl.aria.remove('role')
		fixture.detectChanges()

		expect(section.getAttribute('role')).toBe('region')
	})

	/**
	 * `[attr.role]` Angular пишет поверх роли, которую поставила база. Значение
	 * уже не её — и, когда роль уходит из набора ядра, база его не снимает.
	 */
	it('[attr.role] потребителя поверх роли ядра база больше не трогает', () => {
		const fixture = TestBed.createComponent(BoundRoleHost)
		const { ctrl } = fixture.componentInstance

		fixture.detectChanges()

		const host: HTMLElement = fixture.nativeElement
		const view = host.querySelector('[so-component-view]')

		if (!view) throw new Error('ComponentView не отрисован')

		ctrl.aria.add('role', 'group')
		fixture.detectChanges()

		expect(view.getAttribute('role')).toBe('group')

		fixture.componentInstance.role.set('region')
		fixture.detectChanges()

		expect(view.getAttribute('role')).toBe('region')

		ctrl.aria.remove('role')
		fixture.detectChanges()

		expect(view.getAttribute('role')).toBe('region')
	})

	it('visible=false прячет корень, rendered=false — тоже', () => {
		const fixture = mount()

		expect(host(fixture).style.display).toBe('')

		fixture.componentRef.setInput('visible', false)
		fixture.detectChanges()

		expect(host(fixture).style.display).toBe('none')

		fixture.componentRef.setInput('visible', true)
		fixture.componentRef.setInput('rendered', false)
		fixture.detectChanges()

		// Элемент создаёт потребитель, убрать его компонент не может —
		// поэтому `rendered` здесь тоже прячет, а не удаляет
		expect(host(fixture).style.display).toBe('none')
	})
})

describe('ComponentView · три набора ядра на корне', () => {
	it('attrs, aria и dataset доезжают до корня', () => {
		const ctrl = new TComponentView({ direction: 'rtl' })
		const fixture = mount({ ctrl })

		ctrl.aria.add('role', 'group')
		ctrl.dataset.add('state', 'open')
		fixture.detectChanges()

		const el = host(fixture)

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(el.getAttribute('role')).toBe('group')
		expect(el.getAttribute('data-state')).toBe('open')
	})

	it('атрибут, ушедший из набора, снимается с корня', () => {
		const ctrl = new TComponentView({ direction: 'rtl' })
		const fixture = mount({ ctrl })

		ctrl.aria.add('role', 'group')
		fixture.detectChanges()

		expect(host(fixture).getAttribute('dir')).toBe('rtl')

		// inherit ядро переводит в null — атрибута быть не должно
		ctrl.direction = 'inherit'
		ctrl.aria.remove('role')
		fixture.detectChanges()

		expect(host(fixture).hasAttribute('dir')).toBe(false)
		expect(host(fixture).hasAttribute('role')).toBe(false)
	})

	/**
	 * Память «что поставила база» у каждого набора своя: снятие записи в
	 * одном не должно уносить чужие атрибуты.
	 */
	it('снятие записи в одном наборе не трогает остальные', () => {
		const ctrl = new TComponentView({ direction: 'rtl' })
		const fixture = mount({ ctrl })

		ctrl.aria.add('role', 'group')
		ctrl.dataset.add('state', 'open')
		fixture.detectChanges()

		ctrl.aria.remove('role')
		fixture.detectChanges()

		expect(host(fixture).hasAttribute('role')).toBe(false)
		expect(host(fixture).getAttribute('dir')).toBe('rtl')
		expect(host(fixture).getAttribute('data-state')).toBe('open')
	})
})

describe('ComponentView · плагин узла', () => {
	it('TElementPlugin связан с самим корнем', async () => {
		const fixture = TestBed.createComponent(TComponentViewComponent)
		const plugin = elementPlugin(fixture)

		fixture.detectChanges()

		await announced()

		expect(plugin().element).toBe(host(fixture))
	})
})
