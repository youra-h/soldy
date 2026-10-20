/**
 * Рендерер адаптера (`provideAttrs()`) на сервере и после гидратации.
 *
 * Сервер рисует тем же рендерером, что браузер (`ɵDomRendererFactory2`), и
 * написанное на компоненте с внутренним узлом уходит в разметку уже на узле:
 * статику переносит база, привязки — рендерер адаптера. Пометка гидратации
 * (`ngh`), которую сервер ставит на хост компонента тем же рендерером,
 * остаётся на хосте: увезённая на узел, она ломала бы гидратацию — Angular не
 * узнал бы компонент и нарисовал узел второй раз.
 *
 * После гидратации узлы — те же, что напечатал сервер, второго нет, консоль
 * чиста (её сторожит окружение спеков), а смена привязки и слушатель идут на
 * тот же узел. Таблица — те же одиннадцать компонентов, что в `attrs.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, signal, type ApplicationRef } from '@angular/core'
import type { TTableColumnSource } from '@soldy-ui/core'
import {
	TAccordionComponent,
	TAccordionItemComponent,
	TCheckBoxComponent,
	TInputComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSwitchComponent,
	TTableComponent,
	TTabsComponent,
	TTabsItemComponent,
	TTextareaComponent,
} from '@soldy-ui/angular'
import { find } from './mount'
import { hydrate, leavePage, loadPage, renderOnServer } from './server'

/**
 * Что потребитель пишет на компонент: класс — метка корня пробы, статика,
 * привязки атрибута и свойства и слушатель фокуса.
 */
const WRITTEN = `class="probe"
	data-static="s"
	[attr.data-probe]="probe()"
	[title]="title()"
	(focus)="focused.push('focus')"`

const TABLE_COLUMNS: TTableColumnSource[] = [{ field: 'name', text: 'Имя' }]

@Component({
	selector: 'app-root',
	imports: [
		TInputComponent,
		TTextareaComponent,
		TCheckBoxComponent,
		TSwitchComponent,
		TRadioGroupComponent,
		TRadioGroupItemComponent,
		TListBoxComponent,
		TListBoxItemComponent,
		TTabsComponent,
		TTabsItemComponent,
		TAccordionComponent,
		TAccordionItemComponent,
		TTableComponent,
	],
	template: `<div so-input ${WRITTEN}></div>
		<div so-textarea ${WRITTEN}></div>
		<span so-check-box ${WRITTEN}></span>
		<span so-switch ${WRITTEN}></span>
		<div so-radio-group><label so-radio-group-item value="a" ${WRITTEN}></label></div>
		<div so-list-box ${WRITTEN}><div so-list-box-item value="a" text="A"></div></div>
		<div so-list-box><div so-list-box-item value="b" text="B" ${WRITTEN}></div></div>
		<div so-tabs ${WRITTEN}><div so-tabs-item value="a" text="A" active></div></div>
		<div so-tabs><div so-tabs-item value="b" text="B" active ${WRITTEN}></div></div>
		<div so-accordion><div so-accordion-item value="a" text="A" ${WRITTEN}></div></div>
		<div so-table [items]="items" [columns]="columns" ${WRITTEN}></div>`,
})
class AttrsPage {
	readonly probe = signal('a')
	readonly title = signal('Подсказка')
	readonly focused: string[] = []
	readonly items = [{ data: { id: 1, name: 'Анна' } }]
	readonly columns = TABLE_COLUMNS
}

/** Случай: корень пробы в странице и внутренний узел в нём. */
const CASES: ReadonlyArray<readonly [string, string, string]> = [
	['Input', '.probe[so-input]', 'input'],
	['Textarea', '.probe[so-textarea]', 'textarea'],
	['CheckBox', '.probe[so-check-box]', 'input'],
	['Switch', '.probe[so-switch]', 'input'],
	['RadioGroup.Item', '.probe[so-radio-group-item]', 'input'],
	['ListBox', '.probe[so-list-box]', '.so-list-box__list'],
	['ListBox.Item', '.probe[so-list-box-item]', '[so-button]'],
	['Tabs', '.probe[so-tabs]', '.so-tabs__list'],
	['Tabs.Item', '.probe[so-tabs-item]', '[so-button]'],
	['Accordion.Item', '.probe[so-accordion-item]', '.so-accordion-item__header'],
	['Table', '.probe[so-table]', 'table'],
]

/** Страница сервера, разобранная документом, — как её получил бы браузер. */
async function serverPage(): Promise<Document> {
	return new DOMParser().parseFromString(await renderOnServer(AttrsPage), 'text/html')
}

describe.each(CASES)('%s · сервер', (_name, root, node) => {
	/**
	 * Строка элемента коллекции — сама корень кнопки, и пометка на ней — своя,
	 * кнопки: сверяется пометка хоста.
	 */
	it('статика и привязки — на узле, пометка гидратации ngh — на хосте', async () => {
		const page = await serverPage()
		const host = find(page, root, HTMLElement)
		const inner = find(host, node, HTMLElement)

		expect(inner.getAttribute('data-static')).toBe('s')
		expect(inner.getAttribute('data-probe')).toBe('a')
		expect(inner.getAttribute('title')).toBe('Подсказка')
		expect(host.hasAttribute('data-static')).toBe(false)
		expect(host.hasAttribute('data-probe')).toBe(false)
		expect(host.hasAttribute('title')).toBe(false)
		expect(host.hasAttribute('ngh')).toBe(true)
	})
})

/** Страница сервера в документе и гидратация над ней: приложение браузера и его страница. */
async function hydrated(): Promise<{ app: ApplicationRef; page: AttrsPage }> {
	const app = await hydrate(AttrsPage)

	await app.whenStable()

	const page: unknown = app.components[0]?.instance

	if (!(page instanceof AttrsPage)) throw new Error('Корень приложения — не AttrsPage')

	return { app, page }
}

describe.each(CASES)('%s · гидратация', (_name, root, node) => {
	afterEach(() => {
		leavePage()
	})

	it('узел — тот, что напечатал сервер, второго нет; смена привязки и (focus) — на нём', async () => {
		loadPage(await renderOnServer(AttrsPage))

		const served = find(find(document, root, HTMLElement), node, HTMLElement)
		const { app, page } = await hydrated()
		const host = find(document, root, HTMLElement)
		const inner = find(host, node, HTMLElement)

		expect(inner).toBe(served)
		expect(host.querySelectorAll(node)).toHaveLength(1)
		expect(inner.getAttribute('data-probe')).toBe('a')
		expect(host.hasAttribute('data-probe')).toBe(false)

		page.probe.set('b')
		page.title.set('Другая')
		await app.whenStable()

		expect(inner.getAttribute('data-probe')).toBe('b')
		expect(inner.title).toBe('Другая')
		expect(host.hasAttribute('data-probe')).toBe(false)

		inner.dispatchEvent(new FocusEvent('focus'))
		host.dispatchEvent(new FocusEvent('focus'))

		expect(page.focused).toEqual(['focus'])
	})
})
