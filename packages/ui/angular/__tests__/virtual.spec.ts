/**
 * Virtual под Angular — окно над ListBox на настоящей разметке.
 *
 * Своего узла у окна нет: корня у компонента нет, он директива и пишется
 * атрибутом на `<ng-container>` (`<ng-container so-virtual>`), а на месте
 * контейнера Angular ставит только комментарий-якорь. Окно подхватывает
 * коллекция внутри (`TVirtualCollectionExtension`), и список
 * рисует только видимые элементы, а на месте остальных — распорки под
 * `aria-hidden`. Что попадает в окно, решает ядро
 * (`core/__tests__/collection.draw.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и замер
 * здесь подаётся рисованию движка снаружи руками. Сценарии — те же, что у Vue
 * и React (`ui/vue/__tests__/virtual.spec.ts`,
 * `ui/react/__tests__/virtual.spec.tsx`); окно таблицы — «окно» в
 * `table.spec.ts`, сервер и гидратация — `collections.server.spec.ts`.
 *
 * Своё у Angular — слой лифта DI: окно отдаёт его поддереву провайдером
 * директивы — инжектор у `<ng-container>` свой, — и подключение к окну список
 * читает из слоя, внутри которого его написали.
 * Сборка одна, в `ngOnInit`, и пересборки вслед за обёрткой, как у React, нет:
 * вместо StrictMode — снятие списка и снятие обёртки вместе с ним снимают окно
 * с движка снаружи.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { createEngineListBox } from '@soldy-ui/core'
import type { TListBoxCollection } from '@soldy-ui/core'
import { SlotDirective, TListBoxComponent, TVirtualComponent } from '@soldy-ui/angular'
import { mountHost, nextFrame } from './mount'

/** `count` элементов: значение `v1`… и текст. */
function items(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

/** Движок списка снаружи — тест подаёт ему замер. */
function engineOf(count: number): TListBoxCollection {
	return createEngineListBox({ items: items(count) })
}

/** Замер, как его подаёт плагин окна: полоса от верха списка и шаг элементов. */
function measure(
	fixture: ComponentFixture<unknown>,
	engine: TListBoxCollection,
	top: number,
	bottom: number,
	step = 30,
): void {
	engine.extensions.draw.notifyViewport({ top, bottom, step })
	fixture.detectChanges()
}

const options = (root: ParentNode = document) => [...root.querySelectorAll('.so-list-box-item')]

const fillers = (root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>('.so-list-box__filler'),
]

/** Элемент по тексту, если он в документе. */
function optionOf(text: string): HTMLElement | undefined {
	return options().find(
		(node): node is HTMLElement =>
			node instanceof HTMLElement && node.textContent?.trim() === text,
	)
}

/** Строка элемента: на ней набор `aria` элемента и его `dataset`. */
function optionRow(text: string): HTMLElement {
	const row = optionOf(text)?.querySelector(':scope > .so-button')

	if (!(row instanceof HTMLElement)) throw new Error(`${text}: строки нет`)

	return row
}

/**
 * Узел списка в корне ListBox — в нём элементы и распорки, на нём остановка
 * Tab, и клавиши список берёт с него.
 */
function listRoot(): HTMLElement {
	const root = document.querySelector('.so-list-box > .so-list-box__list')

	if (!(root instanceof HTMLElement)) throw new Error('списка нет')

	return root
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(fixture: ComponentFixture<unknown>, target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/**
 * Хост над движком снаружи. Движок список берёт при сборке, поэтому тест
 * кладёт его в сигнал до первой проверки (`mountEngine`).
 */
abstract class TEngineHost {
	readonly engine = signal<TListBoxCollection | undefined>(undefined)
}

@Component({
	standalone: true,
	imports: [TListBoxComponent, TVirtualComponent],
	template: `<ng-container so-virtual><div so-list-box [engine]="engine()"></div></ng-container>`,
})
class WindowHost extends TEngineHost {}

/** Смонтировать хост над движком `engine`. */
function mountEngine<T extends TEngineHost>(
	host: new () => T,
	engine: TListBoxCollection,
): ComponentFixture<T> {
	const fixture = TestBed.createComponent(host)

	fixture.componentInstance.engine.set(engine)
	fixture.detectChanges()

	return fixture
}

describe('ListBox в окне', () => {
	@Component({
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div so-list-box [items]="items"></div>`,
	})
	class BareHost {
		readonly items = items(80)
	}

	it('без обёртки — все элементы, распорок нет', () => {
		mountHost(BareHost)

		expect(options()).toHaveLength(80)
		expect(fillers()).toEqual([])
	})

	@Component({
		standalone: true,
		imports: [TListBoxComponent, TVirtualComponent],
		template: `<ng-container so-virtual><div so-list-box [items]="items"></div></ng-container>`,
	})
	class WrappedHost {
		readonly items = items(80)
	}

	it('в окне — до замера первые 50, без распорок', () => {
		mountHost(WrappedHost)

		expect(options()).toHaveLength(50)
		expect(fillers()).toEqual([])
	})

	/**
	 * Своего узла у окна нет: директиву пишут на `<ng-container>`, на его месте
	 * Angular ставит только комментарий-якорь, и список стоит прямо в разметке
	 * хоста, как без окна, — раскладка вокруг него та же.
	 */
	it('своего узла у окна нет: список — прямо в разметке хоста', () => {
		const fixture = mountHost(WrappedHost)
		const host: HTMLElement = fixture.nativeElement

		expect([...host.children].map((child) => child.className)).toEqual([
			expect.stringContaining('so-list-box'),
		])
		expect(host.querySelector('[so-virtual]')).toBe(null)
	})

	it('по замеру — распорки на месте пропущенных: скрыты, высотой в элементы, на своём месте', () => {
		const engine = engineOf(200)
		const fixture = mountEngine(WindowHost, engine)

		// Видны места 100–109: с запасом — 90–119
		measure(fixture, engine, 3000, 3300)

		const root = listRoot()

		expect(fillers(root).map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		expect(
			fillers(root).map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual(['2700px', '2400px'])
		// Место в составе — перед элементом 91 и за последним
		expect(fillers(root).map((filler) => filler.style.order)).toEqual(['90', '200'])
		expect(root.firstElementChild).toBe(fillers(root)[0])
		expect(root.lastElementChild).toBe(fillers(root)[1])
		expect(options(root)).toHaveLength(30)
	})

	it('нарисованным — размер набора и место в нём', () => {
		const engine = engineOf(200)
		const fixture = mountEngine(WindowHost, engine)

		measure(fixture, engine, 3000, 3300)

		const row = optionRow('Пункт 91')

		expect(row.getAttribute('aria-setsize')).toBe('200')
		expect(row.getAttribute('aria-posinset')).toBe('91')
	})

	@Component({
		standalone: true,
		imports: [TListBoxComponent, TVirtualComponent],
		template: `<ng-container so-virtual [enabled]="enabled()"
			><div so-list-box [items]="items"></div
		></ng-container>`,
	})
	class SwitchHost {
		readonly items = items(80)
		readonly enabled = signal(false)
	}

	it('`enabled` выключает и включает окно на лету', () => {
		const fixture = mountHost(SwitchHost)

		expect(options()).toHaveLength(80)
		expect(optionRow('Пункт 1').hasAttribute('aria-posinset')).toBe(false)

		fixture.componentInstance.enabled.set(true)
		fixture.detectChanges()

		expect(options()).toHaveLength(50)
		expect(optionRow('Пункт 1').getAttribute('aria-posinset')).toBe('1')

		fixture.componentInstance.enabled.set(false)
		fixture.detectChanges()

		expect(options()).toHaveLength(80)
	})

	@Component({
		standalone: true,
		imports: [TListBoxComponent, TVirtualComponent, SlotDirective],
		template: `<ng-container so-virtual>
			<div so-list-box class="outer" [items]="outer">
				<ng-template slot="item" let-item="item">
					@if (item.value === 'v1') {
						<div so-list-box class="inner" [items]="inner"></div>
					} @else {
						{{ item.text }}
					}
				</ng-template>
			</div>
		</ng-container>`,
	})
	class NestedHost {
		readonly outer = items(60)
		readonly inner = items(55)
	}

	/**
	 * Список в шаблоне элемента читает слой лифта того списка, в чьём
	 * содержимом шаблон написан: DI идёт по дереву объявлений. Внешний список
	 * опустил в свой слой пустое подключение, и окна у вложенного нет.
	 */
	it('список в слоте элемента окна не наследует', () => {
		mountHost(NestedHost)

		const inner = document.querySelector('.inner')

		if (!inner) throw new Error('вложенного списка нет')

		expect(options(inner)).toHaveLength(55)
		// У внешнего — окно: 50 своих элементов и 55 вложенного внутри первого
		expect(options(document.querySelector('.outer') ?? document)).toHaveLength(50 + 55)
	})
})

describe('ListBox в окне — цикл Angular', () => {
	/**
	 * Элементы и распорки — одной петлёй с ключом записи: элемент, который
	 * остался в окне, Angular не пересоздаёт, хотя распорка перед ним сменилась.
	 */
	it('сдвиг окна не перемонтирует оставшийся элемент — тот же узел', () => {
		const engine = engineOf(200)
		const fixture = mountEngine(WindowHost, engine)

		measure(fixture, engine, 3000, 3300)

		const kept = optionOf('Пункт 101')

		// Окно ушло на десять мест вниз: места 100–129
		measure(fixture, engine, 3300, 3600)

		expect(optionOf('Пункт 91')).toBeUndefined()
		expect(optionOf('Пункт 130')).toBeDefined()
		expect(kept).toBeDefined()
		expect(optionOf('Пункт 101')).toBe(kept)
	})

	@Component({
		standalone: true,
		imports: [TListBoxComponent, TVirtualComponent],
		template: `<ng-container so-virtual [enabled]="enabled()">
			@if (listed()) {
				<div so-list-box [engine]="engine()"></div>
			}
		</ng-container>`,
	})
	class ListedHost extends TEngineHost {
		readonly enabled = signal(true)
		readonly listed = signal(true)
	}

	/**
	 * Движок снаружи живёт дольше монтирования: снятый список снимает окно с
	 * его рисования и отписывается от окна — выключатель живого окна до движка
	 * больше не доходит.
	 */
	it('снятие списка снимает окно с движка снаружи; выключатель его больше не трогает', () => {
		const engine = engineOf(80)
		const fixture = mountEngine(ListedHost, engine)

		expect(options()).toHaveLength(50)
		expect(engine.extensions.draw.virtual).toBe(true)

		fixture.componentInstance.listed.set(false)
		fixture.detectChanges()

		expect(options()).toEqual([])
		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)

		fixture.componentInstance.enabled.set(false)
		fixture.detectChanges()
		fixture.componentInstance.enabled.set(true)
		fixture.detectChanges()

		expect(engine.extensions.draw.virtual).toBe(false)
	})

	it('снятие обёртки вместе со списком снимает окно с движка снаружи', () => {
		const engine = engineOf(80)
		const fixture = mountEngine(WindowHost, engine)

		expect(engine.extensions.draw.virtual).toBe(true)

		fixture.destroy()

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)
	})

	/**
	 * Стрелка уводит подсветку к элементу, которого не было в документе:
	 * навигация закрепляет его в окне, окно его дорисовывает, а отметку
	 * навигация возвращает ему, когда его набор регистрируется в коллекции, — у
	 * Angular это сборка элемента в `ngOnInit`.
	 */
	it('↑ с первого элемента — последний нарисован и отмечен подсветкой', async () => {
		const engine = engineOf(200)
		const fixture = mountEngine(WindowHost, engine)

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		// Видны места 0–9: с запасом — 0–19, последнего элемента в документе нет
		measure(fixture, engine, 0, 300)

		expect(optionOf('Пункт 200')).toBeUndefined()

		press(fixture, listRoot(), 'ArrowDown')

		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('true')

		press(fixture, listRoot(), 'ArrowUp')

		expect(optionRow('Пункт 200').getAttribute('data-highlighted')).toBe('true')
		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('false')
		// Между окном и последним — распорка на пропущенные
		expect(
			fillers().map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual([`${179 * 30}px`])
	})
})
