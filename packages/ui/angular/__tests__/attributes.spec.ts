/**
 * Директива набора `[so-attributes]`: набор ядра на элементе шаблона, а не на
 * корне, — `aria` поля на `<input>`, `clearAria` на кнопке очистки, у
 * коллекций — наборы частей и строк.
 *
 * Правило раскладки то же, что у базы на корне (`applyAttributes`): что
 * называет набор, — его, остальное на элементе он не трогает. Элемент бывает
 * корнем вложенного компонента, и тогда на него пишут двое — база кнопки и
 * разметка владельца. Набор владельца главнее на общем имени, как атрибут
 * снаружи у Vue и React: `role="option"` строки перекрывает `role="button"`,
 * который кнопка на `div` пишет себе сама, — при любом порядке записи. Пишут
 * оба через один раскладчик элемента (`TElementAttributes`).
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import type { TAttributesMap } from '@soldy-ui/core'
import { AttributesDirective, TButtonComponent } from '@soldy-ui/angular'
import { TElementAttributes } from '../src/adapter/runtime/root-attributes'
import { findIn, mountHost } from './mount'

@Component({
	standalone: true,
	imports: [AttributesDirective],
	template: `<span title="Свой" role="note" [so-attributes]="set()"></span>`,
})
class PlainHost {
	readonly set = signal<TAttributesMap | undefined>({
		role: 'switch',
		'aria-checked': null,
		'aria-label': 'Звук',
	})
}

@Component({
	standalone: true,
	imports: [TButtonComponent, AttributesDirective],
	template: `<div so-button [disabled]="disabled()" [so-attributes]="set()"></div>`,
})
class NestedHost {
	readonly disabled = signal(false)
	readonly set = signal<TAttributesMap>({ role: 'option', tabindex: '-1' })
}

describe('набор на элементе шаблона', () => {
	it('что называет набор, — на элементе; null имени не называет', () => {
		const el = findIn(mountHost(PlainHost), 'span', HTMLSpanElement)

		expect(el.getAttribute('role')).toBe('switch')
		expect(el.getAttribute('aria-label')).toBe('Звук')
		expect(el.hasAttribute('aria-checked')).toBe(false)
		// Чего набор не называет, директива не трогает
		expect(el.getAttribute('title')).toBe('Свой')
	})

	it('ушло из набора — снимается; набора нет — пусто', () => {
		const fixture = mountHost(PlainHost)
		const el = findIn(fixture, 'span', HTMLSpanElement)

		fixture.componentInstance.set.set({ 'aria-label': 'Громкость' })
		fixture.detectChanges()

		expect(el.getAttribute('aria-label')).toBe('Громкость')
		expect(el.hasAttribute('role')).toBe(false)

		fixture.componentInstance.set.set(undefined)
		fixture.detectChanges()

		expect(el.hasAttribute('aria-label')).toBe(false)
		expect(el.getAttribute('title')).toBe('Свой')
	})
})

describe('набор владельца на корне вложенного компонента', () => {
	/**
	 * Кнопка на `div` пишет себе `role="button"` и `tabindex="0"`, а владелец —
	 * свои роль и `tabindex`. Владелец главнее с первой отрисовки, хотя пишет
	 * раньше: в проходе своего шаблона, а база кнопки — эффектом после него.
	 */
	it('набор владельца перекрывает то, что кнопка пишет себе сама', () => {
		const el = findIn(mountHost(NestedHost), '[so-button]', HTMLDivElement)

		expect(el.getAttribute('role')).toBe('option')
		expect(el.getAttribute('tabindex')).toBe('-1')
		// Своё у кнопки остаётся рядом
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(el.classList.contains('so-button')).toBe(true)
	})

	/**
	 * Смена своего у кнопки набора владельца не снимает: выключенная кнопка
	 * убирает свой `tabindex`, а `tabindex` владельца остаётся.
	 */
	it('смена своего у кнопки не трогает имя владельца', () => {
		const fixture = mountHost(NestedHost)
		const el = findIn(fixture, '[so-button]', HTMLDivElement)

		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.getAttribute('role')).toBe('option')
		expect(el.getAttribute('aria-disabled')).toBe('true')

		fixture.componentInstance.disabled.set(false)
		fixture.detectChanges()

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.hasAttribute('aria-disabled')).toBe(false)
	})

	it('владелец перестал называть имя — на элементе снова значение кнопки', () => {
		const fixture = mountHost(NestedHost)
		const el = findIn(fixture, '[so-button]', HTMLDivElement)

		fixture.componentInstance.set.set({ tabindex: '-1' })
		fixture.detectChanges()

		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('-1')

		fixture.componentInstance.set.set({})
		fixture.detectChanges()

		expect(el.getAttribute('tabindex')).toBe('0')
	})
})

describe('раскладчик элемента', () => {
	/** Слой владельца — верхний, кто бы ни записал первым. */
	it.each([
		['сначала владелец', ['markup', 'aria'] as const],
		['сначала база', ['aria', 'markup'] as const],
	])('%s — на общем имени значение владельца', (_case, order) => {
		const node = document.createElement('div')
		const sets = {
			aria: { role: 'button', tabindex: '0' },
			markup: { role: 'option', 'aria-selected': 'true' },
		}

		for (const layer of order) TElementAttributes.of(node).set(layer, sets[layer])

		expect(node.getAttribute('role')).toBe('option')
		expect(node.getAttribute('tabindex')).toBe('0')
		expect(node.getAttribute('aria-selected')).toBe('true')
	})

	it('раскладчик у элемента один, кто бы его ни взял', () => {
		const node = document.createElement('div')

		expect(TElementAttributes.of(node)).toBe(TElementAttributes.of(node))
	})
})
