/**
 * Table под Angular — проводка на настоящей разметке.
 *
 * Модель — колонки, ячейки, сортировку, счёт выбора и чекбоксы колонки выбора
 * — проверяет ядро (`core/__tests__/table*.spec.ts`), раскладку и вид —
 * браузер (`playground/vue/browser/table.spec.ts`). Здесь, как у React
 * (`ui/react/__tests__/table.spec.tsx`) и Vue, важно, что выходы коллекции
 * доезжают туда, куда должны: колонки — в заголовки, строки — в `tbody` в
 * порядке сортировки, ячейки — в строки, а нажатия по кнопкам сортировки и
 * чекбоксам доходят до модели и возвращаются в разметку — и тогда, когда
 * модель выбор отменила.
 *
 * Своё у Angular — разметка. Элемент компонента (`<div so-table>`) — окно
 * таблицы, а корень — `table` в шаблоне (корень внутри обёртки, `'wrapped'`):
 * класс, стиль потребителя и скрытие — окну, остальные его атрибуты, классы,
 * наборы и `TElementPlugin` — таблице. Заголовки и строки —
 * `th[so-table-column]` и `tr[so-table-row]`,
 * их рисует сама таблица. Слоты `header` и `cell` — шаблоны, и шаблон,
 * заданный таблице, рисуется в каждом заголовке и ячейке вместо текста — и
 * там, где ничего не нарисовал, как сниппет у Svelte. «Перерисовка ячеек»
 * считает не вызовы слота, как у React: шаблон Angular не зовут, а выводят, и
 * выбор, перепроверяя строку, перепроверяет выражения шаблона ячеек, —
 * проверяется, что узлы его вывода переживают выбор и смену входов. Сервер и
 * гидратация — `collections.server.spec.ts`.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, signal, type EventEmitter, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TSelectionMode,
	TTableCollection,
	TTableColumnFit,
	TTableColumnMove,
	TTableColumnResize,
	TTableColumnSource,
	TTableRecord,
	TTableReorderPreview,
} from '@soldy-ui/core'
import { enUS, ruRU, type TLocale } from '@soldy-ui/plugins'
import {
	LocaleProviderDirective,
	SlotDirective,
	TTableComponent,
	TVirtualComponent,
	TextPipe,
} from '@soldy-ui/angular'
import { mountHost, nextFrame } from './mount'

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function findAll(selector: string, root: ParentNode = document): HTMLElement[] {
	return [...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/** Поле чекбокса по селектору его обёртки. */
function checkBoxInput(selector: string, root: ParentNode = document): HTMLInputElement {
	const input = find(selector, root).querySelector('input')

	if (!(input instanceof HTMLInputElement)) throw new Error(`${selector}: поля чекбокса нет`)

	return input
}

const text = (element: Element) => element.textContent?.trim()

/**
 * Смонтировать хост и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`, и слушатели плагинов встают по его `ready`.
 */
async function render<T>(host: Type<T>): Promise<ComponentFixture<T>> {
	const fixture = mountHost(host)

	await nextFrame()

	return fixture
}

/** Изменение снаружи — проверка и кадр: новые узлы объявляют себя плагинам кадром позже. */
async function settle(fixture: ComponentFixture<unknown>, action: () => void): Promise<void> {
	action()
	fixture.detectChanges()
	await nextFrame()
}

/** Изменение снаружи — и проверка изменений. */
function apply(fixture: ComponentFixture<unknown>, action: () => void): void {
	action()
	fixture.detectChanges()
}

/** Клик — как его шлёт браузер, и проверка: выбор перерисовывает таблицу. */
function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	apply(fixture, () => element.click())
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(
	fixture: ComponentFixture<unknown>,
	target: Element,
	key: string,
	modifiers: KeyboardEventInit = {},
): void {
	apply(fixture, () => {
		target.dispatchEvent(
			new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
		)
	})
}

/** Узел под фокусом; нет его — тест падает здесь. */
function focused(): Element {
	const active = document.activeElement

	if (!active) throw new Error('фокуса нет')

	return active
}

const ANNA = { id: 1, name: 'Анна', age: 30 }
const BORIS = { id: 2, name: 'Борис', age: 41 }
const VERA = { id: 3, name: 'Вера', age: 25 }

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end', sortable: true }

/** Строки таблицы данными — как их принимает вход `items`. */
type TItems = NonNullable<TTableComponent['items']>

/** Ключ записи — её `id`. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/**
 * Движок строк снаружи — с записями, колонками и режимом выбора: на его выбор
 * подписывается тест, когда отменяет выбор.
 */
function engineOf(
	mode: TSelectionMode = 'multiple',
	records: readonly TTableRecord[] = [ANNA, BORIS, VERA],
	columns: readonly TTableColumnSource[] = [NAME, AGE],
): TTableCollection {
	const engine = createEngineTable({ items: records.map((data) => ({ data })) })

	engine.extensions.batch.trackBy = (row) => idOf(row.data)
	engine.extensions.columns.columns = columns
	engine.extensions.selection.mode = mode

	return engine
}

/** Строка коллекции по ключу записи. */
function rowOf(engine: TTableCollection, id: number): ITableRow {
	const found = engine.extensions.batch.items.find((row) => idOf(row.data) === id)

	if (!found) throw new Error(`строки ${id} нет`)

	return found
}

/** Колонка коллекции по полю. */
function columnOf(engine: TTableCollection, field: string): ITableColumn {
	const found = engine.extensions.columns.columns.find((column) => column.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/** Строки `tbody` — по тексту ячейки заголовка. */
const rowNames = () => findAll('.so-table-row').map((row) => text(find('th', row)))

/** Отметка выбора строк. */
const rowsSelected = () => findAll('.so-table-row').map((row) => row.dataset['selected'])

/** Отметки чекбоксов строк. */
const rowsChecked = () =>
	findAll('.so-table-row').map((row) => checkBoxInput('.so-table-row__select', row).checked)

/**
 * Хост над движком снаружи. Движок таблица берёт при сборке, поэтому тест
 * кладёт его в сигнал до первой проверки (`renderEngine`).
 */
abstract class TEngineHost {
	readonly engine = signal<TTableCollection | undefined>(undefined)
}

@Component({
	standalone: true,
	imports: [TTableComponent],
	template: `<div so-table [engine]="engine()"></div>`,
})
class EngineHost extends TEngineHost {}

/** Хост над движком в провайдере локали: язык поддерева тест меняет на лету. */
@Component({
	standalone: true,
	imports: [TTableComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale()">
		<div so-table [engine]="engine()"></div>
	</ng-container>`,
})
class LocaleHost extends TEngineHost {
	readonly locale = signal<TLocale>(enUS)
}

/** Смонтировать хост над движком `engine` и дождаться кадра. */
async function renderEngine<T extends TEngineHost>(
	host: Type<T>,
	engine: TTableCollection,
): Promise<ComponentFixture<T>> {
	const fixture = TestBed.createComponent(host)

	fixture.componentInstance.engine.set(engine)
	fixture.detectChanges()
	await nextFrame()

	return fixture
}

/**
 * Хост над данными: строки и колонки — входами `items` и `columns`. Тест
 * кладёт их в сигналы до первой проверки (`renderData`).
 */
abstract class TDataHost {
	readonly items = signal<TItems>([])
	readonly columns = signal<TTableColumnSource[]>([])
}

@Component({
	standalone: true,
	imports: [TTableComponent],
	template: `<div so-table [items]="items()" [columns]="columns()"></div>`,
})
class DataHost extends TDataHost {}

/** Смонтировать хост над записями `records` и колонками `columns` и дождаться кадра. */
async function renderData<T extends TDataHost>(
	host: Type<T>,
	records: readonly TTableRecord[],
	columns: TTableColumnSource[],
): Promise<ComponentFixture<T>> {
	const fixture = TestBed.createComponent(host)

	fixture.componentInstance.items.set(records.map((data) => ({ data })))
	fixture.componentInstance.columns.set(columns)
	fixture.detectChanges()
	await nextFrame()

	return fixture
}

describe('разметка', () => {
	it('шапка — показанные колонки, тело — строки, в строке — ячейки по колонкам', async () => {
		await renderData(DataHost, [ANNA, BORIS], [NAME, AGE])

		const table = find('table.so-table')

		expect(findAll('.so-table__head-row > th', table).map(text)).toEqual(['Имя', 'Возраст'])
		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '30'],
			['Борис', '41'],
		])
		// Колонки выбора нет: режим по умолчанию — `none`
		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('заголовок колонки — th с набором колонки и шириной переменной', async () => {
		await renderData(DataHost, [ANNA], [NAME, { ...AGE, width: 120 }])

		const [name, age] = findAll('.so-table-column')

		expect(age.tagName).toBe('TH')
		expect(age.getAttribute('scope')).toBe('col')
		expect(age.dataset['align']).toBe('end')
		expect(age.style.getPropertyValue('--so-table-column-width')).toBe('120px')
		expect(name.style.getPropertyValue('--so-table-column-width')).toBe('')
	})

	it('ячейка колонки rowHeader — th scope="row" с id, остальные — td', async () => {
		await renderData(DataHost, [ANNA], [AGE, NAME])

		const [age, name] = [...find('.so-table-row').children]

		expect(age.tagName).toBe('TD')
		expect(age.getAttribute('data-align')).toBe('end')
		expect(name.tagName).toBe('TH')
		expect(name.getAttribute('scope')).toBe('row')
		expect(name.id).not.toBe('')
	})

	it('заголовки и строки — части таблицы на тегах ячейки шапки и строки', async () => {
		await renderData(DataHost, [ANNA], [NAME])

		expect(find('.so-table-column').matches('th[so-table-column]')).toBe(true)
		expect(find('.so-table-row').matches('tr[so-table-row]')).toBe(true)
		expect(find('.so-table-row').parentElement).toBe(find('tbody.so-table__body'))
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div
			so-table
			[items]="items"
			[columns]="columns"
			stickyHead
			mode="single"
			aria_label="Сотрудники"
			(soElementReady)="ready.push($event)"
		></div>`,
	})
	class ViewportHost {
		readonly items = [{ data: ANNA }]
		readonly columns = [NAME]
		readonly ready: Element[] = []
	}

	it('окно вокруг таблицы: корень, классы и наборы — у table, а не у окна', async () => {
		await render(ViewportHost)

		const table = find('table.so-table')
		const viewport = find('[so-table]')

		expect(table.parentElement).toBe(viewport)
		expect(viewport.localName).toBe('div')
		expect(table.dataset['stickyHead']).toBe('true')
		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		// У окна — только свой класс и метка селектора: ни наборов, ни имени, ни
		// входов
		expect(viewport.className).toBe('so-table__viewport')
		expect(
			viewport.getAttributeNames().filter((name) => !['class', 'style'].includes(name)),
		).toEqual(['so-table'])
	})

	/**
	 * Корень — `table`: её плагины получают узлом, её тег у ядра. Тег окна
	 * ядру не уходит — у корня внутри обёртки тег свой.
	 */
	it('TElementPlugin получает table, а не окно; тег ядра — table', async () => {
		const fixture = await render(ViewportHost)

		expect(fixture.componentInstance.ready).toEqual([find('table.so-table')])
		expect(find('table.so-table').localName).toBe('table')
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div
			so-table
			[items]="items"
			[columns]="columns"
			class="staff"
			style="max-height: 320px"
			aria-label="Сотрудники"
			id="staff"
			data-testid="staff"
		></div>`,
	})
	class ConsumerHost {
		readonly items = [{ data: ANNA }]
		readonly columns = [NAME]
	}

	/**
	 * Атрибуты потребителя делятся, как у поля: класс и стиль — окну, внешнему
	 * узлу компонента, остальные статические атрибуты разметки база переносит
	 * на `table`, где роль и имя таблицы.
	 */
	it('атрибуты потребителя: aria-label, id и data-* — table, класс и стиль — окну', async () => {
		await render(ConsumerHost)

		const viewport = find('.so-table__viewport')
		const table = find('table.so-table')

		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		expect(table.id).toBe('staff')
		expect(table.dataset['testid']).toBe('staff')
		expect(
			['aria-label', 'id', 'data-testid'].filter((name) => viewport.hasAttribute(name)),
		).toEqual([])
		expect(viewport.classList.contains('staff')).toBe(true)
		expect(viewport.style.maxHeight).toBe('320px')
		expect(table.classList.contains('staff')).toBe(false)
		expect(table.classList.contains('so-table__viewport')).toBe(false)
		expect(table.hasAttribute('style')).toBe(false)
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [items]="items" [columns]="columns" [visible]="visible()"></div>`,
	})
	class HiddenHost {
		readonly items = [{ data: ANNA }]
		readonly columns = [NAME]
		readonly visible = signal(false)
	}

	it('скрытая таблица прячет окно: скрытие — на окне', async () => {
		const fixture = await render(HiddenHost)

		expect(find('.so-table__viewport').style.display).toBe('none')
		expect(find('table.so-table').style.display).toBe('')

		apply(fixture, () => fixture.componentInstance.visible.set(true))

		expect(find('.so-table__viewport').style.display).toBe('')
	})
})

/**
 * Ширины колонок без своей ширины раскладывает ядро по месту таблицы и её
 * `columnFit` (`core/__tests__/table-layout.spec.ts`), место мерит плагин
 * (`plugins/__tests__/table-layout.plugin.spec.ts`), раскладку в браузере —
 * `playground/vue/browser/table.spec.ts`. Здесь — что вход доходит до
 * таблицы, а ширины раскладки, `data-overflow` и `data-sized` — до разметки.
 */
describe('раскладка колонок', () => {
	/** Колонки заголовков — переменные ширины по порядку. */
	const widths = () =>
		findAll('.so-table-column').map((header) =>
			header.style.getPropertyValue('--so-table-column-width'),
		)

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [engine]="engine()" [columnFit]="fit()"></div>`,
	})
	class FitHost extends TEngineHost {
		readonly fit = signal<TTableColumnFit | undefined>(undefined)
	}

	it('columnFit none — ширины по умолчанию сразу, без места; признака места нет', async () => {
		const fixture = TestBed.createComponent(FitHost)

		fixture.componentInstance.engine.set(engineOf('none', [ANNA]))
		fixture.componentInstance.fit.set('none')
		fixture.detectChanges()
		await nextFrame()

		expect(widths()).toEqual(['160px', '160px'])
		expect(findAll('.so-table-column').map((header) => header.dataset['sized'])).toEqual([
			'true',
			'true',
		])
		expect(find('table.so-table').hasAttribute('data-overflow')).toBe(false)
		// Ширины известны и до места — таблица шириной в их сумму
		expect(find('table.so-table').dataset['sized']).toBe('true')
	})

	it('по умолчанию auto — до места ширин нет, с местом — делят его', async () => {
		const engine = engineOf('none', [ANNA])
		const fixture = await renderEngine(EngineHost, engine)

		expect(widths()).toEqual(['', ''])
		expect(find('table.so-table').hasAttribute('data-sized')).toBe(false)

		await settle(fixture, () => engine.extensions.columns.notifySpace(500))

		expect(widths()).toEqual(['250px', '250px'])
		expect(find('table.so-table').dataset['overflow']).toBe('false')
		expect(find('table.so-table').dataset['sized']).toBe('true')
	})

	it('смена columnFit входом — новая раскладка; шире места — data-overflow', async () => {
		const engine = engineOf('none', [ANNA])
		const fixture = TestBed.createComponent(FitHost)

		fixture.componentInstance.engine.set(engine)
		fixture.componentInstance.fit.set('none')
		fixture.detectChanges()
		await nextFrame()
		await settle(fixture, () => engine.extensions.columns.notifySpace(600))

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset['overflow']).toBe('false')

		await settle(fixture, () => fixture.componentInstance.fit.set('auto'))

		expect(widths()).toEqual(['300px', '300px'])

		await settle(fixture, () => engine.extensions.columns.notifySpace(300))

		expect(widths()).toEqual(['160px', '160px'])
		expect(find('table.so-table').dataset['overflow']).toBe('true')
	})
})

describe('слоты', () => {
	/**
	 * Селектор свой у хостов, которые различаются только выражениями и
	 * содержимым шаблона слота: этого в id компонента Angular нет, и без
	 * селектора id совпал бы (предупреждение NG0912).
	 */
	@Component({
		selector: 'probe-header',
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [items]="items()" [columns]="columns()">
			<ng-template slot="header" let-column="column"
				><b>{{ column.field }}:{{ column.text }}</b></ng-template
			>
		</div>`,
	})
	class HeaderHost extends TDataHost {}

	it('header — подпись заголовка по колонке, и у сортируемой тоже; кнопка — вне подписи', async () => {
		await renderData(HeaderHost, [ANNA], [NAME, AGE])

		expect(findAll('.so-table-column__text b').map(text)).toEqual(['name:Имя', 'age:Возраст'])
		// Кнопку сортировки рисует колонка рядом с подписью, а не таблица в ней
		const button = find('.so-table-column__sort')

		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(text(button)).toBe('')
	})

	@Component({
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [engine]="engine()">
			<ng-template slot="header" let-column="column" let-text="text"
				><button type="button" class="menu" (click)="opened.push(column.field)">
					{{ text }}
				</button></ng-template
			>
		</div>`,
	})
	class HeaderButtonHost extends TEngineHost {
		readonly opened: string[] = []
	}

	/**
	 * Своё действие по заголовку — контрол в подписи: у `th` фокуса нет, и
	 * нажатие по ячейке ничего не делает. Нажатие по своему контролу
	 * сортировку не трогает.
	 */
	it('кнопка в слоте header нажимается и не сортирует', async () => {
		const engine = engineOf('none')
		const fixture = await renderEngine(HeaderButtonHost, engine)

		const age = findAll('.so-table-column')[1]

		click(fixture, find('button.menu', age))

		expect(fixture.componentInstance.opened).toEqual(['age'])
		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	@Component({
		selector: 'probe-header-scope',
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [items]="items()" [columns]="columns()">
			<ng-template slot="header" let-column="column" let-text="text" let-sortable="sortable"
				><b>{{ column.field }}:{{ text }}:{{ sortable }}</b></ng-template
			>
		</div>`,
	})
	class HeaderScopeHost extends TDataHost {}

	/**
	 * `header` — проброс шаблона заголовка колонки: рядом с колонкой в scope то,
	 * что отдаёт слот самого заголовка, — текст и сортируемость.
	 */
	it('header получает текст и сортируемость колонки — scope слота заголовка', async () => {
		await renderData(HeaderScopeHost, [ANNA], [NAME, AGE])

		expect(findAll('.so-table-column__text b').map(text)).toEqual([
			'name:Имя:false',
			'age:Возраст:true',
		])
	})

	@Component({
		selector: 'probe-opaque-header',
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [items]="items()" [columns]="columns()">
			<ng-template slot="header" let-column="column">
				@if (column.field === 'age') {
					<b>{{ column.text }}</b>
				}
			</ng-template>
		</div>`,
	})
	class OpaqueHeaderHost extends TDataHost {}

	/**
	 * Шаблон непрозрачен: что он нарисовал, колонка не видит, — и шаблон,
	 * заданный таблице, рисуется в каждом заголовке вместо текста колонки, как
	 * сниппет у Svelte. У React пустая отрисовка уступает место тексту.
	 */
	it('header задан — у каждой колонки вместо текста, и там, где ничего не нарисовал', async () => {
		await renderData(OpaqueHeaderHost, [ANNA], [NAME, AGE])

		expect(findAll('.so-table-column__text').map(text)).toEqual(['', 'Возраст'])
	})

	@Component({
		selector: 'probe-cell',
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [items]="items()" [columns]="columns()">
			<ng-template slot="cell" let-row="row" let-column="column" let-value="value">
				@if (column.field === 'age') {
					<i>{{ idOf(row.data) }}/{{ value }}</i>
				} @else {
					{{ value }}
				}
			</ng-template>
		</div>`,
	})
	class CellHost extends TDataHost {
		readonly idOf = idOf
	}

	it('cell — содержимое ячейки по строке, колонке и значению', async () => {
		await renderData(CellHost, [ANNA, BORIS], [NAME, AGE])

		expect(findAll('.so-table-row').map((row) => [...row.children].map(text))).toEqual([
			['Анна', '1/30'],
			['Борис', '2/41'],
		])
	})

	const FLAG: TTableColumnSource = { field: 'flag', text: 'Флаг' }
	const NOTE: TTableColumnSource = { field: 'note', text: 'Заметка' }
	const TAGS: TTableColumnSource = { field: 'tags', text: 'Теги' }

	/** Запись со значениями всех видов: число, булево, пусто и массив. */
	const MIXED = { id: 1, name: 'Анна', age: 30, flag: true, note: null, tags: ['a'] }

	/**
	 * Без шаблона значение — текстом ядра (`text` ячейки): интерполяция
	 * Angular нарисовала бы объект как `[object Object]`, а массив — через
	 * запятую. Цикл JSON не пишет, и ядро отдаёт тег объекта.
	 */
	it('без cell значение — текстом: число, булево, пусто, объект, цикл', async () => {
		const LOOP: TTableColumnSource = { field: 'loop', text: 'Цикл' }
		const loop: Record<string, unknown> = {}

		loop.self = loop

		await renderData(DataHost, [{ ...MIXED, loop }], [NAME, AGE, FLAG, NOTE, TAGS, LOOP])

		expect([...find('.so-table-row').children].map((cell) => cell.textContent)).toEqual([
			'Анна',
			'30',
			'true',
			'',
			'[\n  "a"\n]',
			'[object Object]',
		])
	})

	@Component({
		selector: 'probe-text-cell',
		standalone: true,
		imports: [TTableComponent, SlotDirective, TextPipe],
		template: `<div so-table [items]="items()" [columns]="columns()">
			<ng-template slot="cell" let-column="column" let-value="value">
				@if (column.field === 'age') {
					<i>{{ value }}</i>
				} @else {
					{{ value | soText }}
				}
			</ng-template>
		</div>`,
	})
	class TextCellHost extends TDataHost {}

	/**
	 * Шаблон `cell` непрозрачен, и текст остальных колонок потребитель рисует
	 * сам: пайп `soText` — то же правило ядра, что текст ячейки без шаблона.
	 */
	it('своему шаблону cell тот же текст — пайп soText', async () => {
		await renderData(TextCellHost, [MIXED], [NAME, AGE, FLAG, NOTE, TAGS])

		expect([...find('.so-table-row').children].map(text)).toEqual([
			'Анна',
			'30',
			'true',
			'',
			'[\n  "a"\n]',
		])
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [items]="items()" [columns]="columns()" mode="multiple">
			<p slot="empty">Нет данных</p>
		</div>`,
	})
	class EmptyHost extends TDataHost {}

	it('empty — пока строк нет, ячейка во всю ширину строки', async () => {
		await renderData(EmptyHost, [], [NAME, AGE])

		const cell = find('.so-table__empty')

		expect(text(cell)).toBe('Нет данных')
		// Две колонки и колонка выбора
		expect(cell.getAttribute('colspan')).toBe('3')
	})

	it('строки появились — пустой строки нет, и содержимого empty тоже', async () => {
		const fixture = await renderData(EmptyHost, [], [NAME])

		await settle(fixture, () => fixture.componentInstance.items.set([{ data: ANNA }]))

		expect(findAll('.so-table__empty-row')).toEqual([])
		expect(document.body.textContent).not.toContain('Нет данных')
	})
})

describe('сортировка', () => {
	it('кнопка заголовка сортирует строки: по возрастанию, по убыванию, снята', async () => {
		const fixture = await renderEngine(EngineHost, engineOf('none'))

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])

		click(fixture, button)

		expect(rowNames()).toEqual(['Вера', 'Анна', 'Борис'])
		expect(age.getAttribute('aria-sort')).toBe('ascending')
		expect(age.dataset['sort']).toBe('asc')

		click(fixture, button)

		expect(rowNames()).toEqual(['Борис', 'Анна', 'Вера'])
		expect(age.getAttribute('aria-sort')).toBe('descending')

		click(fixture, button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
	})

	it('подпись — у всех колонок, кнопка — только у сортируемой и рядом с подписью; стрелка скрыта от скринридера', async () => {
		await renderEngine(EngineHost, engineOf('none'))

		const [name, age] = findAll('.so-table-column')

		expect(findAll('.so-table-column__sort', name)).toEqual([])
		expect(text(find('.so-table-column__text', name))).toBe('Имя')
		expect(text(find('.so-table-column__text', age))).toBe('Возраст')

		const button = find('.so-table-column__sort', age)

		// Подпись и кнопка — соседи в ряду содержимого заголовка
		expect(button.parentElement).toBe(find('.so-table-column__content', age))
		expect(button.closest('.so-table-column__text')).toBeNull()
		expect(button.getAttribute('type')).toBe('button')
		expect(find('.so-table-column__sort-icon', age).getAttribute('aria-hidden')).toBe('true')
		expect(age.querySelector('.so-table-column__sort-icon svg')).not.toBeNull()
	})

	/**
	 * Заголовок назван подписью, кнопка — своим именем от локали: имя кнопки в
	 * имя заголовка не входит, и подписи заголовка в ссылке кнопки нет.
	 */
	it('имя кнопки — «Sort by …» от локали, имя заголовка — только подпись', async () => {
		await renderEngine(EngineHost, engineOf('none'))

		const age = findAll('.so-table-column')[1]
		const button = find('.so-table-column__sort', age)
		const caption = find('.so-table-column__text', age)

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')
		expect(button.hasAttribute('aria-labelledby')).toBe(false)
		expect(age.getAttribute('aria-labelledby')).toBe(caption.id)
		expect(caption.contains(button)).toBe(false)
	})

	it('смена локали — новое имя кнопки на той же кнопке, без перемонтирования', async () => {
		const fixture = await renderEngine(LocaleHost, engineOf('none'))
		const button = find('.so-table-column__sort')

		expect(button.getAttribute('aria-label')).toBe('Sort by Возраст')

		apply(fixture, () => fixture.componentInstance.locale.set(ruRU))

		expect(find('.so-table-column__sort')).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Сортировать по столбцу Возраст')
	})

	it('нажатие по подписи и по ячейке заголовка не сортирует', async () => {
		const engine = engineOf('none')
		const fixture = await renderEngine(EngineHost, engine)

		const age = findAll('.so-table-column')[1]

		click(fixture, find('.so-table-column__text', age))
		click(fixture, age)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
		expect(age.hasAttribute('aria-sort')).toBe(false)
		expect(engine.extensions.sort.sort).toEqual([])
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [engine]="engine()" disabled></div>`,
	})
	class DisabledHost extends TEngineHost {}

	it('выключенная таблица — кнопка выключена, порядок прежний', async () => {
		const fixture = await renderEngine(DisabledHost, engineOf('none'))

		const button = find('.so-table-column__sort')

		expect(button.hasAttribute('disabled')).toBe(true)

		click(fixture, button)

		expect(rowNames()).toEqual(['Анна', 'Борис', 'Вера'])
	})
})

describe('колонка выбора', () => {
	it('multiple — заголовок с чекбоксом «выбрать все», single — пустая ячейка, у строк — чекбоксы', async () => {
		const multiple = await renderEngine(EngineHost, engineOf('multiple'))

		const head = find('.so-table__select')

		expect(head.tagName).toBe('TH')
		expect(findAll('.so-check-box', head)).toHaveLength(1)
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)

		multiple.destroy()
		await renderEngine(EngineHost, engineOf('single'))

		const single = find('.so-table__select')

		expect(single.tagName).toBe('TD')
		expect(single.children).toHaveLength(0)
		expect(findAll('.so-table-row__select .so-check-box')).toHaveLength(3)
	})

	it('колонка появляется и уходит вместе с режимом', async () => {
		const engine = engineOf('none')
		const fixture = await renderEngine(EngineHost, engine)

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])

		await settle(fixture, () => {
			engine.extensions.selection.mode = 'multiple'
		})

		expect(findAll('.so-table-row__select')).toHaveLength(3)

		await settle(fixture, () => {
			engine.extensions.selection.mode = 'none'
		})

		expect(findAll('.so-table__select, .so-table-row__select')).toEqual([])
	})

	it('клик по чекбоксу строки выбирает строку, повторный — снимает', async () => {
		const engine = engineOf('multiple')
		const fixture = await renderEngine(EngineHost, engine)

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		click(fixture, input)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(input.checked).toBe(true)
		expect(anna.dataset['selected']).toBe('true')

		click(fixture, input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset['selected']).toBe('false')
	})

	it('строки, выбранные по одной до всех, выбора не теряют; шапка — «часть», потом отмечена', async () => {
		const engine = engineOf('multiple')
		const fixture = await renderEngine(EngineHost, engine)

		const head = checkBoxInput('.so-table__select')
		const inputs = findAll('.so-table-row').map((row) =>
			checkBoxInput('.so-table-row__select', row),
		)

		click(fixture, inputs[0])

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		click(fixture, inputs[1])
		click(fixture, inputs[2])

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect(inputs.map((input) => input.checked)).toEqual([true, true, true])
		expect([head.checked, head.indeterminate]).toEqual([true, false])
	})

	it('чекбокс шапки: «часть» → все → ни одной', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 2))

		const fixture = await renderEngine(EngineHost, engine)

		const head = checkBoxInput('.so-table__select')

		expect([head.checked, head.indeterminate]).toEqual([false, true])

		click(fixture, head)

		expect(engine.extensions.selection.selected).toHaveLength(3)
		expect([head.checked, head.indeterminate]).toEqual([true, false])
		expect(rowsChecked()).toEqual([true, true, true])

		click(fixture, head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
		expect(rowsChecked()).toEqual([false, false, false])
	})

	it('выбор снаружи доезжает до чекбоксов', async () => {
		const engine = engineOf('multiple')
		const fixture = await renderEngine(EngineHost, engine)

		apply(fixture, () => engine.extensions.selection.select(rowOf(engine, 3)))

		const vera = findAll('.so-table-row')[2]

		expect(checkBoxInput('.so-table-row__select', vera).checked).toBe(true)
		expect(checkBoxInput('.so-table__select').indeterminate).toBe(true)
	})

	it('пустая таблица и выключенные строки — чекбокс шапки выключен', async () => {
		const engine = engineOf('multiple', [])
		const fixture = await renderEngine(EngineHost, engine)

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)

		await settle(fixture, () => {
			engine.extensions.batch.items = [{ data: { ...ANNA } }]
		})

		expect(checkBoxInput('.so-table__select').disabled).toBe(false)

		apply(fixture, () => {
			rowOf(engine, 1).disabled = true
		})

		expect(checkBoxInput('.so-table__select').disabled).toBe(true)
		expect(checkBoxInput('.so-table-row__select').disabled).toBe(true)
	})

	/**
	 * Разметка — как у `OwnerHost`, а поля экземпляра в id компонента Angular не
	 * входят: селектор у обоих свой, иначе id совпал бы (предупреждение NG0912).
	 */
	@Component({
		selector: 'probe-sized',
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [ctrl]="owner" [engine]="engine()"></div>`,
	})
	class SizedHost extends TEngineHost {
		readonly owner = new TTable({ size: 'lg' })
	}

	it('чекбоксы — размера и варианта таблицы', async () => {
		await renderEngine(SizedHost, engineOf('multiple'))

		expect(find('.so-table__select .so-check-box').classList).toContain('so-check-box--size-lg')
		expect(find('.so-table-row__select .so-check-box').classList).toContain(
			'so-check-box--size-lg',
		)
	})
})

describe('имена чекбоксов', () => {
	it('чекбокс строки называет заголовок строки — ячейка колонки rowHeader', async () => {
		await renderEngine(EngineHost, engineOf('multiple'))

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)
		const header = find('th[scope="row"]', anna)

		expect(input.getAttribute('aria-labelledby')).toBe(header.id)
		expect(text(header)).toBe('Анна')

		// У каждой строки — свой заголовок
		const ids = findAll('th[scope="row"]').map((cell) => cell.id)

		expect(new Set(ids).size).toBe(3)
	})

	it('без колонки rowHeader у чекбокса строки ссылки нет', async () => {
		await renderEngine(
			EngineHost,
			engineOf('multiple', [ANNA], [{ ...NAME, rowHeader: false }, AGE]),
		)

		expect(checkBoxInput('.so-table-row__select').hasAttribute('aria-labelledby')).toBe(false)
		expect(findAll('th[scope="row"]')).toEqual([])
	})

	it('чекбокс шапки — имя от локали поддерева, на лету', async () => {
		const fixture = await renderEngine(LocaleHost, engineOf('multiple'))

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Select all')

		apply(fixture, () => fixture.componentInstance.locale.set(ruRU))

		expect(checkBoxInput('.so-table__select').getAttribute('aria-label')).toBe('Выбрать все')
	})
})

/**
 * Ручка ширины — полоса с полем у края заголовка. Какой станет ширина, решает
 * ядро (`core/__tests__/table-columns.spec.ts`), указатель и клавиши ведёт
 * плагин (`plugins/__tests__/table-column-resize.plugin.spec.ts`), протяжку в
 * настоящей раскладке — браузер (`playground/vue/browser/table.spec.ts`).
 * Здесь — что полоса рисуется, когда она есть, имена доходят до разметки, а
 * ширина — до заголовка, до поля и наружу выходом таблицы.
 */
describe('ручка ширины', () => {
	const RESIZABLE: TTableColumnSource = { ...NAME, resizable: true, width: 150 }

	/** Поле ручки в заголовке. */
	function resizerField(root: ParentNode = document): HTMLInputElement {
		const field = find('.so-table-column__resizer', root).querySelector('input')

		if (!(field instanceof HTMLInputElement)) throw new Error('поля ручки нет')

		return field
	}

	it('полоса с полем — у колонки resizable: ход и ширина колонки; у остальных её нет', async () => {
		await renderData(DataHost, [ANNA], [{ ...RESIZABLE, minWidth: 100, maxWidth: 300 }, AGE])

		const [name, age] = findAll('.so-table-column')
		const field = resizerField(name)

		expect(field.type).toBe('range')
		expect([field.min, field.max, field.value]).toEqual(['100', '300', '150'])
		expect(findAll('.so-table-column__resizer', age)).toEqual([])
	})

	it('колонка без своей ширины — полоса появляется с местом таблицы, ширина — раскладки', async () => {
		const engine = engineOf('none', [ANNA], [{ ...NAME, resizable: true }])
		const fixture = await renderEngine(EngineHost, engine)

		// Места нет — ширину решает тема, и ручке нечего показать
		expect(findAll('.so-table-column__resizer')).toEqual([])

		await settle(fixture, () => engine.extensions.columns.notifySpace(180))

		expect(resizerField().value).toBe('180')
		expect(find('.so-table-column').style.getPropertyValue('--so-table-column-width')).toBe(
			'180px',
		)
		// Ширина раскладки — не своя: колонка остаётся гибкой
		expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [items]="items()" [columns]="columns()" disabled></div>`,
	})
	class DisabledDataHost extends TDataHost {}

	it('у выключенной таблицы ручек нет', async () => {
		await renderData(DisabledDataHost, [ANNA], [RESIZABLE])

		expect(findAll('.so-table-column__resizer')).toEqual([])
	})

	it('заголовок и поле названы подписью — ровно текст колонки', async () => {
		await renderData(DataHost, [ANNA], [RESIZABLE, AGE])

		for (const header of findAll('.so-table-column')) {
			const caption = find('.so-table-column__text', header)

			expect(caption.id).not.toBe('')
			expect(header.getAttribute('aria-labelledby')).toBe(caption.id)
		}

		const name = findAll('.so-table-column')[0]

		expect(resizerField(name).getAttribute('aria-labelledby')).toBe(
			find('.so-table-column__text', name).id,
		)
		expect(text(find('.so-table-column__text', name))).toBe('Имя')
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div
			so-table
			[engine]="engine()"
			(soColumnResize)="resizes.push($event)"
		></div>`,
	})
	class ResizeHost extends TEngineHost {
		readonly resizes: TTableColumnResize[] = []
	}

	it('клавиша на поле — ширина заголовка, поле и soColumnResize таблицы', async () => {
		const engine = engineOf('none', [ANNA], [RESIZABLE])
		const fixture = await renderEngine(ResizeHost, engine)

		const header = find('.so-table-column')

		press(fixture, resizerField(), 'ArrowRight')

		expect(header.style.getPropertyValue('--so-table-column-width')).toBe('160px')
		expect(header.dataset['sized']).toBe('true')
		expect(resizerField().value).toBe('160')
		expect(fixture.componentInstance.resizes).toEqual([
			{ column: columnOf(engine, 'name'), width: 160 },
		])
	})

	/**
	 * Ширину на поле пишет директива текста поля — только когда она разошлась
	 * с узлом, на том же узле: ширина из кода доходит до поля, а поле не
	 * пересоздаётся.
	 */
	it('ширина из кода — в поле, тот же узел', async () => {
		const engine = engineOf('none', [ANNA], [RESIZABLE])
		const fixture = await renderEngine(EngineHost, engine)
		const field = resizerField()

		apply(fixture, () => {
			columnOf(engine, 'name').width = 200
		})

		expect(resizerField()).toBe(field)
		expect(field.value).toBe('200')
	})
})

/**
 * Перестановку ведёт плагин таблицы, место колонки — расширение коллекции.
 * Здесь — что плагин стоит на корне таблицы и находит её заголовки, а
 * перестановка доезжает до шапки и ячеек строк и уходит наружу выходом
 * `soColumnMove`. Протяжку указателем — `playground/vue/browser/table.spec.ts`.
 */
describe('перестановка колонок', () => {
	const MOVABLE: readonly TTableColumnSource[] = [
		{ ...NAME, reorderable: true },
		{ ...AGE, reorderable: true },
	]

	it('data-reorderable — на заголовке колонки', async () => {
		await renderData(DataHost, [ANNA], [MOVABLE[0], AGE])

		const [name, age] = findAll('.so-table-column')

		expect(name.dataset['reorderable']).toBe('true')
		expect(age.dataset['reorderable']).toBe('false')
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [engine]="engine()" (soColumnMove)="moves.push($event)"></div>`,
	})
	class MoveHost extends TEngineHost {
		readonly moves: TTableColumnMove[] = []
	}

	it('Ctrl+Shift+← на кнопке сортировки — шапка и ячейки в новом порядке, soColumnMove', async () => {
		const fixture = await renderEngine(MoveHost, engineOf('none', [ANNA], [...MOVABLE]))

		press(fixture, find('.so-table-column__sort'), 'ArrowLeft', {
			ctrlKey: true,
			shiftKey: true,
		})
		await nextFrame()
		fixture.detectChanges()

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', 'Анна'])
		expect(fixture.componentInstance.moves).toHaveLength(1)
		expect(fixture.componentInstance.moves[0].order).toEqual(['age', 'name'])
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [engine]="engine()" [reorderPreview]="preview()"></div>`,
	})
	class PreviewHost extends TEngineHost {
		readonly preview = signal<TTableReorderPreview>('head')
	}

	/**
	 * Признак тела — `data-reorder-preview` — ставит корню расширение колонок,
	 * и только на время жеста в `column`: на покое его нет ни в одном режиме, и
	 * правила тела темы ячейкам ничего не стоят.
	 */
	it('data-reorder-preview — только в жесте column: на покое и в head его нет', async () => {
		const engine = engineOf('none', [ANNA], [...MOVABLE])
		const { columns } = engine.extensions
		const fixture = await renderEngine(PreviewHost, engine)

		const table = find('table.so-table')
		const [name] = columns.columns

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		// head — нет и в жесте
		apply(fixture, () => columns.dragStart(name))

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		apply(fixture, () => {
			columns.dragCancel()
			fixture.componentInstance.preview.set('column')
		})

		expect(table.hasAttribute('data-reorder-preview')).toBe(false)

		apply(fixture, () => {
			columns.dragStart(name)
			columns.dragOver(1)
			columns.dragDrop()
		})

		expect(table.dataset['reorderPreview']).toBe('column')

		// Встала — признак ушёл той же проверкой, что и перестановка
		apply(fixture, () => columns.dragEnd())

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', 'Имя'])
		expect(table.hasAttribute('data-reorder-preview')).toBe(false)
	})

	/**
	 * Метки жеста пишет расширение колонок, рисует их тема; здесь — что они
	 * доезжают до заголовков и уходят вместе с перестановкой одной проверкой.
	 */
	it('метки жеста — на заголовках: data-shift, data-landing; встала — меток нет', async () => {
		const ID: TTableColumnSource = { field: 'id', text: '№', reorderable: true }
		const engine = engineOf('none', [ANNA], [...MOVABLE, ID])
		const { columns } = engine.extensions
		const gesture = (header: HTMLElement) =>
			['dragging', 'landing', 'drop', 'shift']
				.filter((mark) => header.hasAttribute(`data-${mark}`))
				.map((mark) => `${mark}=${header.getAttribute(`data-${mark}`)}`)

		const fixture = await renderEngine(EngineHost, engine)

		const [name] = columns.columns

		apply(fixture, () => {
			columns.dragStart(name)
			columns.dragOver(2)
			columns.dragDrop()
		})

		expect(findAll('.so-table-column').map(gesture)).toEqual([
			['dragging=true', 'landing=true'],
			['shift=start'],
			['drop=after', 'shift=start'],
		])

		apply(fixture, () => columns.dragEnd())

		expect(findAll('.so-table-column').map(text)).toEqual(['Возраст', '№', 'Имя'])
		expect(findAll('.so-table-row__cell').map(text)).toEqual(['30', '1', 'Анна'])
		expect(findAll('.so-table-column').flatMap(gesture)).toEqual([])
	})
})

/**
 * Сетка — наборы коллекции в разметке и плагин сетки на корне. Ходьбу и выбор
 * считает ядро (`core/__tests__/table-grid.spec.ts`), клавиши — плагин
 * (`plugins/__tests__/table-grid.plugin.spec.ts`). Здесь — что наборы доезжают
 * до своих узлов, а плагин находит ячейки в разметке Angular: узлы строк из
 * реестра, ячейки по колонкам сетки, — на якорях блоков шаблона он не
 * спотыкается.
 */
describe('сетка', () => {
	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div
			so-table
			[items]="items()"
			[columns]="columns()"
			mode="multiple"
			grid
		></div>`,
	})
	class GridHost extends TDataHost {}

	it('роль grid и остановка Tab — у таблицы, ячейки и заголовки фокус только принимают', async () => {
		await renderData(GridHost, [ANNA, BORIS], [NAME, AGE])

		const table = find('.so-table')

		expect(table.getAttribute('role')).toBe('grid')
		expect(table.getAttribute('tabindex')).toBe('0')
		expect(table.getAttribute('aria-multiselectable')).toBe('true')
		expect(table.dataset['grid']).toBe('true')
		expect(find('.so-table__select').getAttribute('tabindex')).toBe('-1')

		for (const header of findAll('.so-table-column')) {
			expect(header.getAttribute('tabindex')).toBe('-1')
		}

		for (const cell of findAll('.so-table-row__cell, .so-table-row__select')) {
			expect(cell.getAttribute('tabindex')).toBe('-1')
		}

		expect(findAll('.so-table-row').map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'false',
		])
	})

	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [items]="items()" [columns]="columns()" mode="multiple"></div>`,
	})
	class PlainHost extends TDataHost {}

	it('без сетки — простая таблица: ни роли, ни tabindex, ни aria-selected', async () => {
		await renderData(PlainHost, [ANNA], [NAME])

		expect(find('.so-table').hasAttribute('role')).toBe(false)
		expect(find('.so-table').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row__cell').hasAttribute('tabindex')).toBe(false)
		expect(find('.so-table-row').hasAttribute('aria-selected')).toBe(false)
	})

	it('Tab в таблицу — на ячейку, стрелка — на соседнюю, пробел — выбор строки', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		const fixture = await renderEngine(EngineHost, engine)

		apply(fixture, () => find('.so-table').focus())

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(find('.so-table-column'))

		press(fixture, focused(), 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(fixture, cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Выбор пишет строке `data-selected` (в сетке ещё `aria-selected`), и Angular
 * перепроверяет её шаблон — и выражения шаблона `cell` в её ячейках вместе с
 * ним: своей единицы перерисовки у ячеек, как `_TableRowCells` у Vue, нет.
 * Но ни ячеек, ни узлов вывода шаблона выбор не пересоздаёт: петля держит
 * ячейку по колонке, а вывод шаблона (`ngTemplateOutlet`) пересоздаёт
 * представление только с новым шаблоном — смену контекста он отдаёт тому же
 * представлению.
 *
 * Поэтому считаются не вызовы слота, как у React, а узлы: узел, который
 * нарисовал шаблон, — тот же после «выбрать все», выбора в сетке и смены
 * входа таблицы. Новая запись строки рисует новое значение в тех же узлах и
 * только в своих ячейках, новый шаблон — новые узлы во всех.
 */
describe('перерисовка ячеек', () => {
	@Component({
		standalone: true,
		imports: [TTableComponent, SlotDirective],
		template: `<div so-table [engine]="engine()" [aria_label]="label()">
			@if (marked()) {
				<ng-template slot="cell" let-value="value"
					><i class="probe">{{ value }}!</i></ng-template
				>
			} @else {
				<ng-template slot="cell" let-value="value"
					><i class="probe">{{ value }}</i></ng-template
				>
			}
		</div>`,
	})
	class ProbeHost extends TEngineHost {
		readonly label = signal<string | undefined>(undefined)
		readonly marked = signal(false)
	}

	/** Узлы, которые нарисовал шаблон ячеек, — по порядку документа. */
	const probes = () => findAll('.so-table-row__cell .probe')

	/** Узлы шаблона — те же, что были: ни один не пересоздан. */
	function expectSameNodes(before: readonly HTMLElement[]): void {
		const after = probes()

		expect(after).toHaveLength(before.length)
		after.forEach((node, index) => expect(node).toBe(before[index]))
	}

	/** Текст ячеек по строкам. */
	const cellTexts = () =>
		findAll('.so-table-row').map((row) => findAll('.so-table-row__cell', row).map(text))

	it('шаблон рисует содержимое каждой ячейки', async () => {
		await renderEngine(ProbeHost, engineOf('none'))

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '41'],
			['Вера', '25'],
		])
		expect(probes()).toHaveLength(6)
	})

	it('«выбрать все» и снятие выбора узлов шаблона не пересоздают', async () => {
		const fixture = await renderEngine(ProbeHost, engineOf('multiple'))
		const before = probes()
		const head = checkBoxInput('.so-table__select')

		click(fixture, head)

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])

		click(fixture, head)

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		expectSameNodes(before)
	})

	it('таблица перерисована сменой входа — узлы шаблона те же', async () => {
		const fixture = await renderEngine(ProbeHost, engineOf('none'))
		const before = probes()

		apply(fixture, () => fixture.componentInstance.label.set('Сотрудники'))

		expect(find('.so-table').getAttribute('aria-label')).toBe('Сотрудники')
		expectSameNodes(before)
	})

	it('запись строки сменилась — новое значение в тех же узлах её ячеек, остальные не тронуты', async () => {
		const engine = engineOf('none')
		const fixture = await renderEngine(ProbeHost, engine)
		const before = probes()

		apply(fixture, () => {
			rowOf(engine, 2).data = { ...BORIS, age: 42 }
		})

		expect(cellTexts()).toEqual([
			['Анна', '30'],
			['Борис', '42'],
			['Вера', '25'],
		])
		expectSameNodes(before)
	})

	/**
	 * Ячейки строки — новые записи на каждую смену, а петля держит узел ячейки
	 * по колонке: новая запись рисуется в том же узле, и фокус сетки на нём
	 * остаётся.
	 */
	it('запись строки сменилась — узлы её ячеек те же', async () => {
		const engine = engineOf('none')
		const fixture = await renderEngine(EngineHost, engine)

		const boris = findAll('.so-table-row')[1]
		const before = findAll('.so-table-row__cell', boris)

		apply(fixture, () => {
			rowOf(engine, 2).data = { ...BORIS, age: 42 }
		})

		const after = findAll('.so-table-row__cell', boris)

		expect(after.map(text)).toEqual(['Борис', '42'])
		after.forEach((cell, index) => expect(cell).toBe(before[index]))
	})

	it('в сетке выбор пробелом узлов шаблона не пересоздаёт', async () => {
		const engine = engineOf('multiple')

		engine.extensions.grid.grid = true

		const fixture = await renderEngine(ProbeHost, engine)
		const before = probes()

		apply(fixture, () => find('.so-table').focus())
		press(fixture, focused(), 'ArrowDown')

		const cell = find('.so-table-row th')

		expect(document.activeElement).toBe(cell)

		press(fixture, cell, ' ')

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect(find('.so-table-row').getAttribute('aria-selected')).toBe('true')
		expectSameNodes(before)
	})

	it('новый шаблон — ячейки всех строк нарисованы им, новыми узлами', async () => {
		const fixture = await renderEngine(ProbeHost, engineOf('none'))
		const before = probes()

		apply(fixture, () => fixture.componentInstance.marked.set(true))

		expect(cellTexts()).toEqual([
			['Анна!', '30!'],
			['Борис!', '41!'],
			['Вера!', '25!'],
		])

		const after = probes()

		expect(after).toHaveLength(6)
		after.forEach((node) => expect(before).not.toContain(node))
	})
})

/**
 * Клик по чекбоксу браузер переключает сам, до обработчиков. Выбор — решение
 * модели: подписчик `item:select:before` его отменяет, и тогда ни поле, ни
 * строка отмеченными не остаются.
 */
describe('отменённый выбор', () => {
	it('чекбокс строки: выбор отменён — поле не отмечено, строка не выбрана', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		const fixture = await renderEngine(EngineHost, engine)

		const anna = find('.so-table-row')
		const input = checkBoxInput('.so-table-row__select', anna)

		click(fixture, input)

		expect(engine.extensions.selection.selected).toEqual([])
		expect(input.checked).toBe(false)
		expect(anna.dataset['selected']).toBe('false')
	})

	it('чекбокс шапки: выбор отменён — поле не отмечено и не «часть»', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		const fixture = await renderEngine(EngineHost, engine)

		const head = checkBoxInput('.so-table__select')

		click(fixture, head)

		expect(engine.extensions.selection.selected).toEqual([])
		expect([head.checked, head.indeterminate]).toEqual([false, false])
	})

	it('чекбокс шапки из «части»: выбор отменён — «часть» остаётся', async () => {
		const engine = engineOf('multiple')

		engine.extensions.selection.select(rowOf(engine, 1))
		engine.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())

		const fixture = await renderEngine(EngineHost, engine)

		const head = checkBoxInput('.so-table__select')

		click(fixture, head)

		expect(engine.extensions.selection.selected).toEqual([rowOf(engine, 1)])
		expect([head.checked, head.indeterminate]).toEqual([false, true])
	})
})

/**
 * Окно (`<ng-container so-virtual>`): тело рисует то, что отдаёт коллекция
 * (`drawn`), — строки окна и распорки на месте пропущенных. Что попадает в
 * окно, решает ядро (`core/__tests__/table-virtual.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и замер
 * здесь подаётся ядру руками.
 */
describe('окно', () => {
	/** Движок строк над `count` записями. */
	function manyRows(count: number): TTableCollection {
		const records = Array.from({ length: count }, (_, index) => ({
			id: index + 1,
			name: `Строка ${index + 1}`,
			age: index,
		}))

		return engineOf('multiple', records)
	}

	@Component({
		standalone: true,
		imports: [TTableComponent, TVirtualComponent],
		template: `<ng-container so-virtual
			><div so-table [engine]="engine()"></div
		></ng-container>`,
	})
	class WindowHost extends TEngineHost {}

	/** Замер, как его подаёт плагин окна: полоса от верха таблицы и шаг строк. */
	function measure(
		fixture: ComponentFixture<unknown>,
		engine: TTableCollection,
		top: number,
		bottom: number,
	): void {
		apply(fixture, () => engine.extensions.draw.notifyViewport({ top, bottom, step: 40 }))
	}

	it('до замера — первые 50 строк; у таблицы число строк, у шапки и строк — номера', async () => {
		await renderEngine(WindowHost, manyRows(80))

		const rows = findAll('.so-table-row')
		const table = find('table.so-table')

		expect(rows).toHaveLength(50)
		expect(table.getAttribute('aria-rowcount')).toBe('81')
		expect(table.dataset['virtual']).toBe('true')
		expect(find('.so-table__head-row').getAttribute('aria-rowindex')).toBe('1')
		expect(rows[0].getAttribute('aria-rowindex')).toBe('2')
	})

	it('по замеру — распорки на месте пропущенных: скрыты, во всю ширину, высотой в строки', async () => {
		const engine = manyRows(80)
		const fixture = await renderEngine(WindowHost, engine)

		measure(fixture, engine, 1200, 1600)

		const body = find('.so-table__body')
		const fillers = findAll('.so-table__filler-row', body)

		expect(fillers).toHaveLength(2)
		expect(body.firstElementChild).toBe(fillers[0])
		expect(body.lastElementChild).toBe(fillers[1])
		expect(fillers.map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		// Места 20–49: перед ними 20 строк, за ними 30
		expect(
			fillers.map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual(['800px', '1200px'])
		// Колонка выбора и две колонки
		expect(find('.so-table__filler', fillers[0]).getAttribute('colspan')).toBe('3')
		expect(findAll('.so-table-row', body)).toHaveLength(30)
	})

	/**
	 * Строки и распорки — одной петлёй с ключом записи: строка, которая
	 * осталась в окне, — тот же узел, хотя распорка перед ней сменилась.
	 */
	it('строка, оставшаяся в окне, при сдвиге окна не перемонтируется', async () => {
		const engine = manyRows(80)
		const fixture = await renderEngine(WindowHost, engine)

		measure(fixture, engine, 1200, 1600)

		const kept = findAll('.so-table-row').find(
			(row) => row.getAttribute('aria-rowindex') === '40',
		)

		measure(fixture, engine, 1240, 1640)

		expect(kept).toBeDefined()
		expect(
			findAll('.so-table-row').find((row) => row.getAttribute('aria-rowindex') === '40'),
		).toBe(kept)
	})

	it('без обёртки — все строки, без распорок и номеров', async () => {
		await renderData(DataHost, [ANNA, BORIS], [NAME])

		expect(findAll('.so-table-row')).toHaveLength(2)
		expect(findAll('.so-table__filler-row')).toEqual([])
		expect(find('table.so-table').hasAttribute('aria-rowcount')).toBe(false)
		expect(find('.so-table__head-row').hasAttribute('aria-rowindex')).toBe(false)
	})
})

/**
 * Закреплённая шапка (`stickyHead`) — свойство таблицы: ядро пишет его в
 * набор `dataset`, база раскладывает набор на корне. Закрепляет шапку тема
 * (`playground/vue/browser/table-sticky-head.spec.ts`).
 */
describe('закреплённая шапка', () => {
	@Component({
		standalone: true,
		imports: [TTableComponent],
		template: `<div
			so-table
			[items]="items()"
			[columns]="columns()"
			[stickyHead]="sticky()"
		></div>`,
	})
	class StickyHost extends TDataHost {
		readonly sticky = signal(false)
	}

	it('data-sticky-head на корне — по входу и вместе с ним', async () => {
		const fixture = await renderData(StickyHost, [ANNA, BORIS], [NAME])

		const table = find('table.so-table')

		expect(table.dataset['stickyHead']).toBe('false')

		apply(fixture, () => fixture.componentInstance.sticky.set(true))

		expect(table.dataset['stickyHead']).toBe('true')

		apply(fixture, () => fixture.componentInstance.sticky.set(false))

		expect(table.dataset['stickyHead']).toBe('false')
	})

	/** Зачем селектор — см. `SizedHost`. */
	@Component({
		selector: 'probe-owner',
		standalone: true,
		imports: [TTableComponent],
		template: `<div so-table [ctrl]="owner" [engine]="engine()"></div>`,
	})
	class OwnerHost extends TEngineHost {
		readonly owner = new TTable()
	}

	it('с инстанса: шапку закрепили — атрибут на корне', async () => {
		const fixture = await renderEngine(OwnerHost, engineOf('none'))

		expect(find('table.so-table').dataset['stickyHead']).toBe('false')

		apply(fixture, () => {
			fixture.componentInstance.owner.stickyHead = true
		})

		expect(find('table.so-table').dataset['stickyHead']).toBe('true')
	})
})

describe('типы', () => {
	it('входы фасада — по типам пропсов ядра', () => {
		expectTypeOf<TTableComponent['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TTableComponent['grid']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<NonNullable<TTableComponent['columns']>>().toExtend<
			readonly TTableColumnSource[]
		>()
	})

	it('выходы фасада — выходы таблицы: ширина и место колонки от пользователя', () => {
		expectTypeOf<TTableComponent['soColumnResize']>().toEqualTypeOf<
			EventEmitter<TTableColumnResize>
		>()
		expectTypeOf<TTableComponent['soColumnMove']>().toEqualTypeOf<
			EventEmitter<TTableColumnMove>
		>()
	})
})
