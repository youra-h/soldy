/**
 * Элемент коллекции под Angular: лифт и момент входа.
 *
 * Лифт Angular — слой DI на владельца: владелец подключает его провайдером
 * (`provideElevator()` в `providers`), его сборка пишет в свой слой движок и
 * регистратор (`down()`), а элемент читает слой над собой (`up()`). DI идёт по
 * дереву объявлений: слой владельца видят и элементы разметки — его
 * содержимое, — и элементы из данных в его шаблоне, а соседям и предкам он не
 * виден. Своё значение слой кладёт поверх слоя предка.
 *
 * В коллекцию элемент входит в своём `ngOnInit` — когда его контекст принят
 * (`attach` в связке). Angular зовёт хуки в порядке шаблона: владелец собран
 * раньше своих элементов, и элементы разметки входят в коллекцию в порядке
 * DOM. Пересборки компонента у Angular нет: он собирается один раз, как у Vue
 * и Svelte. Владелец, снятый и собранный заново (`@if`), — новый движок, и его
 * элементы собираются вслед за ним.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import type { IElevatorKey } from '@soldy-ui/setup'
import {
	AngularElevatorFactory,
	TAccordionComponent,
	TAccordionItemComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
	provideElevator,
} from '@soldy-ui/angular'
import { mountHost } from './mount'

/** Движок так, как его видит тест: состав элементов по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

/** Значения элементов движка по порядку. */
const valuesOf = (engine: TEngineView | undefined) => {
	if (!engine) throw new Error('владелец не объявил движок')

	return engine.extensions.batch.items.map((item) => Reflect.get(item, 'value'))
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
const flush = (): Promise<void> => Promise.resolve()

const rows = () => [...document.querySelectorAll('.so-list-box-item .so-button')]

function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** Ключ лифта для проб слоя. */
const PROBE: IElevatorKey<string | null> = { name: 'test:probe' }

/** Владелец, который опускает в свой слой `'outer'`. */
@Component({
	selector: 'probe-outer',
	standalone: true,
	providers: [provideElevator()],
	template: '<ng-content />',
})
class ProbeOuter {
	constructor() {
		AngularElevatorFactory(PROBE).down('outer')
	}
}

/** Владелец, который читает слой над собой и опускает своему поддереву `null`. */
@Component({
	selector: 'probe-cutter',
	standalone: true,
	providers: [provideElevator()],
	template: '<ng-content />',
})
class ProbeCutter {
	readonly above: unknown

	constructor() {
		const elevator = AngularElevatorFactory(PROBE)

		this.above = elevator.up()
		elevator.down(null)
	}
}

/** Читатель: что лифт отдаёт ему из слоя над ним. */
@Component({ selector: 'probe-reader', standalone: true, template: '' })
class ProbeReader {
	readonly seen = AngularElevatorFactory(PROBE).up()
}

/** Компонент без своего слоя, который пытается опустить значение. */
@Component({ selector: 'probe-orphan', standalone: true, template: '' })
class ProbeOrphan {
	constructor() {
		AngularElevatorFactory(PROBE).down('lost')
	}
}

describe('слой лифта', () => {
	@Component({
		standalone: true,
		imports: [ProbeOuter, ProbeCutter, ProbeReader],
		template: `<probe-outer>
				<probe-reader />
				<probe-cutter><probe-reader /></probe-cutter>
			</probe-outer>
			<probe-reader />`,
	})
	class LayersHost {}

	/** Читатели хоста в порядке разметки. */
	const readers = (fixture: ComponentFixture<unknown>) =>
		fixture.debugElement
			.queryAll((node) => node.componentInstance instanceof ProbeReader)
			.map((node) => {
				const reader: unknown = node.componentInstance

				return reader instanceof ProbeReader ? reader.seen : 'не читатель'
			})

	it('up читает слой владельца выше, своё опущенное владелец не видит', () => {
		const fixture = mountHost(LayersHost)
		const cutter: unknown = fixture.debugElement.query(
			(node) => node.componentInstance instanceof ProbeCutter,
		).componentInstance

		expect(cutter instanceof ProbeCutter ? cutter.above : 'не нашли').toBe('outer')
		expect(readers(fixture)).toEqual(['outer', null, undefined])
	})

	/** Слой предка за опущенным `null` уже не читается: им окно отрезают от вложенных списков. */
	it('опущенный null — тоже значение: слой предка за ним не читается', () => {
		const fixture = mountHost(LayersHost)

		expect(readers(fixture)[1]).toBeNull()
	})

	it('down без своего слоя — ошибка, а не запись в слой предка', () => {
		@Component({
			standalone: true,
			imports: [ProbeOuter, ProbeOrphan],
			template: `<probe-outer><probe-orphan /></probe-outer>`,
		})
		class OrphanHost {}

		expect(() => TestBed.createComponent(OrphanHost)).toThrow(/provideElevator/)
	})
})

describe('лифт', () => {
	@Component({
		standalone: true,
		imports: [TListBoxComponent, TListBoxItemComponent],
		template: `<so-list-box-item value="z" text="Z" />
			<so-list-box (soEngineCreate)="engines.push($event)">
				<so-list-box-item value="a" text="A" />
			</so-list-box>`,
	})
	class OutsideHost {
		readonly engines: TEngineView[] = []
	}

	it('элемент вне списка никуда не входит и рисуется без коллекции', async () => {
		const fixture = mountHost(OutsideHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a'])
		// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
		expect(rowOf('Z').hasAttribute('aria-selected')).toBe(false)

		click(fixture, rowOf('Z'))

		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a'])
	})

	/** Соседние владельцы не видят движков друг друга: слой у каждого свой. */
	it('два списка рядом: у каждого свои элементы', async () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<so-list-box (soEngineCreate)="left = $event">
					<so-list-box-item value="a" text="A" />
					<so-list-box-item value="b" text="B" />
				</so-list-box>
				<so-list-box (soEngineCreate)="right = $event">
					<so-list-box-item value="x" text="X" />
					<so-list-box-item value="y" text="Y" />
					<so-list-box-item value="z" text="Z" />
				</so-list-box>`,
		})
		class SiblingsHost {
			left: TEngineView | undefined
			right: TEngineView | undefined
		}

		const fixture = mountHost(SiblingsHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.left)).toEqual(['a', 'b'])
		expect(valuesOf(fixture.componentInstance.right)).toEqual(['x', 'y', 'z'])
	})

	/**
	 * Список внутри элемента опускает свой слой поверх слоя внешнего: его
	 * элементы видят его движок, а элемент внешнего — внешний.
	 */
	it('список внутри элемента: элементы входят каждый в свой', async () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<so-list-box (soEngineCreate)="outer = $event">
				<so-list-box-item value="a" text="A">
					<span slot="trailing">
						<so-list-box (soEngineCreate)="inner = $event">
							<so-list-box-item value="x" text="X" />
							<so-list-box-item value="y" text="Y" />
						</so-list-box>
					</span>
				</so-list-box-item>
				<so-list-box-item value="b" text="B" />
			</so-list-box>`,
		})
		class NestedHost {
			outer: TEngineView | undefined
			inner: TEngineView | undefined
		}

		const fixture = mountHost(NestedHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.outer)).toEqual(['a', 'b'])
		expect(valuesOf(fixture.componentInstance.inner)).toEqual(['x', 'y'])
	})

	/** Слой списка — поверх слоя секции: элементы списка в панели входят в него. */
	it('ListBox в панели секции Accordion: элементы входят в его коллекцию', async () => {
		@Component({
			standalone: true,
			imports: [
				TAccordionComponent,
				TAccordionItemComponent,
				TListBoxComponent,
				TListBoxItemComponent,
			],
			template: `<div so-accordion (soEngineCreate)="sections = $event">
				<so-accordion-item value="s" text="Секция" selected>
					<so-list-box (soEngineCreate)="list = $event">
						<so-list-box-item value="x" text="X" />
						<so-list-box-item value="y" text="Y" />
					</so-list-box>
				</so-accordion-item>
			</div>`,
		})
		class AccordionListHost {
			sections: TEngineView | undefined
			list: TEngineView | undefined
		}

		const fixture = mountHost(AccordionListHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.sections)).toEqual(['s'])
		expect(valuesOf(fixture.componentInstance.list)).toEqual(['x', 'y'])

		click(fixture, rowOf('Y'))

		expect(rows().map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'true'])
	})

	it('элементы разметки добавляются и снимаются после монтирования', async () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<so-list-box (soEngineCreate)="engine = $event">
				@for (value of values(); track value) {
					<so-list-box-item [value]="value" [text]="value.toUpperCase()" />
				}
			</so-list-box>`,
		})
		class ListHost {
			readonly values = signal(['a', 'b'])
			engine: TEngineView | undefined
		}

		const fixture = mountHost(ListHost)

		await flush()

		fixture.componentInstance.values.set(['a', 'b', 'c'])
		fixture.detectChanges()

		expect(valuesOf(fixture.componentInstance.engine)).toEqual(['a', 'b', 'c'])

		fixture.componentInstance.values.set(['a', 'c'])
		fixture.detectChanges()

		expect(valuesOf(fixture.componentInstance.engine)).toEqual(['a', 'c'])
		expect(rows()).toHaveLength(2)
	})
})

/**
 * Tabs и Accordion: та же механика, что у ListBox. В движке ровно элементы
 * разметки, по одному разу и в порядке DOM, и клик работает с ним:
 * активирует таб вместе с его панелью, раскрывает секцию.
 */
describe('элементы разметки в движке владельца', () => {
	const tabs = () => [...document.querySelectorAll('[role="tab"]')]

	function tab(text: string): HTMLElement {
		const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

		return found
	}

	/** Тексты показанных панелей: неактивная панель скрыта и пуста. */
	const panels = () =>
		[...document.querySelectorAll('.so-tabs__panel')]
			.filter((panel) => panel instanceof HTMLElement && panel.style.display !== 'none')
			.map((panel) => panel.textContent?.trim())

	const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

	function header(text: string): HTMLElement {
		const found = headers().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

		return found
	}

	const expanded = () => headers().map((node) => node.getAttribute('aria-expanded'))

	@Component({
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
		template: `@if (shown()) {
			<so-tabs (soEngineCreate)="engines.push($event)">
				<so-tabs-item value="a" text="A" active />
				<so-tabs-item value="b" text="B" />
				<so-tabs-item value="c" text="C" />
				@for (value of ['a', 'b', 'c']; track value) {
					<div so-tabs-content slot="content" [value]="value">
						Панель {{ value.toUpperCase() }}
					</div>
				}
			</so-tabs>
		}`,
	})
	class TabSetHost {
		readonly shown = signal(true)
		readonly engines: TEngineView[] = []
	}

	@Component({
		standalone: true,
		imports: [TAccordionComponent, TAccordionItemComponent],
		template: `@if (shown()) {
			<div so-accordion (soEngineCreate)="engines.push($event)">
				<so-accordion-item value="a" text="A" selected>Содержимое A</so-accordion-item>
				<so-accordion-item value="b" text="B">Содержимое B</so-accordion-item>
				<so-accordion-item value="c" text="C">Содержимое C</so-accordion-item>
			</div>
		}`,
	})
	class SectionsHost {
		readonly shown = signal(true)
		readonly engines: TEngineView[] = []
	}

	it('табы: в движке ровно табы разметки; клик активирует таб и его панель', async () => {
		const fixture = mountHost(TabSetHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a', 'b', 'c'])
		expect(panels()).toEqual(['Панель A'])

		click(fixture, tab('B'))

		expect(tabs().map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'true',
			'false',
		])
		expect(panels()).toEqual(['Панель B'])
	})

	it('секции: в движке ровно секции разметки; клик раскрывает секцию', async () => {
		const fixture = mountHost(SectionsHost)

		await flush()

		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a', 'b', 'c'])
		expect(expanded()).toEqual(['true', 'false', 'false'])

		// Режим по умолчанию — одна раскрытая секция
		click(fixture, header('B'))

		expect(expanded()).toEqual(['false', 'true', 'false'])
	})

	/**
	 * Владелец, снятый и собранный заново, — новый движок, и элементы
	 * собираются вслед за ним: в живом движке ровно элементы разметки.
	 */
	it('набор табов снят и собран заново: в новом движке ровно табы разметки', async () => {
		const fixture = mountHost(TabSetHost)

		await flush()

		fixture.componentInstance.shown.set(false)
		fixture.detectChanges()
		fixture.componentInstance.shown.set(true)
		fixture.detectChanges()

		await flush()

		expect(fixture.componentInstance.engines).toHaveLength(2)
		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a', 'b', 'c'])

		click(fixture, tab('C'))

		expect(panels()).toEqual(['Панель C'])
	})

	it('аккордеон снят и собран заново: в новом движке ровно секции разметки', async () => {
		const fixture = mountHost(SectionsHost)

		await flush()

		fixture.componentInstance.shown.set(false)
		fixture.detectChanges()
		fixture.componentInstance.shown.set(true)
		fixture.detectChanges()

		await flush()

		expect(fixture.componentInstance.engines).toHaveLength(2)
		expect(valuesOf(fixture.componentInstance.engines.at(-1))).toEqual(['a', 'b', 'c'])

		click(fixture, header('C'))

		expect(expanded()).toEqual(['false', 'false', 'true'])
	})
})
