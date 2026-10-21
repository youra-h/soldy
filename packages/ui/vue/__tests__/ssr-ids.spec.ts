/**
 * `id` в разметке — от места компонента в дереве, а не от счётчика процесса.
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
 * Сервер и браузер здесь — один процесс: рендер сервера уже сдвинул счётчик,
 * и экземпляры гидратации получают другие `uid`, как в настоящем браузере.
 */

// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { h } from 'vue'
import {
	Accordion,
	Calendar,
	DateInput,
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
import { hydrate, removeContainers } from './hydrate'

afterEach(removeContainers)

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
