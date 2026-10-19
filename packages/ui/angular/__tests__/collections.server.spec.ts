/**
 * Коллекции на сервере и гидратация их разметки.
 *
 * Элемент коллекции входит в неё в своём `ngOnInit`, а он идёт и на сервере.
 * Поэтому сервер рисует полностью и список из данных, и элементы разметки —
 * вместе с тем, что пишет им коллекция: выбор, раскрытость, отметку, общий
 * `name` радио, остановки Tab. Панель таба находит свой таб к своей сборке, и
 * панель активного таба тоже в разметке сервера — с содержимым и связкой;
 * неактивная панель — скрытый элемент потребителя без содержимого. Так же, как
 * у Vue и Svelte; у React элементы разметки входят в коллекцию при коммите, и
 * сервер рисует их без этого.
 *
 * `id` частей — связки «таб ↔ панель» и «заголовок ↔ панель» — и общий `name`
 * радио строят плагины связок от id монтирования, а он у Angular — номер
 * сборки компонента в приложении: у каждого запроса и у браузера приложение
 * своё, а гидратация собирает компоненты в том же порядке, что и сервер. Два
 * рендера одной страницы, параллельные или нет, дают одни и те же `id`, и
 * браузер после гидратации — тоже.
 *
 * Таблица из данных — так же: строки в её коллекции с самой сборки, и сервер
 * рисует их вместе с `id` заголовков строк и ссылками чекбоксов на них, а
 * подписи колонок — с их `id` и именем кнопки сортировки от локали. Окно
 * обёртки `<so-virtual>` коллекция подхватывает при сборке, и сервер отдаёт
 * уже окно — первые 50 элементов, — а гидратация собирает то же окно.
 *
 * Разметка сервера проверяется разобранной документом: порядок атрибутов у
 * сервера свой (`server.ts`).
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, type ApplicationRef, type Type } from '@angular/core'
import type { TTableColumnSource } from '@soldy-ui/core'
import {
	TAccordionComponent,
	TAccordionItemComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TTableComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
	TVirtualComponent,
} from '@soldy-ui/angular'
import { hydrate, leavePage, loadPage, renderOnServer } from './server'

/** Страница сервера, разобранная документом, — как её получил бы браузер. */
async function serverPage(app: Type<unknown>): Promise<Document> {
	return new DOMParser().parseFromString(await renderOnServer(app), 'text/html')
}

/** Узлы страницы по селектору. */
const all = (page: ParentNode, selector: string): Element[] => [...page.querySelectorAll(selector)]

/** Значение атрибута у каждого узла. */
const attributeOf = (nodes: readonly Element[], name: string) =>
	nodes.map((node) => node.getAttribute(name))

/** Показанные панели: неактивная — скрытый элемент потребителя. */
const shownPanels = (page: ParentNode) =>
	all(page, '[role="tabpanel"]').filter(
		(panel) => !(panel instanceof HTMLElement) || panel.style.display !== 'none',
	)

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

describe('ListBox · серверный рендер', () => {
	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div so-list-box [items]="items" value="b"></div>`,
	})
	class ItemsPage {
		readonly items = ITEMS
	}

	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TListBoxComponent, TListBoxItemComponent],
		template: `<div so-list-box>
			<so-list-box-item value="a" text="A" />
			<so-list-box-item value="b" text="B" selected />
		</div>`,
	})
	class MarkupPage {}

	it('список из items — полностью: выбранное — aria-selected', async () => {
		const page = await serverPage(ItemsPage)

		expect(attributeOf(all(page, '.so-list-box-item .so-button'), 'aria-selected')).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('элементы разметки — с выбором и остановками Tab от коллекции', async () => {
		const page = await serverPage(MarkupPage)
		const rows = all(page, '.so-list-box-item .so-button')

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '-1'])
		expect(attributeOf(all(page, '.so-list-box-item'), 'data-selected')).toEqual([
			'false',
			'true',
		])
	})
})

describe('Tabs · серверный рендер', () => {
	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TTabsComponent, TTabsContentComponent],
		template: `<div so-tabs [items]="items">
			<div so-tabs-content slot="content" value="a">Панель A</div>
			<div so-tabs-content slot="content" value="b">Панель B</div>
		</div>`,
	})
	class ItemsPage {
		readonly items = [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', _: { active: true } },
		]
	}

	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TTabsComponent, TTabsItemComponent, TTabsContentComponent],
		template: `<div so-tabs>
			<so-tabs-item value="a" text="A" />
			<so-tabs-item value="b" text="B" active />
			<div so-tabs-content slot="content" value="b">Панель B</div>
		</div>`,
	})
	class MarkupPage {}

	it.each([
		['табы из items', ItemsPage],
		['табы и панели из разметки', MarkupPage],
	] as const)(
		'%s: aria-selected, связка таба с панелью и панель активного таба',
		async (_name, app) => {
			const page = await serverPage(app)
			const rows = all(page, '[role="tab"]')
			const panels = shownPanels(page)

			expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
			expect(panels.map((panel) => panel.textContent)).toEqual(['Панель B'])
			expect(rows[1].getAttribute('aria-controls')).toBe(panels[0].id)
			expect(panels[0].getAttribute('aria-labelledby')).toBe(rows[1].id)
		},
	)

	it('неактивная панель на сервере — скрытый элемент без содержимого', async () => {
		const page = await serverPage(ItemsPage)
		const hidden = all(page, '[role="tabpanel"]').filter(
			(panel) => panel instanceof HTMLElement && panel.style.display === 'none',
		)

		expect(hidden.map((panel) => panel.textContent)).toEqual([''])
	})
})

describe('Accordion · серверный рендер', () => {
	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TAccordionComponent],
		template: `<div so-accordion [items]="items"></div>`,
	})
	class ItemsPage {
		readonly items = [
			{ value: 'a', text: 'A', _: { selected: true } },
			{ value: 'b', text: 'B' },
		]
	}

	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TAccordionComponent, TAccordionItemComponent],
		template: `<div so-accordion>
			<so-accordion-item value="a" text="A" selected>Содержимое A</so-accordion-item>
			<so-accordion-item value="b" text="B">Содержимое B</so-accordion-item>
		</div>`,
	})
	class MarkupPage {}

	it.each([
		['секции из items', ItemsPage],
		['секции из разметки', MarkupPage],
	] as const)('%s: aria-expanded и связка заголовка с панелью', async (_name, app) => {
		const page = await serverPage(app)
		const heads = all(page, '.so-accordion-item__header')
		const bodies = all(page, '.so-accordion-item__content')

		expect(attributeOf(heads, 'aria-expanded')).toEqual(['true', 'false'])
		expect(attributeOf(heads, 'aria-controls')).toEqual(bodies.map((node) => node.id))
		expect(attributeOf(bodies, 'aria-labelledby')).toEqual(heads.map((node) => node.id))
	})
})

describe('RadioGroup · серверный рендер', () => {
	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TRadioGroupComponent],
		template: `<div so-radio-group name="delivery" value="b" [items]="items"></div>`,
	})
	class ItemsPage {
		readonly items = [{ value: 'a' }, { value: 'b' }]
	}

	@Component({
		selector: 'app-root',
		standalone: true,
		imports: [TRadioGroupComponent, TRadioGroupItemComponent],
		template: `<div so-radio-group value="b">
			<label so-radio-group-item value="a">Первый</label>
			<label so-radio-group-item value="b">Второй</label>
			<label so-radio-group-item value="c">Третий</label>
		</div>`,
	})
	class MarkupPage {}

	it('радио из items — с общим name и отметкой', async () => {
		const page = await serverPage(ItemsPage)
		const fields = all(page, 'input[type="radio"]')

		expect(attributeOf(fields, 'name')).toEqual(['delivery', 'delivery'])
		expect(fields.map((field) => field.hasAttribute('checked'))).toEqual([false, true])
	})

	it('радио из разметки — с общим name и отметкой', async () => {
		const page = await serverPage(MarkupPage)
		const fields = all(page, 'input[type="radio"]')
		const names = new Set(attributeOf(fields, 'name'))

		expect(fields.map((field) => field.hasAttribute('checked'))).toEqual([false, true, false])
		expect(names.size).toBe(1)
		expect([...names][0]).toMatch(/\S/)
	})
})

/** Страница: табы и панели, секции, радио и список — всё разметкой. */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		TTabsComponent,
		TTabsItemComponent,
		TTabsContentComponent,
		TAccordionComponent,
		TAccordionItemComponent,
		TRadioGroupComponent,
		TRadioGroupItemComponent,
		TListBoxComponent,
		TListBoxItemComponent,
	],
	template: `<div so-tabs>
			<so-tabs-item value="a" text="A" active />
			<so-tabs-item value="b" text="B" />
			<div so-tabs-content slot="content" value="a">Панель A</div>
			<div so-tabs-content slot="content" value="b">Панель B</div>
		</div>
		<div so-accordion>
			<so-accordion-item value="a" text="A">Содержимое A</so-accordion-item>
			<so-accordion-item value="b" text="B">Содержимое B</so-accordion-item>
		</div>
		<div so-radio-group>
			<label so-radio-group-item value="a">Первый</label>
			<label so-radio-group-item value="b">Второй</label>
		</div>
		<div so-list-box>
			<so-list-box-item value="a" text="Альфа" />
			<so-list-box-item value="b" text="Бета" />
		</div>`,
})
class CollectionsPage {}

/** `id` и `name` страницы: табов, панелей табов, заголовков и панелей секций, радио. */
function idsOf(page: ParentNode) {
	return {
		tabs: attributeOf(all(page, '[role="tab"]'), 'id'),
		panels: attributeOf(all(page, '[role="tabpanel"]'), 'id'),
		heads: attributeOf(all(page, '.so-accordion-item__header'), 'id'),
		bodies: attributeOf(all(page, '.so-accordion-item__content'), 'id'),
		names: attributeOf(all(page, 'input[type="radio"]'), 'name'),
	}
}

describe('id и name — от номера сборки', () => {
	it('два параллельных рендера одной страницы дают одни и те же id и name', async () => {
		const [first, second] = await Promise.all([
			renderOnServer(CollectionsPage),
			renderOnServer(CollectionsPage),
		])
		const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html')

		expect(idsOf(parse(first))).toEqual(idsOf(parse(second)))
	})

	it('id у частей свои, name у радио группы — один', async () => {
		const ids = idsOf(await serverPage(CollectionsPage))

		expect(new Set([...ids.tabs, ...ids.panels, ...ids.heads, ...ids.bodies]).size).toBe(8)
		expect(new Set(ids.names).size).toBe(1)
	})

	/** Счётчик набора даёт `so-<n>`: им набор берёт, когда адаптер id монтирования не передал. */
	it('ни один id и name не от счётчика набора', async () => {
		const ids = idsOf(await serverPage(CollectionsPage))

		for (const id of [...ids.tabs, ...ids.panels, ...ids.heads, ...ids.bodies, ...ids.names]) {
			expect(id).toMatch(/^ng-\d+-/)
		}
	})
})

describe('гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	/** Разметка сервера в документе и гидратация над ней. */
	async function hydrated(): Promise<ApplicationRef> {
		loadPage(await renderOnServer(CollectionsPage))

		const app = await hydrate(CollectionsPage)

		await app.whenStable()

		return app
	}

	/** Узел документа по селектору и тексту. */
	function nodeOf(selector: string, text: string): HTMLElement {
		const node = all(document, selector).find(
			(candidate) => candidate.textContent?.trim() === text,
		)

		if (!(node instanceof HTMLElement)) throw new Error(`${selector} «${text}» нет`)

		return node
	}

	it('узлы сервера переиспользуются, id и name у браузера те же, ошибок нет', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')

		loadPage(await renderOnServer(CollectionsPage))

		const server = idsOf(document)
		const tab = nodeOf('[role="tab"]', 'B')
		const radio = all(document, 'input[type="radio"]')[0]
		const app = await hydrate(CollectionsPage)

		await app.whenStable()

		expect(nodeOf('[role="tab"]', 'B')).toBe(tab)
		expect(all(document, 'input[type="radio"]')[0]).toBe(radio)
		expect(idsOf(document)).toEqual(server)
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})

	it('после гидратации выбор доходит до разметки', async () => {
		const app = await hydrated()

		nodeOf('[role="tab"]', 'B').click()
		nodeOf('.so-accordion-item__header', 'B').click()
		all(document, 'input[type="radio"]')
			.filter((field): field is HTMLInputElement => field instanceof HTMLInputElement)
			.find((field) => field.value === 'b')
			?.click()
		nodeOf('.so-list-box-item .so-button', 'Бета').click()
		await app.whenStable()

		expect(shownPanels(document).map((panel) => panel.textContent)).toEqual(['Панель B'])
		expect(attributeOf(all(document, '.so-accordion-item__header'), 'aria-expanded')).toEqual([
			'false',
			'true',
		])
		expect(
			all(document, 'input[type="radio"]')
				.filter((field): field is HTMLInputElement => field instanceof HTMLInputElement)
				.map((field) => field.checked),
		).toEqual([false, true])
		expect(attributeOf(all(document, '.so-list-box-item .so-button'), 'aria-selected')).toEqual(
			['false', 'true'],
		)
	})
})

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end', sortable: true }

/** Таблица из данных с колонкой выбора, сортируемой колонкой и ручкой ширины. */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TTableComponent],
	template: `<div so-table [items]="items" [columns]="columns" mode="multiple"></div>`,
})
class TablePage {
	readonly items = [
		{ data: { id: 1, name: 'Анна', age: 30 } },
		{ data: { id: 2, name: 'Борис', age: 41 } },
	]
	readonly columns = [NAME, { ...AGE, resizable: true, width: 120 }]
}

/** Связки таблицы: `id` заголовков строк и подписей колонок и ссылки на них. */
function tableIdsOf(page: ParentNode) {
	return {
		rowHeaders: attributeOf(all(page, 'th[scope="row"]'), 'id'),
		captions: attributeOf(all(page, '.so-table-column__text'), 'id'),
		checkBoxes: attributeOf(all(page, '.so-table-row__select input'), 'aria-labelledby'),
		headers: attributeOf(all(page, '.so-table-column'), 'aria-labelledby'),
		resizers: attributeOf(all(page, '.so-table-column__resizer input'), 'aria-labelledby'),
		sorts: attributeOf(all(page, '.so-table-column__sort'), 'aria-label'),
	}
}

describe('Table · серверный рендер', () => {
	/**
	 * Строки из данных — в коллекции с самой сборки: сервер рисует их со
	 * ссылками чекбоксов на заголовки строк. Имя кнопки сортировки плагин имён
	 * пишет при сборке — оно уже в разметке сервера.
	 */
	it('таблица из данных — со строками, связками и именем кнопки сортировки', async () => {
		const page = await serverPage(TablePage)
		const ids = tableIdsOf(page)

		expect(page.querySelector('div[so-table].so-table__viewport > table.so-table')).not.toBe(
			null,
		)
		expect(all(page, '.so-table-row').map((row) => row.textContent?.trim())).toEqual([
			'Анна30',
			'Борис41',
		])
		expect(ids.rowHeaders).toHaveLength(2)
		expect(ids.captions).toHaveLength(2)
		expect([...ids.rowHeaders, ...ids.captions].every((id) => id?.startsWith('ng-'))).toBe(true)
		expect(ids.checkBoxes).toEqual(ids.rowHeaders)
		expect(ids.headers).toEqual(ids.captions)
		expect(ids.resizers).toEqual([ids.captions[1]])
		expect(ids.sorts).toEqual(['Sort by Возраст'])
	})

	it('поле ручки — с ходом и шириной колонки', async () => {
		const page = await serverPage(TablePage)
		const field = page.querySelector('.so-table-column__resizer input')

		expect(field?.getAttribute('type')).toBe('range')
		expect(field?.getAttribute('value')).toBe('120')
	})
})

describe('Table · гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	it('узлы сервера переиспользуются, id и ссылки у браузера те же, ошибок нет', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')

		loadPage(await renderOnServer(TablePage))

		const server = tableIdsOf(document)
		const table = document.querySelector('table.so-table')
		const row = document.querySelector('.so-table-row')
		const app = await hydrate(TablePage)

		await app.whenStable()

		expect(document.querySelector('table.so-table')).toBe(table)
		expect(document.querySelector('.so-table-row')).toBe(row)
		expect(tableIdsOf(document)).toEqual(server)
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})

	/**
	 * Клик по чекбоксу слушает его плагин, а узел плагины получают кадром после
	 * отрисовки (`TElementPlugin`) — и после гидратации тоже.
	 */
	it('после гидратации выбор строки доходит до разметки', async () => {
		loadPage(await renderOnServer(TablePage))

		const app = await hydrate(TablePage)

		await app.whenStable()
		await new Promise((resolve) => requestAnimationFrame(resolve))

		const [anna] = all(document, '.so-table-row')
		const input = anna?.querySelector('.so-table-row__select input')

		if (!(input instanceof HTMLInputElement)) throw new Error('чекбокса строки нет')

		input.click()
		await app.whenStable()

		expect(attributeOf(all(document, '.so-table-row'), 'data-selected')).toEqual([
			'true',
			'false',
		])
		expect(input.checked).toBe(true)
	})
})

/** Список из восьмидесяти элементов в окне обёртки. */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TListBoxComponent, TVirtualComponent],
	template: `<so-virtual><div so-list-box [items]="items"></div></so-virtual>`,
})
class VirtualPage {
	readonly items = Array.from({ length: 80 }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

describe('Virtual · серверный рендер и гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	/**
	 * Окно коллекция подхватывает при сборке, а сборка идёт и на сервере:
	 * сервер отдаёт уже окно, первые 50 элементов, без распорок — замера на
	 * сервере нет.
	 */
	it('сервер отдаёт окно — первые 50 элементов, без распорок', async () => {
		const page = await serverPage(VirtualPage)

		expect(all(page, '.so-list-box-item')).toHaveLength(50)
		expect(all(page, '.so-list-box__filler')).toEqual([])
		expect(attributeOf(all(page, '.so-list-box-item .so-button'), 'aria-posinset').at(-1)).toBe(
			'50',
		)
	})

	it('гидратация сходится: то же окно на тех же узлах, ошибок нет', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')

		loadPage(await renderOnServer(VirtualPage))

		const first = document.querySelector('.so-list-box-item')
		const app = await hydrate(VirtualPage)

		await app.whenStable()

		expect(all(document, '.so-list-box-item')).toHaveLength(50)
		expect(document.querySelector('.so-list-box-item')).toBe(first)
		expect(
			attributeOf(all(document, '.so-list-box-item .so-button'), 'aria-setsize').at(-1),
		).toBe('80')
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})
})
