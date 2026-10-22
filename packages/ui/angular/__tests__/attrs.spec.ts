/**
 * Рендерер адаптера (`provideAttrs()`): что потребитель пишет на компонент с
 * внутренним узлом, ложится на этот узел, как атрибуты снаружи у Vue и React.
 *
 * Статику разметки переносит база (`root-attributes.spec.ts`, спеки полей),
 * а привязки и слушатели Angular отдаёт рендереру шаблона потребителя — их
 * доносит рендерер адаптера. Таблица — по всем двадцати компонентам, у
 * которых написанное на компоненте делится между корнем и узлом внутри
 * (`TRootSpec.control`, `'wrapped'`): поля и радио — `<input>` или
 * `<textarea>`, у NumberInput — ввод числа, элементы ListBox, Tabs, Accordion,
 * Select и Tags и пункты меню — строка, ListBox и Tabs — узел списка с ролью,
 * Table — `table` в окне. У Select узел — `<input>` его поля, а поле само хост:
 * написанное на Select проходит цепочку хостов, поле отдаёт его дальше.
 *
 * На корне остаётся вид — класс и стиль, — служебные атрибуты Angular, выходы
 * компонента и события движения. Та же таблица идёт ещё раз рядом со старыми
 * анимациями Angular (`provideAnimationsAsync`): они подменяют
 * `RendererFactory2`, а рендерер адаптера стоит под ними.
 *
 * Провайдер подключают провайдеры спеков (`__tests__/providers.ts`); без него
 * компоненты бросают ошибку — `attrs-required.spec.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Component, RendererFactory2, RendererStyleFlags2, signal, type Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { animate, style, transition, trigger } from '@angular/animations'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import {
	TAccordionComponent,
	TAccordionItemComponent,
	TCheckBoxComponent,
	TInputComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TMenuCheckboxItemComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioGroupComponent,
	TMenuRadioItemComponent,
	TMenuSubmenuComponent,
	TNumberInputComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSelectComponent,
	TSelectItemComponent,
	TSwitchComponent,
	TTableComponent,
	TTabsComponent,
	TTabsItemComponent,
	TTagsComponent,
	TTagsItemComponent,
	TTextareaComponent,
} from '@soldy-ui/angular'
import type { TTableColumnSource } from '@soldy-ui/core'
import { ɵDomRendererFactory2 } from '@angular/platform-browser'
import { TForwardingRendererFactory } from '../src/adapter/attrs/factory'
import { TForwardRegistry } from '../src/adapter/attrs/registry'
import { assertTemplateHost } from '../src/adapter/runtime/component.base'
import { find, findIn, mountHost, nextFrame } from './mount'

/**
 * Хост пробы: что потребитель пишет на компонент, — сигналами, и что он
 * услышал. Стили хоста — ради атрибута инкапсуляции (`_ngcontent-*`) на его
 * элементах.
 */
abstract class TForwardProbe {
	readonly shown = signal(true)
	readonly extra = signal(true)
	readonly probe = signal<string | null>('a')
	readonly label = signal<string | null>('Имя')
	readonly title = signal('Подсказка')
	readonly events: string[] = []
	readonly ready: Element[] = []
}

/**
 * Что потребитель пишет на компонент: класс и стиль — вид корня, привязки
 * атрибута, ARIA и свойства, слушатели фокуса, движения и выход компонента.
 */
const WRITTEN = `class="mine"
	style="color: red"
	[class.extra]="extra()"
	[attr.data-probe]="probe()"
	[aria-label]="label()"
	[title]="title()"
	(focus)="events.push('focus')"
	(blur)="events.push('blur')"
	(transitionend)="events.push('transitionend')"
	(soElementReady)="ready.push($event)"`

/** Стили хоста: их атрибут инкапсуляции Angular ставит на элементы хоста. */
const STYLES = ['.mine { outline: none; }']

/** Строки и колонки таблицы данными. */
const TABLE_ITEMS = [{ data: { id: 1, name: 'Анна' } }]
const TABLE_COLUMNS: TTableColumnSource[] = [{ field: 'name', text: 'Имя' }]

@Component({
	selector: 'probe-forward-input',
	imports: [TInputComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-input ${WRITTEN}></div>
	}`,
})
class InputProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-number-input',
	imports: [TNumberInputComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-number-input ${WRITTEN}></div>
	}`,
})
class NumberInputProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-textarea',
	imports: [TTextareaComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-textarea ${WRITTEN}></div>
	}`,
})
class TextareaProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-check-box',
	imports: [TCheckBoxComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<span so-check-box ${WRITTEN}></span>
	}`,
})
class CheckBoxProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-switch',
	imports: [TSwitchComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<span so-switch ${WRITTEN}></span>
	}`,
})
class SwitchProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-radio',
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	styles: STYLES,
	template: `<div so-radio-group>
		@if (shown()) {
			<label so-radio-group-item value="a" ${WRITTEN}></label>
		}
	</div>`,
})
class RadioProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-list-box',
	imports: [TListBoxComponent, TListBoxItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-list-box ${WRITTEN}><div so-list-box-item value="a" text="A"></div></div>
	}`,
})
class ListBoxProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-list-box-item',
	imports: [TListBoxComponent, TListBoxItemComponent],
	styles: STYLES,
	template: `<div so-list-box>
		@if (shown()) {
			<div so-list-box-item value="a" text="A" ${WRITTEN}></div>
		}
	</div>`,
})
class ListBoxItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-tabs',
	imports: [TTabsComponent, TTabsItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-tabs ${WRITTEN}><div so-tabs-item value="a" text="A" active></div></div>
	}`,
})
class TabsProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-tabs-item',
	imports: [TTabsComponent, TTabsItemComponent],
	styles: STYLES,
	template: `<div so-tabs>
		@if (shown()) {
			<div so-tabs-item value="a" text="A" active ${WRITTEN}></div>
		}
	</div>`,
})
class TabsItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-accordion-item',
	imports: [TAccordionComponent, TAccordionItemComponent],
	styles: STYLES,
	template: `<div so-accordion>
		@if (shown()) {
			<div so-accordion-item value="a" text="A" ${WRITTEN}></div>
		}
	</div>`,
})
class AccordionItemProbe extends TForwardProbe {}

/**
 * Пункты меню — вне меню, сами по себе: панель меню увезена в `body`, мимо
 * разметки хоста, а делит написанное пункт сам, между корнем и строкой.
 */
@Component({
	selector: 'probe-forward-menu-item',
	imports: [TMenuItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-menu-item value="a" text="A" ${WRITTEN}></div>
	}`,
})
class MenuItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-menu-checkbox-item',
	imports: [TMenuCheckboxItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-menu-checkbox-item value="a" text="A" ${WRITTEN}></div>
	}`,
})
class MenuCheckboxItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-menu-radio-item',
	imports: [TMenuRadioGroupComponent, TMenuRadioItemComponent],
	styles: STYLES,
	template: `<div so-menu-radio-group>
		@if (shown()) {
			<div so-menu-radio-item value="a" text="A" ${WRITTEN}></div>
		}
	</div>`,
})
class MenuRadioItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-menu-submenu',
	imports: [TMenuSubmenuComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-menu-submenu value="a" text="A" ${WRITTEN}></div>
	}`,
})
class MenuSubmenuProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-menu-popover-item',
	imports: [TMenuPopoverItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-menu-popover-item value="a" text="A" ${WRITTEN}></div>
	}`,
})
class MenuPopoverItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-table',
	imports: [TTableComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-table [items]="items" [columns]="columns" ${WRITTEN}></div>
	}`,
})
class TableProbe extends TForwardProbe {
	readonly items = TABLE_ITEMS
	readonly columns = TABLE_COLUMNS
}

/**
 * Select: узел — `<input>` его поля, а поле — тоже хост. Привязки, статика и
 * слушатели проходят цепочку — Select отдаёт их полю, поле — своему `<input>`.
 */
@Component({
	selector: 'probe-forward-select',
	imports: [TSelectComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-select ${WRITTEN}></div>
	}`,
})
class SelectProbe extends TForwardProbe {}

/**
 * Опция — вне Select, сама по себе, как пункты меню: панель Select увезена в
 * `body`, мимо разметки хоста, а делит написанное опция сама.
 */
@Component({
	selector: 'probe-forward-select-item',
	imports: [TSelectItemComponent],
	styles: STYLES,
	template: `@if (shown()) {
		<div so-select-item value="a" text="A" ${WRITTEN}></div>
	}`,
})
class SelectItemProbe extends TForwardProbe {}

@Component({
	selector: 'probe-forward-tags-item',
	imports: [TTagsComponent, TTagsItemComponent],
	styles: STYLES,
	template: `<div so-tags>
		@if (shown()) {
			<div so-tags-item value="a" text="A" ${WRITTEN}></div>
		}
	</div>`,
})
class TagsItemProbe extends TForwardProbe {}

/** Случай таблицы: компонент, хост его пробы, корень в разметке хоста и узел в корне. */
type TForwardCase = {
	readonly component: Type<unknown>
	readonly probe: Type<TForwardProbe>
	readonly root: string
	readonly node: string
}

const CASES: ReadonlyArray<readonly [string, TForwardCase]> = [
	['Input', { component: TInputComponent, probe: InputProbe, root: '[so-input]', node: 'input' }],
	[
		'NumberInput',
		{
			component: TNumberInputComponent,
			probe: NumberInputProbe,
			root: '[so-number-input]',
			node: '.so-number-input__input',
		},
	],
	[
		'Textarea',
		{
			component: TTextareaComponent,
			probe: TextareaProbe,
			root: '[so-textarea]',
			node: 'textarea',
		},
	],
	[
		'CheckBox',
		{
			component: TCheckBoxComponent,
			probe: CheckBoxProbe,
			root: '[so-check-box]',
			node: 'input',
		},
	],
	[
		'Switch',
		{ component: TSwitchComponent, probe: SwitchProbe, root: '[so-switch]', node: 'input' },
	],
	[
		'RadioGroup.Item',
		{
			component: TRadioGroupItemComponent,
			probe: RadioProbe,
			root: '[so-radio-group-item]',
			node: 'input',
		},
	],
	[
		'ListBox',
		{
			component: TListBoxComponent,
			probe: ListBoxProbe,
			root: '[so-list-box]',
			node: '.so-list-box__list',
		},
	],
	[
		'ListBox.Item',
		{
			component: TListBoxItemComponent,
			probe: ListBoxItemProbe,
			root: '[so-list-box-item]',
			node: '[so-button]',
		},
	],
	[
		'Tabs',
		{ component: TTabsComponent, probe: TabsProbe, root: '[so-tabs]', node: '.so-tabs__list' },
	],
	[
		'Tabs.Item',
		{
			component: TTabsItemComponent,
			probe: TabsItemProbe,
			root: '[so-tabs-item]',
			node: '[so-button]',
		},
	],
	[
		'Accordion.Item',
		{
			component: TAccordionItemComponent,
			probe: AccordionItemProbe,
			root: '[so-accordion-item]',
			node: '.so-accordion-item__header',
		},
	],
	['Table', { component: TTableComponent, probe: TableProbe, root: '[so-table]', node: 'table' }],
	[
		'Select',
		{ component: TSelectComponent, probe: SelectProbe, root: '[so-select]', node: 'input' },
	],
	[
		'Select.Item',
		{
			component: TSelectItemComponent,
			probe: SelectItemProbe,
			root: '[so-select-item]',
			node: '[so-button]',
		},
	],
	[
		'Tags.Item',
		{
			component: TTagsItemComponent,
			probe: TagsItemProbe,
			root: '[so-tags-item]',
			node: '[so-button]',
		},
	],
	[
		'Menu.Item',
		{
			component: TMenuItemComponent,
			probe: MenuItemProbe,
			root: '[so-menu-item]',
			node: '[so-button]',
		},
	],
	[
		'Menu.CheckboxItem',
		{
			component: TMenuCheckboxItemComponent,
			probe: MenuCheckboxItemProbe,
			root: '[so-menu-checkbox-item]',
			node: '[so-button]',
		},
	],
	[
		'Menu.RadioItem',
		{
			component: TMenuRadioItemComponent,
			probe: MenuRadioItemProbe,
			root: '[so-menu-radio-item]',
			node: '[so-button]',
		},
	],
	[
		'Menu.Submenu',
		{
			component: TMenuSubmenuComponent,
			probe: MenuSubmenuProbe,
			root: '[so-menu-submenu]',
			node: '[so-button]',
		},
	],
	[
		'Menu.PopoverItem',
		{
			component: TMenuPopoverItemComponent,
			probe: MenuPopoverItemProbe,
			root: '[so-menu-popover-item]',
			node: '[so-button]',
		},
	],
]

/** Атрибуты инкапсуляции стилей хоста на элементе. */
const scoped = (element: Element) =>
	element.getAttributeNames().filter((name) => name.startsWith('_ngcontent-'))

/** Таблица случаев — та же с анимациями и без. */
function forwardSuite(): void {
	describe.each(CASES)('%s', (_name, { component, probe, root, node }) => {
		/** Проба в разметке хоста: её хост, корень компонента и узел в корне. */
		function mount() {
			const fixture = mountHost(probe)
			const host = findIn(fixture, root, HTMLElement)

			return {
				fixture,
				page: fixture.componentInstance,
				host,
				inner: find(host, node, HTMLElement),
			}
		}

		it('[attr.x] и [aria-label] — на узле: смена доходит, null снимает', () => {
			const { fixture, page, host, inner } = mount()

			expect(inner.getAttribute('data-probe')).toBe('a')
			expect(inner.getAttribute('aria-label')).toBe('Имя')
			expect(host.hasAttribute('data-probe')).toBe(false)
			expect(host.hasAttribute('aria-label')).toBe(false)

			page.probe.set('b')
			page.label.set('Фамилия')
			fixture.detectChanges()

			expect(inner.getAttribute('data-probe')).toBe('b')
			expect(inner.getAttribute('aria-label')).toBe('Фамилия')

			page.probe.set(null)
			page.label.set(null)
			fixture.detectChanges()

			expect(inner.hasAttribute('data-probe')).toBe(false)
			expect(inner.hasAttribute('aria-label')).toBe(false)
			expect(host.hasAttribute('data-probe')).toBe(false)
		})

		it('[title] — свойство узла, а не корня', () => {
			const { fixture, page, host, inner } = mount()

			expect(inner.title).toBe('Подсказка')
			expect(host.title).toBe('')

			page.title.set('Другая')
			fixture.detectChanges()

			expect(inner.title).toBe('Другая')
			expect(host.title).toBe('')
		})

		it('class, [class.x] и style — на корне', () => {
			const { fixture, page, host, inner } = mount()

			expect(host.classList.contains('mine')).toBe(true)
			expect(host.classList.contains('extra')).toBe(true)
			expect(host.style.color).toBe('red')
			expect(inner.classList.contains('mine')).toBe(false)
			expect(inner.classList.contains('extra')).toBe(false)
			expect(inner.style.color).toBe('')

			page.extra.set(false)
			fixture.detectChanges()

			expect(host.classList.contains('extra')).toBe(false)
		})

		it('атрибут инкапсуляции стилей хоста — на корне', () => {
			const { host, inner } = mount()

			expect(scoped(host)).toHaveLength(1)
			expect(scoped(inner)).toEqual([])
		})

		/**
		 * `focus` и `blur` не всплывают: слушатель на корне их от поля не
		 * услышал бы. Слушатель стоит на узле — событие корня до него не доходит.
		 */
		it('(focus) и (blur) приходят от узла, а не от корня', () => {
			const { page, host, inner } = mount()

			inner.dispatchEvent(new FocusEvent('focus'))
			inner.dispatchEvent(new FocusEvent('blur'))
			host.dispatchEvent(new FocusEvent('focus'))

			expect(page.events).toEqual(['focus', 'blur'])
		})

		/**
		 * Движение шлёт элемент, который движется, и всплывает: слушатель
		 * движения остаётся на корне и слышит и корень, и части.
		 */
		it('(transitionend) слушает корень', () => {
			const { page, host, inner } = mount()

			host.dispatchEvent(new Event('transitionend', { bubbles: true }))
			inner.dispatchEvent(new Event('transitionend', { bubbles: true }))

			expect(page.events).toEqual(['transitionend', 'transitionend'])
		})

		it('выход (soElementReady) слушает компонент', async () => {
			const { page } = mount()

			await nextFrame()

			expect(page.ready).toHaveLength(1)
		})

		it('у снятого компонента слушатель на узле не зовётся', () => {
			const { fixture, page, inner } = mount()

			page.shown.set(false)
			fixture.detectChanges()

			inner.dispatchEvent(new FocusEvent('focus'))

			expect(page.events).toEqual([])
		})

		/**
		 * Пометку `ng-version` на хост корневого компонента Angular пишет сам:
		 * компонент бывает корневым — у `createComponent` и TestBed.
		 */
		it('пометка корневого компонента ng-version — на корне', () => {
			const fixture = TestBed.createComponent(component, { inferTagName: true })

			fixture.detectChanges()

			const host: HTMLElement = fixture.nativeElement

			expect(host.hasAttribute('ng-version')).toBe(true)
			expect(find(host, node, HTMLElement).hasAttribute('ng-version')).toBe(false)
		})
	})
}

describe('рендерер адаптера', () => {
	/**
	 * Подмена идёт через закрытое API Angular (`ɵDomRendererFactory2`): перестала
	 * она работать — падает этот тест и вся таблица ниже.
	 */
	it('рендерер приложения — рендерер адаптера', () => {
		expect(TestBed.inject(RendererFactory2)).toBeInstanceOf(TForwardingRendererFactory)
	})

	forwardSuite()
})

/**
 * Цепочка хостов: узел Select — поле `<div so-input>`, а оно само хост. Что
 * потребитель написал на Select, — статика, привязка, слушатель, — Select
 * отдаёт полю, а поле — своему `<input>`: на `<div so-input>` написанное не
 * задерживается. На каждом звене остаётся своё: класс и стиль — у корня
 * Select, а свои класс и метки поля — у поля.
 */
describe('цепочка хостов: Select', () => {
	@Component({
		selector: 'probe-forward-chain',
		imports: [TSelectComponent],
		template: `@if (shown()) {
			<div
				so-select
				class="mine"
				autocomplete="off"
				data-static="s"
				[attr.data-probe]="probe()"
				(focus)="events.push('focus')"
			></div>
		}`,
	})
	class ChainProbe {
		readonly shown = signal(true)
		readonly probe = signal<string | null>('a')
		readonly events: string[] = []
	}

	function mount() {
		const fixture = mountHost(ChainProbe)
		const root = findIn(fixture, '[so-select]', HTMLElement)
		const box = find(root, '[so-input]', HTMLElement)

		return {
			fixture,
			page: fixture.componentInstance,
			root,
			box,
			input: find(box, 'input', HTMLInputElement),
		}
	}

	it('статика, привязка и слушатель — на <input> поля, поле и корень без них', () => {
		const { page, root, box, input } = mount()

		expect(input.getAttribute('autocomplete')).toBe('off')
		expect(input.getAttribute('data-static')).toBe('s')
		expect(input.getAttribute('data-probe')).toBe('a')

		for (const node of [root, box]) {
			for (const name of ['autocomplete', 'data-static', 'data-probe']) {
				expect(node.hasAttribute(name), name).toBe(false)
			}
		}

		input.dispatchEvent(new FocusEvent('focus'))
		box.dispatchEvent(new FocusEvent('focus'))

		expect(page.events).toEqual(['focus'])
	})

	it('на каждом звене остаётся своё: класс потребителя — у корня, класс поля — у поля', () => {
		const { root, box, input } = mount()

		expect(root.classList.contains('mine')).toBe(true)
		expect(box.classList.contains('mine')).toBe(false)
		expect(box.classList.contains('so-select__field')).toBe(true)
		expect(input.classList.contains('mine')).toBe(false)
		// Метка поля — его селектор — на нём, а не на `<input>`
		expect(box.hasAttribute('so-input')).toBe(true)
		expect(input.hasAttribute('so-input')).toBe(false)
	})

	it('снятая привязка снимается по цепочке, снятый Select — слушатель с <input>', () => {
		const { fixture, page, input } = mount()

		page.probe.set(null)
		fixture.detectChanges()

		expect(input.hasAttribute('data-probe')).toBe(false)

		page.shown.set(false)
		fixture.detectChanges()

		input.dispatchEvent(new FocusEvent('focus'))

		expect(page.events).toEqual([])
	})
})

describe('рядом со старыми анимациями Angular', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideAnimationsAsync()] })
	})

	it('приложение рисует фабрика анимаций, а рендерер адаптера стоит под ней', () => {
		expect(TestBed.inject(RendererFactory2)).not.toBeInstanceOf(TForwardingRendererFactory)
		expect(TestBed.inject(ɵDomRendererFactory2)).toBeInstanceOf(TForwardingRendererFactory)
	})

	forwardSuite()
})

/**
 * Компонент со старой анимацией: отложенная фабрика анимаций до загрузки
 * своего модуля отдаёт синтетическое свойство (`[@fade]`) рендереру под
 * собой, а проверку таких свойств снимает только с рендерера, который узнала,
 * — рендерер адаптера она не узнаёт. Без снятой проверки первая же отрисовка
 * бросила бы ошибку режима разработки.
 */
@Component({
	selector: 'probe-animated',
	imports: [TInputComponent],
	animations: [trigger('fade', [transition(':enter', [style({ opacity: 0 }), animate(1)])])],
	template: `<p [@fade]="'on'">Текст</p>
		<div
			so-input
			[@fade]="'on'"
			[attr.data-probe]="probe()"
			(focus)="events.push('focus')"
		></div>`,
})
class AnimatedProbe {
	readonly probe = signal('a')
	readonly events: string[] = []
}

describe('компонент со старой анимацией', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideAnimationsAsync('noop')] })
	})

	it('рисуется без ошибки, синтетическое свойство — у хоста, привязка и слушатель — на поле', async () => {
		const fixture = mountHost(AnimatedProbe)

		await fixture.whenStable()

		const host = findIn(fixture, '[so-input]', HTMLElement)
		const input = find(host, 'input', HTMLInputElement)

		expect(input.getAttribute('data-probe')).toBe('a')

		input.dispatchEvent(new FocusEvent('focus'))

		expect(fixture.componentInstance.events).toEqual(['focus'])
	})
})

describe('хост, в который шаблон не отрисуется', () => {
	@Component({
		selector: 'probe-void-input',
		imports: [TInputComponent],
		template: `<input so-input />`,
	})
	class VoidInputProbe {}

	@Component({
		selector: 'probe-textarea-host',
		imports: [TTextareaComponent],
		template: `<textarea so-textarea></textarea>`,
	})
	class TextareaHostProbe {}

	it('<input so-input> — ошибка', () => {
		expect(() => mountHost(VoidInputProbe)).toThrow(/<input> не может быть корнем компонента/)
	})

	it('<textarea so-textarea> — ошибка', () => {
		expect(() => mountHost(TextareaHostProbe)).toThrow(
			/<textarea> не может быть корнем компонента/,
		)
	})

	/**
	 * Хост без узла — `<ng-container so-toasts>`: на месте контейнера Angular
	 * ставит комментарий. В режиме разработки компонент на контейнере называет
	 * ошибкой он сам, раньше базы (`toasts.spec.ts`), а в продакшене — база.
	 */
	it('хост без узла (<ng-container>) — ошибка с подсказкой: пишите на элементе', () => {
		expect(() => assertTemplateHost(document.createComment('container'))).toThrow(
			/<ng-container>.*<div so-toasts>/,
		)
	})
})

/**
 * Запись хоста в реестре — на рендерере приложения, без компонента: узел
 * внутри бывает новым, и написанное на хосте переезжает на новый.
 */
describe('реестр', () => {
	/** Хост в реестре и рендерер приложения, через который пишет потребитель. */
	function setup() {
		const registry = TestBed.inject(TForwardRegistry)
		const renderer = TestBed.inject(RendererFactory2).createRenderer(null, null)
		const host = document.createElement('div')
		const forwarded = registry.register(host, ['size'])

		return { registry, renderer, host, forwarded }
	}

	it('узел сменился — атрибуты, свойства и слушатели на новом, со старого сняты', () => {
		const { renderer, host, forwarded } = setup()
		const first = document.createElement('input')
		const second = document.createElement('input')
		const heard: string[] = []

		renderer.setAttribute(host, 'title', 'Подсказка')
		renderer.setProperty(host, 'tabIndex', -1)
		renderer.listen(host, 'focus', () => {
			heard.push('focus')
		})

		// Узла ещё нет — написанное ждёт его
		expect(host.hasAttribute('title')).toBe(false)

		forwarded.attach(first)

		expect(first.getAttribute('title')).toBe('Подсказка')
		expect(first.tabIndex).toBe(-1)

		forwarded.attach(second)
		first.dispatchEvent(new FocusEvent('focus'))
		second.dispatchEvent(new FocusEvent('focus'))

		expect(first.hasAttribute('title')).toBe(false)
		expect(second.getAttribute('title')).toBe('Подсказка')
		expect(second.tabIndex).toBe(-1)
		expect(heard).toEqual(['focus'])

		forwarded.release()
	})

	it('снятый атрибут ждёт узел снятым, последнее значение побеждает', () => {
		const { renderer, host, forwarded } = setup()
		const node = document.createElement('input')

		node.setAttribute('placeholder', 'шаблона')
		renderer.setAttribute(host, 'title', 'первая')
		renderer.setAttribute(host, 'title', 'вторая')
		renderer.removeAttribute(host, 'placeholder')
		forwarded.attach(node)

		expect(node.getAttribute('title')).toBe('вторая')
		expect(node.hasAttribute('placeholder')).toBe(false)

		forwarded.release()
	})

	it('на хосте остаются класс, стиль, служебные атрибуты Angular, метки soldy и входы', () => {
		const { renderer, host, forwarded } = setup()
		const node = document.createElement('input')

		forwarded.attach(node)

		for (const name of [
			'class',
			'style',
			'ngh',
			'ng-version',
			'ngSkipHydration',
			'so-input',
			'size',
		])
			renderer.setAttribute(host, name, 'x')

		renderer.setProperty(host, 'className', 'mine')

		expect(host.getAttributeNames().sort()).toEqual(
			['class', 'ng-version', 'ngh', 'ngskiphydration', 'size', 'so-input', 'style'].sort(),
		)
		expect(host.className).toBe('mine')
		expect(node.getAttributeNames()).toEqual([])

		forwarded.release()
	})

	/**
	 * Хост без коробки — обёртка, чей корень уехал в слой (`<div so-toasts>`):
	 * внешний узел компонента — узел внутри, и класс со стилем уходят на него.
	 * На хосте остаются только его метки — служебные атрибуты Angular, метки
	 * soldy — и входы.
	 */
	it('хост без коробки: класс и стиль — на узел, метки и входы — на хосте', () => {
		const registry = TestBed.inject(TForwardRegistry)
		const renderer = TestBed.inject(RendererFactory2).createRenderer(null, null)
		const host = document.createElement('div')
		const forwarded = registry.register(host, ['size'], { boxless: true })
		const node = document.createElement('section')

		forwarded.attach(node)

		for (const name of ['class', 'style', 'ngh', 'ng-version', 'so-toasts', 'size'])
			renderer.setAttribute(host, name, 'x')

		renderer.setProperty(host, 'className', 'mine')
		renderer.addClass(host, 'dark')
		renderer.setStyle(host, 'margin-top', '8px', RendererStyleFlags2.DashCase)

		expect(host.getAttributeNames().sort()).toEqual(['ng-version', 'ngh', 'size', 'so-toasts'])
		expect(node.className).toBe('mine dark')
		expect(node.style.marginTop).toBe('8px')
		expect(host.style.marginTop).toBe('')

		renderer.removeClass(host, 'dark')
		renderer.removeStyle(host, 'margin-top', RendererStyleFlags2.DashCase)

		expect(node.className).toBe('mine')
		expect(node.style.marginTop).toBe('')

		forwarded.release()
	})

	it('класс и стиль хоста без коробки ждут узел и переезжают на новый, со старого сняты', () => {
		const registry = TestBed.inject(TForwardRegistry)
		const renderer = TestBed.inject(RendererFactory2).createRenderer(null, null)
		const host = document.createElement('div')
		const forwarded = registry.register(host, [], { boxless: true })
		const first = document.createElement('section')
		const second = document.createElement('section')

		renderer.addClass(host, 'dark')
		renderer.addClass(host, 'gone')
		renderer.removeClass(host, 'gone')
		renderer.setStyle(host, 'color', 'red')

		// Узла ещё нет — написанное ждёт его
		expect(host.className).toBe('')
		expect(host.style.color).toBe('')

		forwarded.attach(first)

		expect([...first.classList]).toEqual(['dark'])
		expect(first.style.color).toBe('red')

		forwarded.attach(second)

		expect(first.className).toBe('')
		expect(first.style.color).toBe('')
		expect([...second.classList]).toEqual(['dark'])
		expect(second.style.color).toBe('red')

		forwarded.release()
	})

	it('отписка работает до снятия хоста и после него', () => {
		const { renderer, host, forwarded } = setup()
		const node = document.createElement('input')
		const heard: string[] = []
		const early = renderer.listen(host, 'focus', () => {
			heard.push('early')
		})
		const late = renderer.listen(host, 'blur', () => {
			heard.push('late')
		})

		forwarded.attach(node)
		early()
		node.dispatchEvent(new FocusEvent('focus'))
		forwarded.release()
		late()
		node.dispatchEvent(new FocusEvent('blur'))

		expect(heard).toEqual([])
	})

	it('снятый хост пишется сам', () => {
		const { renderer, host, forwarded } = setup()

		forwarded.release()
		renderer.setAttribute(host, 'title', 'Подсказка')

		expect(host.getAttribute('title')).toBe('Подсказка')
	})
})
