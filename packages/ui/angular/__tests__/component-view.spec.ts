/**
 * ComponentView — стратегия `'host'` из `TComponentBase`.
 *
 * У Button корень живёт внутри `@if`, и наборы ядра раскладывает директива
 * `[ariaAttrs]` в разметке. Здесь корень — сам хост-элемент компонента,
 * шаблона на него нет, и всё то же самое делает эффект `_bindRoot`: он же
 * применяет `aria`, `attrs` и `dataset` через `applyAttributes`, он же
 * связывает узел с `TElementPlugin`. Второй, независимый от Button путь —
 * и единственный тест на него.
 */

import { describe, it, expect } from 'vitest'
import { Component } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TComponentView } from '@soldy/core'
import { TComponentViewComponent } from '@soldy/ui-angular'
import { announced, elementPlugin } from './element-plugin'

/** Форма потребителя: корень компонента — его собственный тег в разметке. */
@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<soldy-component-view><b>внутри</b></soldy-component-view>`,
})
class ProjectionHost {}

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

describe('ComponentView · хост-элемент как корень', () => {
	it('классы ядра лежат на хосте', () => {
		const el = host(mount())

		expect(Array.from(el.classList)).toContain('s-component-view')
	})

	it('visible=false прячет хост, rendered=false — тоже', () => {
		const fixture = mount()

		expect(host(fixture).style.display).toBe('')

		fixture.componentRef.setInput('visible', false)
		fixture.detectChanges()

		expect(host(fixture).style.display).toBe('none')

		fixture.componentRef.setInput('visible', true)
		fixture.componentRef.setInput('rendered', false)
		fixture.detectChanges()

		// Хост-элемент создаёт родитель, убрать себя компонент не может —
		// поэтому `rendered` здесь тоже прячет, а не удаляет
		expect(host(fixture).style.display).toBe('none')
	})

	it('у потребителя корень — сам <soldy-component-view> с содержимым внутри', () => {
		const fixture = TestBed.createComponent(ProjectionHost)

		fixture.detectChanges()

		const element: HTMLElement = fixture.nativeElement
		const view = element.querySelector('soldy-component-view')

		if (!view) throw new Error('<soldy-component-view> не отрисован')

		expect(Array.from(view.classList)).toContain('s-component-view')
		expect(view.querySelector('b')?.textContent).toBe('внутри')
	})
})

describe('ComponentView · три набора ядра на хосте', () => {
	it('attrs, aria и dataset доезжают до хоста', () => {
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

	it('атрибут, ушедший из набора, снимается с хоста', () => {
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
	 * Наборы отслеживаются раздельно (`applyAttributes` с тремя списками
	 * «поставленного в прошлый раз»): снятие записи в одном не должно уносить
	 * чужие атрибуты.
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

	/**
	 * Хост существует всё время жизни компонента, поэтому `tag` его не
	 * пересоздаёт — в отличие от стратегии `'view'` у Button, где смена тега
	 * переключает ветку `@if` и даёт новый узел.
	 */
	it('смена tag не меняет хост-элемент', () => {
		const fixture = mount()
		const before = host(fixture)

		fixture.componentRef.setInput('tag', 'section')
		fixture.detectChanges()

		expect(host(fixture)).toBe(before)
	})
})

describe('ComponentView · плагин узла', () => {
	it('TElementPlugin связан с самим хостом', async () => {
		const fixture = TestBed.createComponent(TComponentViewComponent)
		const plugin = elementPlugin(fixture)

		fixture.detectChanges()

		await announced()

		expect(plugin().element).toBe(host(fixture))
	})
})
