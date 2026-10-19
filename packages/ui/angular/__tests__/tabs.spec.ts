/**
 * Tabs под Angular — набор вкладок на движке коллекций.
 *
 * Сценарии — те же, что у React (`tabs.spec.tsx`) и Vue (`tabs-content`,
 * `tabs-close`, `tabs-keyboard`): панель по активному табу и ARIA-связка «таб
 * ↔ панель», кнопка закрытия, клавиатура по APG Tabs.
 *
 * Своё у Angular — разметка. Корень набора — сам элемент компонента
 * (`<so-tabs>`): атрибуты потребителя у него делятся между корнем и списком
 * табов. Корень панели — элемент потребителя (`<div so-tabs-content
 * slot="content">`), таб — `<so-tabs-item>`. Неактивную панель убрать компонент не может — элемент
 * написал потребитель, — поэтому она скрыта, а её содержимое в документ не
 * вставлено. Слоты со scope и слоты, по которым таб решает, рисовать ли своё
 * (`close-icon`), — шаблоны; шаблон, заданный набору, рисуется у каждого таба
 * вместо своего, как сниппет у Svelte.
 *
 * Таб разметки входит в коллекцию в своём `ngOnInit`, и панель, что стоит в
 * разметке после табов, находит свой таб уже в сборке. Крестик гасит всплытие
 * клика, как `@click.stop` у Vue: до корней таба и набора, где клик слушает
 * `TActionPlugin`, он не доходит.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { Component, signal, type EventEmitter } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import type { TTabsOrientation } from '@soldy-ui/core'
import {
	SlotDirective,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/**
 * Строки показанных табов. Таб разметки, закрытый крестиком, уходит из
 * коллекции, и его корень прячется (`rendered = false`): элемент написал
 * потребитель, и убрать его компонент не может.
 */
const tabs = () =>
	[...document.querySelectorAll('[role="tab"]')].filter((row) => {
		const root = row.closest('.so-tabs-item')

		return !(root instanceof HTMLElement) || root.style.display !== 'none'
	})

/** Строка таба по тексту; нет её — тест падает здесь. */
function tab(text: string): HTMLElement {
	const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Элемент таба по тексту строки; нет его — тест падает здесь. */
function item(text: string): HTMLElement {
	const found = [...document.querySelectorAll('.so-tabs-item')].find(
		(candidate) => candidate.querySelector('[role="tab"]')?.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Кнопка закрытия таба; нет её — тест падает здесь. */
function closeOf(text: string): HTMLElement {
	return find(item(text), '.so-tabs-item__close', HTMLElement)
}

/** Показанные панели: неактивная панель — скрытый элемент потребителя. */
const panels = () =>
	[...document.querySelectorAll('.so-tabs__panel')].filter(
		(panel): panel is HTMLElement =>
			panel instanceof HTMLElement && panel.style.display !== 'none',
	)

/** Единственная показанная панель; их не одна — тест падает здесь. */
function panel(): HTMLElement {
	const shown = panels()

	if (shown.length !== 1) throw new Error(`показанных панелей ${shown.length}, а не одна`)

	return shown[0]
}

/** Корень набора в разметке хоста. */
const rootOf = (fixture: ComponentFixture<unknown>) => findIn(fixture, 'so-tabs', HTMLElement)

/** Список табов в корне: на нём набор `aria` набора и атрибуты потребителя. */
const listOf = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, 'so-tabs > .so-tabs__list', HTMLDivElement)

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** Фокус на узел: `TActionPlugin` пишет его в `focused` таба. */
function focus(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.focus()
	fixture.detectChanges()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(fixture: ComponentFixture<unknown>, target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/** Табы и панели из разметки — как `TabsContent.test.vue` у Vue. */
@Component({
	standalone: true,
	imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
	template: `<so-tabs>
		<so-tabs-item value="a" text="First" active />
		<so-tabs-item value="b" text="Second" />
		<div so-tabs-content slot="content" value="a">Панель A</div>
		<div so-tabs-content slot="content" value="b">Панель B</div>
	</so-tabs>`,
})
class Harness {}

const ITEMS = [
	{ value: 'a', text: 'A', _: { active: true } },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', () => {
		mountHost(Harness)

		expect(panel().textContent).toBe('Панель A')
	})

	it('переключение таба переключает панель', () => {
		const fixture = mountHost(Harness)

		click(fixture, tab('Second'))

		expect(panel().textContent).toBe('Панель B')
	})

	/** Неактивная панель скрыта, и её содержимого в документе нет. */
	it('скрытая панель — без содержимого', () => {
		mountHost(Harness)

		const hidden = [...document.querySelectorAll('.so-tabs__panel')].filter(
			(node) => node instanceof HTMLElement && node.style.display === 'none',
		)

		expect(hidden.map((node) => node.textContent)).toEqual([''])
	})

	it('панель лежит вне списка табов', () => {
		mountHost(Harness)

		// Попади она в основную проекцию, оказалась бы внутри [role=tablist]
		expect(document.querySelector('[role="tablist"] .so-tabs__panel')).toBeNull()
		expect(panels()).toHaveLength(1)
	})

	it('панель вне Tabs скрыта и пуста: таба, по которому её показывать, нет', () => {
		@Component({
			standalone: true,
			imports: [TTabsContentComponent],
			template: `<div so-tabs-content value="a">Панель A</div>`,
		})
		class AloneHost {}

		const fixture = mountHost(AloneHost)
		const alone = findIn(fixture, '[so-tabs-content]', HTMLDivElement)

		expect(alone.style.display).toBe('none')
		expect(alone.textContent).toBe('')
	})

	/**
	 * Таб, пришедший после панели, панель находит, когда он входит в
	 * коллекцию: на `item:added` она подписана с приёма своего контекста.
	 */
	it('таб, вошедший после панели, панель находит при его входе', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
			template: `<so-tabs>
				<so-tabs-item value="a" text="First" [active]="!withB()" />
				@if (withB()) {
					<so-tabs-item value="b" text="Second" active />
				}
				<div so-tabs-content slot="content" value="a">Панель A</div>
				<div so-tabs-content slot="content" value="b">Панель B</div>
			</so-tabs>`,
		})
		class LateHost {
			readonly withB = signal(false)
		}

		const fixture = mountHost(LateHost)

		expect(panel().textContent).toBe('Панель A')

		fixture.componentInstance.withB.set(true)
		fixture.detectChanges()

		expect(panel().textContent).toBe('Панель B')
		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('панель внутри [role=tablist] — предупреждение TTabsContentWarnPlugin', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
			template: `<so-tabs>
				<so-tabs-item value="a" text="First" active />
				<div so-tabs-content value="a">Панель A</div>
			</so-tabs>`,
		})
		class InsideHost {}

		mountHost(InsideHost)

		// Плагин смотрит узел по `ready`, то есть кадром позже
		await nextFrame()

		const warnings = warn.mock.calls
			.map(([message]) => String(message))
			.filter((text) => text.includes('Tabs.Content'))

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('[role="tablist"]')
	})

	it('панель в слоте content — без предупреждения', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mountHost(Harness)
		await nextFrame()

		expect(warn).not.toHaveBeenCalled()
	})
})

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой список,
 * его табы и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от своего
 * списка»). Держится это на разметке: список и панели — дети корня, табы —
 * дети списка.
 */
describe('разметка, на которую опирается тема', () => {
	/** Табы набора — дети списка, список и показанная панель — дети корня. */
	function expectOwnParts(root: HTMLElement, count: number): void {
		const list = find(root, ':scope > .so-tabs__list', HTMLElement)
		const tabItems = [...document.querySelectorAll('.so-tabs-item')]

		expect(panel().parentElement).toBe(root)
		expect(tabItems).toHaveLength(count)

		for (const tabItem of tabItems) expect(tabItem.parentElement).toBe(list)
	}

	it('табы разметки — дети списка, список и панель — дети корня', () => {
		const fixture = mountHost(Harness)

		expectOwnParts(rootOf(fixture), 2)
	})

	it('табы из items — дети списка, список и панель — дети корня', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsContentComponent],
			template: `<so-tabs [items]="items">
				<div so-tabs-content slot="content" value="a">Панель A</div>
			</so-tabs>`,
		})
		class ItemsHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(ItemsHost)

		expectOwnParts(rootOf(fixture), ITEMS.length)
	})
})

/**
 * Панель с `value` входом: так потребитель переносит её к другому табу. Табы
 * `a` (активен) и `b`, таба `z` нет. Смена `value` меняет у панели таб, и
 * показ обязан идти за новым табом сразу, а не со следующей активацией.
 */
describe('смена value у панели', () => {
	@Component({
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
		template: `<so-tabs>
			<so-tabs-item value="a" text="First" active />
			<so-tabs-item value="b" text="Second" />
			<div so-tabs-content slot="content" [value]="value()">Панель</div>
		</so-tabs>`,
	})
	class ValueHost {
		readonly value = signal('a')
	}

	function mountValue(value: string): ComponentFixture<ValueHost> {
		const fixture = mountHost(ValueHost)

		fixture.componentInstance.value.set(value)
		fixture.detectChanges()

		return fixture
	}

	it('к неактивному табу — панель прячется, его активация показывает её', () => {
		const fixture = mountValue('a')

		expect(panels()).toHaveLength(1)

		fixture.componentInstance.value.set('b')
		fixture.detectChanges()

		expect(panels()).toHaveLength(0)

		click(fixture, tab('Second'))

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', () => {
		const fixture = mountValue('a')

		fixture.componentInstance.value.set('z')
		fixture.detectChanges()

		expect(panels()).toHaveLength(0)

		// Прежний таб снова активен — панель уже не его
		click(fixture, tab('Second'))
		click(fixture, tab('First'))

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(panels()).toHaveLength(0)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', () => {
		const fixture = mountValue('z')

		expect(panels()).toHaveLength(0)

		fixture.componentInstance.value.set('a')
		fixture.detectChanges()

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', () => {
		mountHost(Harness)

		expect(tab('First').getAttribute('aria-controls')).toBe(panel().id)
	})

	it('aria-labelledby панели указывает на id таба', () => {
		mountHost(Harness)

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})

	it('панель объявлена как tabpanel', () => {
		mountHost(Harness)

		expect(panel().getAttribute('role')).toBe('tabpanel')
	})
})

describe('aria-selected', () => {
	it('находится на элементе с role="tab", а не на обёртке', () => {
		mountHost(Harness)

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(tab('Second').getAttribute('aria-selected')).toBe('false')
		expect(item('First').hasAttribute('aria-selected')).toBe(false)
	})

	it('следует за переключением таба', () => {
		const fixture = mountHost(Harness)

		click(fixture, tab('Second'))

		expect(tab('First').getAttribute('aria-selected')).toBe('false')
		expect(tab('Second').getAttribute('aria-selected')).toBe('true')
	})

	it('тема читает активность с корня таба: data-selected', () => {
		mountHost(Harness)

		expect(item('First').dataset['selected']).toBe('true')
		expect(item('Second').dataset['selected']).toBe('false')
		expect(tab('First').hasAttribute('data-selected')).toBe(false)
	})
})

describe('таб из разметки', () => {
	it('клик потребителя по табу не отменяет активацию', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs>
				<so-tabs-item value="a" text="A" active />
				<so-tabs-item value="b" text="B" (click)="clicks = clicks + 1" />
			</so-tabs>`,
		})
		class ClickHost {
			clicks = 0
		}

		const fixture = mountHost(ClickHost)

		click(fixture, tab('B'))

		expect(fixture.componentInstance.clicks).toBe(1)
		expect(tab('B').getAttribute('aria-selected')).toBe('true')
	})

	it('класс и стиль потребителя — корню таба, остальное — строке', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs>
				<so-tabs-item
					value="a"
					text="A"
					active
					class="mine"
					style="color: red"
					title="Раздел"
				/>
			</so-tabs>`,
		})
		class SplitHost {}

		mountHost(SplitHost)

		expect(item('A').classList.contains('mine')).toBe(true)
		expect(item('A').style.color).toBe('red')
		expect(tab('A').getAttribute('title')).toBe('Раздел')
		expect(tab('A').classList.contains('mine')).toBe(false)
	})

	it('default таба — шаблоном с text и active, без него — text', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent, SlotDirective],
			template: `<so-tabs>
				<so-tabs-item value="a" text="A" active>
					<ng-template slot="default" let-text="text" let-active="active"
						>{{ text }}:{{ active }}</ng-template
					>
				</so-tabs-item>
				<so-tabs-item value="b" text="B" />
			</so-tabs>`,
		})
		class DefaultHost {}

		const fixture = mountHost(DefaultHost)

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])

		click(fixture, tab('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])
	})

	it('слоты набора из items получают элемент через scope', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, SlotDirective],
			template: `<so-tabs [items]="items">
				<ng-template slot="leading"><i class="head">до</i></ng-template>
				<ng-template slot="trailing"><i class="tail">после</i></ng-template>
				<ng-template slot="item" let-item="item">[{{ item.text }}]</ng-template>
				<ng-template slot="item-leading" let-item="item"
					><u class="lead">{{ item.value }}</u></ng-template
				>
				<ng-template slot="item-trailing" let-item="item"
					><s class="trail">{{ item.value }}</s></ng-template
				>
			</so-tabs>`,
		})
		class RelayHost {
			readonly items = ITEMS.slice(0, 2)
		}

		mountHost(RelayHost)

		expect(tabs().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'[A]',
			'[B]',
		])
		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect(document.querySelector('.so-tabs__list--leading .head')?.textContent).toBe('до')
		expect(document.querySelector('.so-tabs__list--trailing .tail')?.textContent).toBe('после')
	})

	/**
	 * Проброс целиком: scope `item` — scope слота таба плюс сам таб. `text` и
	 * `active` держит таб, и активация доходит до шаблона.
	 */
	it('item получает text и active таба, active следует за активацией', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, SlotDirective],
			template: `<so-tabs [items]="items">
				<ng-template slot="item" let-item="item" let-text="text" let-active="active"
					>{{ item.value }}:{{ text }}:{{ active }}</ng-template
				>
			</so-tabs>`,
		})
		class ScopeHost {
			readonly items = ITEMS.slice(0, 2)
		}

		const fixture = mountHost(ScopeHost)

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['a:A:true', 'b:B:false'])

		click(fixture, tab('b:B:false'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:true'])
	})

	/**
	 * Шаблон непрозрачен: что он нарисовал, таб не видит, — и шаблон, заданный
	 * набору, рисуется у каждого таба вместо своей иконки, как сниппет у Svelte.
	 */
	it('item-close-icon задан — у каждого таба вместо своей иконки', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, SlotDirective],
			template: `<so-tabs closable [items]="items">
				<ng-template slot="item-close-icon" let-item="item">
					@if (item.value === 'a') {
						<b class="probe">×</b>
					}
				</ng-template>
			</so-tabs>`,
		})
		class CloseIconHost {
			readonly items = ITEMS.slice(0, 2)
		}

		mountHost(CloseIconHost)

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'empty'])
	})

	it('без leading и trailing обёрток краёв списка нет', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs [items]="items"></so-tabs>`,
		})
		class BareHost {
			readonly items = ITEMS
		}

		mountHost(BareHost)

		expect(document.querySelector('.so-tabs__list--leading')).toBeNull()
		expect(document.querySelector('.so-tabs__list--trailing')).toBeNull()
	})

	/** Атрибуты потребителя набора — на списке табов, а не на корне. */
	it('входы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs [items]="items" title="Разделы"></so-tabs>`,
		})
		class AttributesHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(AttributesHost)
		const root = rootOf(fixture)

		expect(root.hasAttribute('items')).toBe(false)
		expect(listOf(fixture).hasAttribute('items')).toBe(false)
		expect(root.hasAttribute('title')).toBe(false)
		expect(listOf(fixture).getAttribute('title')).toBe('Разделы')
	})

	/**
	 * Атрибуты потребителя делятся, как у поля: класс и стиль — корню,
	 * статические атрибуты разметки — списку табов, где роль `tablist`. Имя и
	 * `id` называют список, а не корень без роли; `dir` по `direction` — на
	 * корне.
	 */
	it('aria-label, id и data-* — на [role=tablist], не на корне; класс, стиль и dir ядра — на корне', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs
				[items]="items"
				direction="rtl"
				aria-label="Разделы"
				id="sections"
				data-testid="tabs"
				class="mine"
				style="color: red"
			></so-tabs>`,
		})
		class NameHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(NameHost)
		const root = rootOf(fixture)
		const list = findIn(fixture, '[role="tablist"]', HTMLDivElement)

		expect(list).toBe(listOf(fixture))
		expect(list.getAttribute('aria-label')).toBe('Разделы')
		expect(list.id).toBe('sections')
		expect(list.dataset['testid']).toBe('tabs')
		expect(
			['aria-label', 'id', 'data-testid'].filter((name) => root.hasAttribute(name)),
		).toEqual([])
		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(root.getAttribute('dir')).toBe('rtl')
		expect(list.classList.contains('mine')).toBe(false)
		expect(list.hasAttribute('dir')).toBe(false)
	})
})

describe('кнопка закрытия: разметка', () => {
	@Component({
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent],
		template: `<so-tabs closable>
			<so-tabs-item value="settings" text="Настройки" active />
			<so-tabs-item value="mail" text="Почта" />
		</so-tabs>`,
	})
	class ClosableHost {}

	it('у таба нет интерактивного потомка', () => {
		mountHost(ClosableHost)

		expect(tabs()).toHaveLength(2)

		for (const row of tabs()) {
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе таба сразу после строки', () => {
		mountHost(ClosableHost)

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe('tab')
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('so-tabs-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое таба не входит', () => {
		mountHost(ClosableHost)

		expect(tab('Настройки').textContent?.trim()).toBe('Настройки')
		expect(tab('Настройки').querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	/** Без шаблона `item-close-icon` таб из данных рисует свою иконку крестика. */
	it('табы из items без item-close-icon — своя иконка у каждого', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs closable [items]="items"></so-tabs>`,
		})
		class ItemsHost {
			readonly items = ITEMS
		}

		mountHost(ItemsHost)

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map(
				(close) => close.querySelector('svg[so-icon]') !== null,
			),
		).toEqual([true, true, true])
	})

	it('без closable кнопки нет, в элементе одна строка', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs><so-tabs-item value="a" text="A" active /></so-tabs>`,
		})
		class PlainHost {}

		mountHost(PlainHost)

		expect(document.querySelector('.so-tabs-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('шаблон close-icon подменяет иконку крестика', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent, SlotDirective],
			template: `<so-tabs closable>
				<so-tabs-item value="a" text="A" active>
					<ng-template slot="close-icon"><b class="custom">×</b></ng-template>
				</so-tabs-item>
			</so-tabs>`,
		})
		class CloseIconHost {}

		mountHost(CloseIconHost)

		expect(closeOf('A').querySelector('.custom')).not.toBeNull()
		expect(closeOf('A').querySelector('svg')).toBeNull()
		// Шаблон слота — не содержимое строки: текст таба на месте
		expect(tab('A').textContent?.trim()).toBe('A')
	})
})

describe('кнопка закрытия: поведение', () => {
	it('клик закрывает таб и не активирует его', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs closable [items]="items"></so-tabs>`,
		})
		class ItemsHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(ItemsHost)

		click(fixture, closeOf('B'))

		// Если бы клик сначала активировал «B», закрытие активного таба отдало
		// бы активность соседу — «C»
		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(tab('A').getAttribute('aria-selected')).toBe('true')
	})

	/**
	 * Нажатие по крестику — не нажатие по табу и не по набору: корни обоих
	 * слушают нативный клик (`TActionPlugin`), и всплывший до них клик дал бы
	 * им `action:press`.
	 */
	it('клик по крестику не даёт actionPress ни табу, ни набору', async () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs closable (soActionPress)="setPresses = setPresses + 1">
				<so-tabs-item value="a" text="A" active />
				<so-tabs-item value="b" text="B" (soActionPress)="tabPresses = tabPresses + 1" />
			</so-tabs>`,
		})
		class PressHost {
			setPresses = 0
			tabPresses = 0
		}

		const fixture = mountHost(PressHost)

		// Слушатели корней `TActionPlugin` вешает кадром позже, по `ready`
		await nextFrame()

		const closed = item('B')

		click(fixture, closeOf('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A'])
		expect(closed.style.display).toBe('none')
		expect(fixture.componentInstance.tabPresses).toBe(0)
		expect(fixture.componentInstance.setPresses).toBe(0)

		// Клик по строке до корней доходит: слушатели на месте
		click(fixture, tab('A'))

		expect(fixture.componentInstance.setPresses).toBe(1)
	})

	it('размер кнопки — размер таба: от него считается кегль иконки', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs closable size="lg">
				<so-tabs-item value="a" text="A" active />
			</so-tabs>`,
		})
		class SizeHost {}

		mountHost(SizeHost)

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` таба трёхзначен: `undefined` значит «как у набора». Снятый
	 * вход обязан вернуть таб к значению набора.
	 */
	it('false у таба прячет кнопку, снятие возвращает её от набора', () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent, TTabsItemComponent],
			template: `<so-tabs closable>
				<so-tabs-item value="a" text="A" active [closable]="own()" />
			</so-tabs>`,
		})
		class OwnHost {
			readonly own = signal<boolean | undefined>(false)
		}

		const fixture = mountHost(OwnHost)

		expect(item('A').querySelector('.so-tabs-item__close')).toBeNull()

		fixture.componentInstance.own.set(undefined)
		fixture.detectChanges()

		expect(item('A').querySelector('.so-tabs-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный таб не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного таба кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — сигналом `tabOff`, весь набор — `setOff`. */
	@Component({
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent],
		template: `<so-tabs closable [disabled]="setOff()">
			<so-tabs-item value="a" text="A" active />
			<so-tabs-item value="b" text="B" disabled />
			<so-tabs-item value="c" text="C" [disabled]="tabOff()" />
		</so-tabs>`,
	})
	class DisabledHost {
		readonly tabOff = signal(false)
		readonly setOff = signal(false)
	}

	/** Табы, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tabs-item__close'))

	it('выключенный со старта', () => {
		mountHost(DisabledHost)

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const fixture = mountHost(DisabledHost)

		fixture.componentInstance.tabOff.set(true)
		fixture.detectChanges()

		expect(withClose()).toEqual(['A'])

		fixture.componentInstance.tabOff.set(false)
		fixture.detectChanges()

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного таба, включили — вернулись', () => {
		const fixture = mountHost(DisabledHost)

		fixture.componentInstance.setOff.set(true)
		fixture.detectChanges()

		expect(withClose()).toEqual([])

		fixture.componentInstance.setOff.set(false)
		fixture.detectChanges()

		// `disabled` набора распространяется на всех: включение включает и «B»
		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

describe('клавиатура', () => {
	@Component({
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent],
		template: `<so-tabs
			[closable]="closable()"
			[orientation]="orientation()"
			aria_label="Разделы"
		>
			<so-tabs-item value="a" text="A" />
			<so-tabs-item value="b" text="B" active />
			<so-tabs-item value="c" text="C" />
		</so-tabs>`,
	})
	class AbcHost {
		readonly closable = signal(false)
		readonly orientation = signal<TTabsOrientation>('horizontal')
	}

	it('tabindex="0" ровно у одного таба — у активного', () => {
		mountHost(AbcHost)

		const stops = document.querySelectorAll('[role="tab"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(tab('B'))
		expect(tab('A').getAttribute('tabindex')).toBe('-1')
		expect(tab('C').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка закрытия — не остановка Tab', () => {
		const fixture = mountHost(AbcHost)

		fixture.componentInstance.closable.set(true)
		fixture.detectChanges()

		const closes = [...document.querySelectorAll('.so-tabs-item__close')]

		expect(closes).toHaveLength(3)
		expect(closes.every((close) => close.getAttribute('tabindex') === '-1')).toBe(true)
	})

	it('tablist объявляет ориентацию и имя из aria_label', () => {
		const fixture = mountHost(AbcHost)

		fixture.componentInstance.orientation.set('vertical')
		fixture.detectChanges()

		const list = document.querySelector('.so-tabs__list')

		expect(list?.getAttribute('role')).toBe('tablist')
		expect(list?.getAttribute('aria-orientation')).toBe('vertical')
		expect(list?.getAttribute('aria-label')).toBe('Разделы')
	})

	it('корень ARIA списка не получает — рядом со списком лежат панели', () => {
		const root = rootOf(mountHost(AbcHost))

		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
	})

	it('→ переносит фокус на строку следующего таба и активирует его', async () => {
		const fixture = mountHost(AbcHost)

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		focus(fixture, tab('B'))
		press(fixture, tab('B'), 'ArrowRight')

		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
		expect(tab('B').getAttribute('aria-selected')).toBe('false')
		expect(tab('C').getAttribute('tabindex')).toBe('0')
		expect(tab('B').getAttribute('tabindex')).toBe('-1')
	})

	it('Delete закрывает таб, фокус остаётся в списке — на соседе', async () => {
		@Component({
			standalone: true,
			imports: [TTabsComponent],
			template: `<so-tabs closable [items]="items"></so-tabs>`,
		})
		class DeleteHost {
			readonly items = [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', _: { active: true } },
				{ value: 'c', text: 'C' },
			]
		}

		const fixture = mountHost(DeleteHost)

		await nextFrame()

		focus(fixture, tab('B'))
		press(fixture, tab('B'), 'Delete')

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
	})
})

describe('типы', () => {
	it('выходы фасадов — выходы компонентов', () => {
		expectTypeOf<TTabsComponent>().toHaveProperty('soItemActivated')
		expectTypeOf<TTabsComponent>().toHaveProperty('soItemClose')
		expectTypeOf<TTabsComponent>().toHaveProperty('soEngineCreate')
		expectTypeOf<TTabsItemComponent['soChangeActive']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
		expectTypeOf<TTabsItemComponent['soChangeOrder']>().toEqualTypeOf<EventEmitter<undefined>>()
		expectTypeOf<TTabsContentComponent['soChangeActive']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
	})

	/**
	 * `change:closable` есть и у таба, и у его фасада: выход один, с типом
	 * события таба.
	 */
	it('одноимённый выход таба и фасада — один, по дескриптору таба', () => {
		expectTypeOf<TTabsItemComponent['soChangeClosable']>().toEqualTypeOf<
			EventEmitter<boolean | undefined>
		>()
	})

	it('вход active таба — булев', () => {
		expectTypeOf<TTabsItemComponent['active']>().toEqualTypeOf<boolean | undefined>()
	})
})
