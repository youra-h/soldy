/**
 * DragAndDrop под Angular — перестановка элементов Tabs, ListBox и Accordion
 * жестом.
 *
 * Своего узла у обёртки нет: корня у компонента нет, он директива и пишется
 * атрибутом на `<ng-container>` (`<ng-container so-drag-and-drop>`), а на месте
 * контейнера Angular ставит только комментарий-якорь. Экземпляр обёртки
 * подхватывают коллекции внутри (`TDragAndDropCollectionExtension`)
 * и включают им плагин перетаскивания — узлы их элементов становятся
 * `draggable`, а жест — командой обёртки. События перестановки компонент
 * отдаёт выходами (`(soMoveBefore)`, `(soMove)`), и отмена в обработчике
 * оставляет элемент на месте. Список в секции Accordion перестановку не
 * наследует: коллекция опускает своему поддереву пустое. Сценарии — те же, что
 * у Vue и React (`ui/vue/__tests__/drag-and-drop.spec.ts`,
 * `ui/react/__tests__/drag-and-drop.spec.tsx`); сервер и гидратация —
 * `collections.server.spec.ts`.
 *
 * Своё у Angular — слой лифта DI: обёртка отдаёт его поддереву провайдером
 * директивы — инжектор у `<ng-container>` свой, — и экземпляр обёртки
 * коллекция читает из слоя, внутри которого её написали.
 * Обработчики выходов у хостов — точного типа: шаблон хоста проверяет `ngc`
 * («Типы — Angular»), и `$event` другого типа его не пройдёт. Хосты, чьи
 * шаблоны различаются только тегом, — со своими селекторами: без них Angular
 * счёл бы их одним компонентом (NG0912).
 *
 * `DragEvent` в jsdom нет — жест подаётся событиями с теми же именами. Правила
 * команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, настоящее
 * перетаскивание в браузере — `playground/vue/browser/drag-and-drop.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { Component } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import type { IDragAndDropMove, TDragAndDropMoveEvent } from '@soldy-ui/core'
import {
	TAccordionComponent,
	TAccordionItemComponent,
	TDragAndDropComponent,
	TListBoxComponent,
	TTabsComponent,
	TTabsItemComponent,
} from '@soldy-ui/angular'
import { mountHost, nextFrame } from './mount'

const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: value.toUpperCase() }))

/** Три коллекции: табы и секции — разметкой, список — данными. */
const COLLECTIONS = `
	<div so-tabs>
		<div so-tabs-item value="a" text="A" active></div>
		<div so-tabs-item value="b" text="B"></div>
		<div so-tabs-item value="c" text="C"></div>
	</div>
	<div so-list-box [items]="items" aria_label="Пункты"></div>
	<div so-accordion>
		<div so-accordion-item value="a" text="A">Содержимое A</div>
		<div so-accordion-item value="b" text="B">Содержимое B</div>
		<div so-accordion-item value="c" text="C">Содержимое C</div>
	</div>
`

/** Компоненты трёх коллекций — разметки `COLLECTIONS`. */
const COLLECTION_IMPORTS = [
	TTabsComponent,
	TTabsItemComponent,
	TListBoxComponent,
	TAccordionComponent,
	TAccordionItemComponent,
]

/** Узлы элементов коллекции по классу корня элемента. */
const nodes = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

/** Перетаскиваемость узлов элементов: `draggable` каждого. */
const draggable = (selector: string) =>
	nodes(selector).map((node) => node.getAttribute('draggable'))

/**
 * Тексты строк элементов списка — в порядке на экране: элементы стоят флексом
 * по месту в составе (`order`).
 */
function screenOrder(): string[] {
	return nodes('.so-list-box-item')
		.map((node) => ({ text: node.textContent?.trim() ?? '', order: Number(node.style.order) }))
		.sort((first, second) => first.order - second.order)
		.map(({ text }) => text)
}

/** Событие жеста на узле — всплывает и отменяется, как у браузера. */
function fire(fixture: ComponentFixture<unknown>, node: Element, type: string): void {
	node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/** Перетащить элемент списка на место другого: взяли, понесли над ним, отпустили. */
async function dragOnto(fixture: ComponentFixture<unknown>, from: number, to: number) {
	const items = nodes('.so-list-box-item')

	fire(fixture, items[from], 'dragstart')
	fire(fixture, items[to], 'dragover')
	fire(fixture, items[to], 'drop')
	fire(fixture, items[from], 'dragend')

	await settle(fixture)
}

/** Кадр и проверка: узлы плагинам — через кадр, их правки — в следующую проверку. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
	await nextFrame()
	fixture.detectChanges()
}

/** Места перестановок: до неё и после. */
const places = (events: readonly IDragAndDropMove[]) =>
	events.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])

@Component({
	selector: 'probe-wrapped',
	standalone: true,
	imports: [TDragAndDropComponent, ...COLLECTION_IMPORTS],
	template: `<ng-container so-drag-and-drop>${COLLECTIONS}</ng-container>`,
})
class WrappedHost {
	readonly items = ITEMS
}

@Component({
	selector: 'probe-bare',
	standalone: true,
	imports: COLLECTION_IMPORTS,
	template: `<div>${COLLECTIONS}</div>`,
})
class BareHost {
	readonly items = ITEMS
}

describe('DragAndDrop: коллекции внутри', () => {
	it('элементы Tabs, ListBox и Accordion в обёртке — перетаскиваемые', async () => {
		const fixture = mountHost(WrappedHost)

		// Узлы элементов плагин узнаёт по `ready` — через кадр
		await settle(fixture)

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	it('без обёртки элементы не перетаскиваются', async () => {
		const fixture = mountHost(BareHost)

		await settle(fixture)

		expect(draggable('.so-tabs-item')).toEqual([null, null, null])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
		expect(draggable('.so-accordion-item')).toEqual([null, null, null])
	})

	@Component({
		standalone: true,
		imports: [
			TDragAndDropComponent,
			TAccordionComponent,
			TAccordionItemComponent,
			TListBoxComponent,
		],
		template: `<ng-container so-drag-and-drop>
			<div so-accordion>
				<div so-accordion-item value="a" text="A">
					<div so-list-box [items]="items" aria_label="Пункты"></div>
				</div>
			</div>
		</ng-container>`,
	})
	class NestedHost {
		readonly items = ITEMS
	}

	/**
	 * Список в секции читает слой лифта той секции, в чьём содержимом его
	 * написали: DI идёт по дереву объявлений. Секция опустила в свой слой
	 * пустое, и перестановки у списка нет.
	 */
	it('список в секции Accordion перестановку не наследует', async () => {
		const fixture = mountHost(NestedHost)

		await settle(fixture)

		expect(draggable('.so-accordion-item')).toEqual(['true'])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
	})

	/**
	 * Своего узла у обёртки нет: директиву пишут на `<ng-container>`, на его
	 * месте Angular ставит только комментарий-якорь, и коллекции стоят прямо в
	 * разметке хоста, как без обёртки, — раскладка вокруг них та же.
	 */
	it('своего узла у обёртки нет: коллекции — прямо в разметке хоста', () => {
		const fixture = mountHost(WrappedHost)
		const host: HTMLElement = fixture.nativeElement

		// Компонент — по метке селектора на элементе
		const marker = (child: Element) =>
			child.getAttributeNames().find((name) => name.startsWith('so-'))
		const component = (child: Element) => `${child.localName}[${marker(child)}]`

		expect([...host.children].map(component)).toEqual([
			'div[so-tabs]',
			'div[so-list-box]',
			'div[so-accordion]',
		])
		expect(host.querySelector('[so-drag-and-drop]')).toBe(null)
	})
})

/**
 * Хост событий: список в обёртке, обработчики выходов — точного типа, как их
 * пишет потребитель со строгим шаблоном. `cancel` отменяет перестановку в
 * обработчике «до».
 */
@Component({
	selector: 'probe-events',
	standalone: true,
	imports: [TDragAndDropComponent, TListBoxComponent],
	template: `<ng-container
		so-drag-and-drop
		(soMoveBefore)="onMoveBefore($event)"
		(soMove)="onMove($event)"
	>
		<div so-list-box [items]="items" aria_label="Пункты"></div>
	</ng-container>`,
})
class EventsHost {
	readonly items = ITEMS
	readonly before: TDragAndDropMoveEvent[] = []
	readonly moved: IDragAndDropMove[] = []
	cancel = false

	onMoveBefore(e: TDragAndDropMoveEvent): void {
		this.before.push(e)

		if (this.cancel) e.preventDefault()
	}

	onMove(e: IDragAndDropMove): void {
		this.moved.push(e)
	}
}

describe('DragAndDrop: события перестановки', () => {
	it('жест переставляет элемент: (soMoveBefore), затем (soMove) — с местом, где он встал', async () => {
		const fixture = mountHost(EventsHost)
		const { before, moved } = fixture.componentInstance

		await settle(fixture)
		await dragOnto(fixture, 0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(places(before)).toEqual([[0, 2]])
		expect(places(moved)).toEqual([[0, 2]])
		expect(moved[0].item).toBe(before[0].item)
		expect(moved[0].engine).toBe(before[0].engine)
	})

	it('preventDefault() в обработчике (soMoveBefore) оставляет элемент на месте', async () => {
		const fixture = mountHost(EventsHost)

		fixture.componentInstance.cancel = true

		await settle(fixture)
		await dragOnto(fixture, 0, 2)

		expect(screenOrder()).toEqual(['A', 'B', 'C'])
		expect(places(fixture.componentInstance.before)).toEqual([[0, 2]])
		expect(fixture.componentInstance.moved).toEqual([])
	})
})
