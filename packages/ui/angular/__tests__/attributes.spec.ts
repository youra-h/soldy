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
 *
 * Корень вложенного компонента бывает хостом, который отдаёт написанное на нём
 * узлу внутри (`provideAttrs()`): поле, элемент коллекции, ListBox, Tabs. Набор
 * на таком хосте — то же написанное, что статика и привязки, и ложится туда же:
 * на `<input>` или строку, поверх набора, который туда кладёт шаблон самого
 * компонента. Узел — сам хост (поле `<div so-input>` в шаблоне Select), и набор
 * идёт дальше по цепочке, а на общем имени главнее набор внешнего звена.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import type { TAttributesMap } from '@soldy-ui/core'
import {
	AttributesDirective,
	TButtonComponent,
	TInputComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TSelectComponent,
} from '@soldy-ui/angular'
import { TForwardRegistry } from '../src/adapter/attrs/registry'
import { TElementAttributes } from '../src/adapter/runtime/root-attributes'
import { find, findIn, mountHost } from './mount'

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

	/**
	 * Выходы плагинов на корне (`TRootSpec.plugins` — пометка окна владельцем)
	 * лежат в `v-bind` корня Vue следом за наборами ядра: на общем имени они
	 * главнее наборов, а набор владельца главнее их.
	 */
	it('выходы плагинов — поверх наборов ядра и под набором владельца', () => {
		const node = document.createElement('div')
		const attributes = TElementAttributes.of(node)

		attributes.set('markup', { 'data-mark': 'markup' })
		attributes.set('plugins', { 'data-owner': 'plugins', 'data-mark': 'plugins' })
		attributes.set('dataset', { 'data-owner': 'dataset', 'data-open': 'true' })

		expect(node.getAttribute('data-owner')).toBe('plugins')
		expect(node.getAttribute('data-mark')).toBe('markup')
		expect(node.getAttribute('data-open')).toBe('true')
	})

	it('раскладчик у элемента один, кто бы его ни взял', () => {
		const node = document.createElement('div')

		expect(TElementAttributes.of(node)).toBe(TElementAttributes.of(node))
	})
})

/**
 * Набор на хосте с узлом внутри — узлу, как статика и привязки на этом хосте:
 * `aria` поля, написанный на `<div so-input>`, называет `<input>`, а не рамку
 * без роли. Набор снаружи главнее набора, который на узел кладёт шаблон
 * самого компонента, — как `controlAttrs` поверх `aria` на `<input>` у Vue.
 */
describe('набор на хосте с узлом внутри', () => {
	@Component({
		selector: 'probe-attributes-input',
		imports: [TInputComponent, AttributesDirective],
		template: `<div so-input aria_label="Своё" [so-attributes]="set()"></div>`,
	})
	class InputHost {
		readonly set = signal<TAttributesMap>({
			'aria-label': 'Снаружи',
			'aria-describedby': 'hint',
		})
	}

	it('ложится на узел, а не на хост, — поверх набора поля', () => {
		const fixture = mountHost(InputHost)
		const host = findIn(fixture, '[so-input]', HTMLElement)
		const input = find(host, 'input', HTMLInputElement)

		expect(input.getAttribute('aria-label')).toBe('Снаружи')
		expect(input.getAttribute('aria-describedby')).toBe('hint')
		expect(host.hasAttribute('aria-label')).toBe(false)
		expect(host.hasAttribute('aria-describedby')).toBe(false)
	})

	it('перестал называть имя — на узле снова значение поля; набора нет — пусто', () => {
		const fixture = mountHost(InputHost)
		const input = findIn(fixture, '[so-input] input', HTMLInputElement)

		fixture.componentInstance.set.set({ 'aria-describedby': 'other' })
		fixture.detectChanges()

		expect(input.getAttribute('aria-label')).toBe('Своё')
		expect(input.getAttribute('aria-describedby')).toBe('other')

		fixture.componentInstance.set.set({})
		fixture.detectChanges()

		expect(input.getAttribute('aria-label')).toBe('Своё')
		expect(input.hasAttribute('aria-describedby')).toBe(false)
	})

	/** Элемент коллекции: набор на `<div so-list-box-item>` — строке, рядом с её ролью. */
	it('на элементе коллекции — на строке', () => {
		@Component({
			selector: 'probe-attributes-item',
			imports: [TListBoxComponent, TListBoxItemComponent, AttributesDirective],
			template: `<div so-list-box>
				<div
					so-list-box-item
					value="a"
					text="A"
					[so-attributes]="{ 'data-mark': 'x' }"
				></div>
			</div>`,
		})
		class ItemHost {}

		const fixture = mountHost(ItemHost)
		const item = findIn(fixture, '[so-list-box-item]', HTMLElement)
		const row = find(item, '[role="option"]', HTMLElement)

		expect(row.getAttribute('data-mark')).toBe('x')
		expect(item.hasAttribute('data-mark')).toBe(false)
	})

	/**
	 * Цепочка: набор на Select уходит его полю, а поле — тоже хост, и набор
	 * доходит до `<input>`. На общем имени главнее набор снаружи — внешнего
	 * звена, — а набор Select, который его шаблон кладёт на поле, под ним.
	 */
	it('цепочка: набор на Select — на <input> его поля, поверх набора Select', () => {
		@Component({
			selector: 'probe-attributes-select',
			imports: [TSelectComponent, AttributesDirective],
			template: `<div so-select aria_label="Своё" [so-attributes]="set()"></div>`,
		})
		class SelectHost {
			readonly set = signal<TAttributesMap>({ 'aria-label': 'Снаружи', 'data-mark': 'x' })
		}

		const fixture = mountHost(SelectHost)
		const root = findIn(fixture, '[so-select]', HTMLElement)
		const box = find(root, '[so-input]', HTMLElement)
		const input = find(box, 'input', HTMLInputElement)

		expect(input.getAttribute('aria-label')).toBe('Снаружи')
		expect(input.getAttribute('data-mark')).toBe('x')
		expect(input.getAttribute('role')).toBe('combobox')

		for (const node of [root, box]) {
			expect(node.hasAttribute('aria-label')).toBe(false)
			expect(node.hasAttribute('data-mark')).toBe(false)
		}

		fixture.componentInstance.set.set({ 'data-mark': 'y' })
		fixture.detectChanges()

		// Набор снаружи имя отпустил — на `<input>` снова имя Select
		expect(input.getAttribute('aria-label')).toBe('Своё')
		expect(input.getAttribute('data-mark')).toBe('y')
	})
})

/**
 * Запись хоста в реестре — без компонента: узла до отрисовки нет, и он бывает
 * новым, а узел бывает хостом сам.
 */
describe('набор в записи хоста', () => {
	const registry = () => TestBed.inject(TForwardRegistry)

	it('ждёт узел и переезжает с ним: со старого снят', () => {
		const host = document.createElement('div')
		const forwarded = registry().register(host, [])
		const first = document.createElement('input')
		const second = document.createElement('input')

		forwarded.setMarkup({ 'aria-label': 'Имя', 'aria-hidden': null })

		// Узла ещё нет — набор ждёт его, на хост он не ложится
		expect(host.hasAttribute('aria-label')).toBe(false)

		forwarded.attach(first)

		expect(first.getAttribute('aria-label')).toBe('Имя')
		expect(first.hasAttribute('aria-hidden')).toBe(false)

		forwarded.attach(second)

		expect(first.hasAttribute('aria-label')).toBe(false)
		expect(second.getAttribute('aria-label')).toBe('Имя')

		forwarded.release()
	})

	/** Набор ложится поверх набора, который на узел кладёт его компонент. */
	it('верхний слой узла: шаблон компонента под ним', () => {
		const forwarded = registry().register(document.createElement('div'), [])
		const node = document.createElement('input')

		TElementAttributes.of(node).set('markup', { role: 'combobox', 'aria-label': 'Своё' })
		forwarded.attach(node)
		forwarded.setMarkup({ 'aria-label': 'Снаружи' })

		expect(node.getAttribute('role')).toBe('combobox')
		expect(node.getAttribute('aria-label')).toBe('Снаружи')

		forwarded.setMarkup({})

		expect(node.getAttribute('aria-label')).toBe('Своё')

		forwarded.release()
	})

	it('узел — хост: набор уходит его записи, на общем имени главнее внешний', () => {
		const outer = document.createElement('div')
		const inner = document.createElement('div')
		const node = document.createElement('input')
		const outerHost = registry().register(outer, [])
		const innerHost = registry().register(inner, [])

		innerHost.attach(node)
		innerHost.setMarkup({ 'aria-label': 'Внутренний', 'aria-invalid': 'true' })
		outerHost.setMarkup({ 'aria-label': 'Внешний' })
		outerHost.attach(inner)

		expect(node.getAttribute('aria-label')).toBe('Внешний')
		expect(node.getAttribute('aria-invalid')).toBe('true')
		expect(inner.hasAttribute('aria-label')).toBe(false)

		// Внешнее звено ушло с хоста — его набор снят, свой у звена остался
		outerHost.attach(null)

		expect(node.getAttribute('aria-label')).toBe('Внутренний')

		outerHost.release()
		innerHost.release()
	})
})
