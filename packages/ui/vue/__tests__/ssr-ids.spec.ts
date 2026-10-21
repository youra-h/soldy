/**
 * `id` в разметке — от места компонента в дереве, а не от счётчика процесса, и
 * номер слоя — тоже не от него.
 *
 * Связки «таб ↔ панель», «заголовок ↔ панель» у Accordion, имена сеток
 * календаря, `id` частей поля даты, общий `name` радио строят плагины связок от
 * id монтирования
 * (`IPluginContext.createId`). Его даёт `useId` Vue через
 * `createVueAdapterContext`, и он у каждого монтирования свой — в том числе у
 * элемента из данных (`items`), который рисуется с готовым экземпляром.
 * Счётчик процесса на сервере общий для всех запросов, в браузере начинается
 * заново, и гидратация видела бы другие `id`.
 *
 * Номер слоя (`data-layer` и `z-index` панели и подложки) выдаёт как раз
 * счётчик процесса — стек слоёв в ядре один. Поэтому номер открывает узел
 * слоя (`ready`): в разметке сервера у открытого окна и панели номера нет,
 * гидратация с ней сходится, а номер приходит кадром узла.
 *
 * Сервер и браузер здесь — один процесс: рендер сервера уже сдвинул счётчик,
 * и экземпляры гидратации получают другие `uid`, как в настоящем браузере.
 */

// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { createSSRApp, h, type App, type VNode } from 'vue'
import { renderToString, type SSRContext } from 'vue/server-renderer'
import {
	Accordion,
	Calendar,
	DateInput,
	Dialog,
	Drawer,
	Field,
	Input,
	RadioGroup,
	RadioGroupItem,
	Table,
	Tabs,
	TabsContent,
	TabsItem,
	Textarea,
	LocaleProvider,
} from '@soldy-ui/vue'
import { ruRU } from '@soldy-ui/plugins'

const containers: HTMLElement[] = []
/** Приложения гидратации: снятое окно отпускает замок прокрутки и пометки фона. */
const apps: App[] = []

afterEach(() => {
	for (const app of apps.splice(0)) app.unmount()
	for (const container of containers.splice(0)) container.remove()
})

/**
 * Рендер сервера и гидратация той же разметки; предупреждения Vue — наружу.
 *
 * Страница сервера — целиком, с телепортами: панели оверлеев (Frame) Vue
 * рендерит не в разметку приложения, а в `context.teleports`, и серверная
 * страница кладёт их в начало `body`, перед приложением. Гидратация
 * телепорта ищет его содержимое с первого узла цели и запоминает, где
 * остановилась, на самой цели, поэтому `body` у каждого рендера свой.
 * Разметка сервера — приложение (`server`) и содержимое телепортов
 * (`teleported`).
 */
async function hydrate(render: () => VNode): Promise<{
	server: HTMLElement
	teleported: HTMLElement
	client: HTMLElement
	warnings: string[]
}> {
	const context: SSRContext = {}
	const html = await renderToString(createSSRApp({ render }), context)
	const server = document.createElement('div')
	const teleported = document.createElement('div')
	const client = document.createElement('div')
	const warnings: string[] = []

	server.innerHTML = html
	teleported.innerHTML = context.teleports?.body ?? ''
	client.innerHTML = html
	document.body = document.createElement('body')
	document.body.innerHTML = context.teleports?.body ?? ''
	document.body.append(client)
	containers.push(client)

	const app = createSSRApp({ render })

	app.config.warnHandler = (message) => warnings.push(message)
	app.mount(client)
	apps.push(app)

	return { server, teleported, client, warnings }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const attrs = (root: HTMLElement, selector: string, name: string) =>
	[...root.querySelectorAll(selector)].map((element) => element.getAttribute(name))

describe('id при гидратации', () => {
	it('поле без своего id — без атрибута: автоматического id у поля нет', async () => {
		const { client, warnings } = await hydrate(() => h(Input, { value: 'a' }))

		expect(warnings).toEqual([])
		expect(attrs(client, 'input', 'id')).toEqual([null])
	})

	it('заданный id — как есть', async () => {
		const { client, warnings } = await hydrate(() => h(Input, { id: 'field', value: 'a' }))

		expect(warnings).toEqual([])
		expect(attrs(client, 'input', 'id')).toEqual(['field'])
	})

	it('поле в поле формы: id поля, for подписи и справка у сервера и браузера одни', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Field, { label: 'Почта', helper: 'Подсказка' }, () => h(Input, { value: 'a' })),
		)
		const id = attrs(client, 'input', 'id')

		expect(warnings).toEqual([])
		expect(id).toEqual(attrs(server, 'input', 'id'))
		expect(id[0]).not.toBeNull()
		expect(attrs(client, 'label', 'for')).toEqual(id)
		expect(attrs(client, 'input', 'aria-describedby')).toEqual(
			attrs(server, '.so-field__helper', 'id'),
		)
	})

	it('группа в поле формы: ссылка на подпись у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Field, { label: 'Дата' }, () => h(DateInput)),
		)

		expect(warnings).toEqual([])
		expect(attrs(client, '.so-date-input', 'aria-labelledby')).toEqual(
			attrs(server, '.so-field__label', 'id'),
		)
	})

	it('Textarea со счётчиком в поле формы: справка и счётчик у сервера и браузера одни', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Field, { helper: 'Подсказка' }, () => h(Textarea, { counter: true })),
		)
		const parts = [
			...attrs(server, '.so-field__helper', 'id'),
			...attrs(server, '.so-textarea__counter', 'id'),
		].join(' ')

		expect(warnings).toEqual([])
		expect(attrs(client, '.so-textarea__counter', 'id')).toEqual(
			attrs(server, '.so-textarea__counter', 'id'),
		)
		expect(attrs(client, 'textarea', 'aria-describedby')).toEqual([parts])
	})

	it('табы из разметки: связка «таб ↔ панель» у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Tabs, null, {
				default: () => [
					h(TabsItem, { value: 'a', text: 'A', active: true }),
					h(TabsItem, { value: 'b', text: 'B' }),
				],
				content: () => [
					h(TabsContent, { value: 'a' }, () => 'Панель A'),
					h(TabsContent, { value: 'b' }, () => 'Панель B'),
				],
			}),
		)
		const controls = attrs(client, '[role="tab"]', 'aria-controls')

		expect(warnings).toEqual([])
		expect(attrs(client, '[role="tab"]', 'id')).toEqual(attrs(server, '[role="tab"]', 'id'))
		expect(controls).toEqual(attrs(server, '[role="tab"]', 'aria-controls'))
		expect(attrs(client, '.so-tabs__panel', 'id')).toEqual([controls[0]])
	})

	const items = [
		{ value: 'a', text: 'A' },
		{ value: 'b', text: 'B' },
	]

	it('табы из данных: связка у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() => h(Tabs, { items }))
		const ids = attrs(client, '[role="tab"]', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, '[role="tab"]', 'id'))
		expect(new Set(ids).size).toBe(2)
	})

	it('секции Accordion из данных: связка у сервера и браузера одна', async () => {
		const { server, client, warnings } = await hydrate(() => h(Accordion, { items }))

		expect(warnings).toEqual([])
		expect(attrs(client, '[aria-controls]', 'aria-controls')).toEqual(
			attrs(server, '[aria-controls]', 'aria-controls'),
		)
	})

	it('календарь: заголовки месяцев и имена сеток у сервера и браузера одни', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Calendar, { months: ['2026-09-01', '2026-10-01'] }),
		)
		const ids = attrs(client, '.so-calendar__title-text', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, '.so-calendar__title-text', 'id'))
		expect(attrs(client, '[role="grid"]', 'aria-labelledby')).toEqual(ids)
		expect(new Set(ids).size).toBe(2)
	})

	it('поле даты: id частей у сервера и браузера одни, редактируемости нет ни у кого', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(LocaleProvider, { locale: ruRU }, () => h(DateInput, { value: '2026-05-12' })),
		)
		const ids = attrs(client, '.so-date-input__segment', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, '.so-date-input__segment', 'id'))
		expect(new Set(ids).size).toBe(3)
		// Части редактируемыми делает только касание: сервер их не рисует такими
		expect(attrs(server, '.so-date-input__segment', 'contenteditable')).toEqual([
			null,
			null,
			null,
		])
	})

	it('таблица: заголовки строк и имена их чекбоксов у сервера и браузера одни', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Table, {
				items: [{ data: { name: 'Анна' } }, { data: { name: 'Борис' } }],
				columns: [{ field: 'name', text: 'Имя', rowHeader: true }],
				mode: 'multiple',
			}),
		)
		const ids = attrs(client, 'th[scope="row"]', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, 'th[scope="row"]', 'id'))
		expect(attrs(client, '.so-table-row__select input', 'aria-labelledby')).toEqual(ids)
		expect(new Set(ids).size).toBe(2)
	})

	it('таблица: заголовки колонок и их ручки названы подписью у сервера и браузера одинаково', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(Table, {
				items: [{ data: { name: 'Анна', age: 30 } }],
				columns: [
					{ field: 'name', text: 'Имя', resizable: true, width: 150 },
					{ field: 'age', text: 'Возраст', resizable: true, width: 100, sortable: true },
				],
			}),
		)
		const ids = attrs(client, '.so-table-column__text', 'id')

		expect(warnings).toEqual([])
		expect(ids).toEqual(attrs(server, '.so-table-column__text', 'id'))
		expect(attrs(client, '.so-table-column', 'aria-labelledby')).toEqual(ids)
		expect(attrs(client, '.so-table-column__resizer input', 'aria-labelledby')).toEqual(ids)
		expect(new Set(ids).size).toBe(2)
		// Имя кнопки сортировки — от локали, уже в серверной разметке
		expect(attrs(server, '.so-table-column__sort', 'aria-label')).toEqual(['Sort by Возраст'])
		expect(attrs(client, '.so-table-column__sort', 'aria-label')).toEqual(['Sort by Возраст'])
	})

	it('группа радио без своего имени: общий name у сервера и браузера один', async () => {
		const { server, client, warnings } = await hydrate(() =>
			h(RadioGroup, null, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
				h(RadioGroupItem, { value: 'b' }, () => 'Второй'),
			]),
		)
		const names = attrs(client, 'input', 'name')

		expect(warnings).toEqual([])
		expect(names).toEqual(attrs(server, 'input', 'name'))
		expect(new Set(names).size).toBe(1)
	})
})

/**
 * Окно и выезжающая панель, открытые уже в разметке сервера: окно — в
 * телепорте, панель с `contained` — на месте. Номер слоя у сервера свой,
 * поэтому в разметке его нет, а у браузера он приходит кадром узла — у панели
 * и подложки один, и `z-index` раскладки — он же.
 */
describe('номер слоя при гидратации', () => {
	it.each([
		['окно', () => h(Dialog, { visible: true }, () => 'Окно'), 'so-dialog'],
		[
			'выезжающая панель с contained',
			() => h('div', [h(Drawer, { visible: true, contained: true }, () => 'Панель')]),
			'so-drawer',
		],
	])('%s: без расхождений, номер — кадром узла', async (_, render, block) => {
		const { server, teleported, warnings } = await hydrate(render)
		const panel = `.${block}`
		const backdrop = `.${block}__backdrop`
		const printed = [server, teleported].flatMap((root) => [
			...root.querySelectorAll(`${panel}, ${backdrop}`),
		])

		expect(warnings).toEqual([])
		expect(printed).toHaveLength(2)
		expect(printed.map((node) => node.getAttribute('data-layer'))).toEqual([null, null])

		await nextFrame()

		const layer = attrs(document.body, panel, 'data-layer')[0]

		expect(layer).not.toBeNull()
		expect(attrs(document.body, backdrop, 'data-layer')).toEqual([layer])
		expect(
			[panel, backdrop].map((selector) =>
				[...document.body.querySelectorAll<HTMLElement>(selector)].map(
					(node) => node.style.zIndex,
				),
			),
		).toEqual([[layer], [layer]])
	})
})
