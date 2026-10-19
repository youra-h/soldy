/**
 * Коллекции на сервере: JSX собран для сервера, рисует его `renderToString` из
 * `solid-js/web` — как сервер приложения.
 *
 * Элемент коллекции входит в неё при выполнении своего тела, а оно идёт и на
 * сервере. Поэтому сервер рисует полностью и список из данных, и элементы
 * разметки — вместе с тем, что пишет им коллекция: выбор, раскрытость,
 * отметку, общий `name` радио, остановки Tab. Панель таба находит свой таб к
 * своей сборке, и панель активного таба тоже в разметке сервера. У React
 * элементы разметки входят в коллекцию при коммите, и сервер рисует их без
 * этого.
 *
 * `id` частей — связки «таб ↔ панель» и «заголовок ↔ панель» — и общий `name`
 * радио строят плагины связок от id монтирования, а он у Solid — от
 * `createUniqueId()`: на сервере Solid выводит его из места компонента в
 * дереве, и счёт у каждого рендера свой. Два рендера одной разметки,
 * параллельные или нет, дают одни и те же `id`. Счётчик набора, общий для
 * процесса, дал бы им разные.
 *
 * Лифт. На сервере у компонента Solid своего владельца нет —
 * `createComponent` зовёт его функцию под владельцем родителя, — и значение,
 * записанное в контекст мимо `Provider`, увидели бы соседи владельца. Слой
 * лифта детям отдаёт `Elevate`, и соседи списка его движка не видят.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение.
 */

import { describe, it, expect } from 'vitest'
import { For, type JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import { createEngineListBox, type TTableColumnSource } from '@soldy-ui/core'
import {
	Accordion,
	ListBox,
	RadioGroup,
	Table,
	Tabs,
	Virtual,
	type AccordionItemProps,
	type RadioGroupItemProps,
	type TabsItemProps,
} from '@soldy-ui/solid'

/** Открывающий тег разметки: имя и атрибуты; атрибут без значения — пустая строка. */
type TTag = {
	readonly name: string
	readonly attributes: Readonly<Record<string, string>>
}

/**
 * Разметка сервера без меток гидратации: ключи узлов (`data-hk`) и
 * комментарии вокруг вставок пишет Solid для гидратации, а проверяется сама
 * разметка.
 */
const markup = (html: string) =>
	html.replace(/<!--[\s\S]*?-->/g, '').replace(/ data-hk="[^"]*"/g, '')

/** Открывающие теги разметки сервера по порядку. */
function tagsOf(body: string): TTag[] {
	const tags = markup(body).match(/<[a-z][^>]*>/g) ?? []

	return tags.map((tag) => {
		const name = /^<([a-z][\w-]*)/.exec(tag)?.[1] ?? ''
		const attributes: Record<string, string> = {}

		for (const [, attribute, value] of tag.matchAll(/\s([^\s="'>/]+)(?:="([^"]*)")?/g)) {
			attributes[attribute] = value ?? ''
		}

		return { name, attributes }
	})
}

/** Теги с атрибутом `attribute` — по порядку; с `value` — только с этим значением. */
function tagsWith(body: string, attribute: string, value?: string): TTag[] {
	return tagsOf(body).filter(
		(tag) =>
			attribute in tag.attributes &&
			(value === undefined || tag.attributes[attribute] === value),
	)
}

/** Значение атрибута у каждого тега. */
const attributeOf = (tags: readonly TTag[], attribute: string) =>
	tags.map((tag) => tag.attributes[attribute])

/** Теги с классом `name` — по порядку. */
const withClass = (body: string, name: string) =>
	tagsOf(body).filter((tag) => (tag.attributes.class ?? '').split(' ').includes(name))

/** Текст разметки без тегов и меток. */
const textOf = (body: string) => markup(body).replace(/<[^>]*>/g, '')

/** Рендер разметки сервером. */
const render = (code: () => JSX.Element) => renderToString(code)

/** Табы разметки и панели в слоте `content`. */
function TabsMarkup(props: {
	items: TabsItemProps[]
	panels: { value: string; text: string }[]
}): JSX.Element {
	return (
		<Tabs
			content={
				<For each={props.panels}>
					{(panel) => <Tabs.Content value={panel.value}>{panel.text}</Tabs.Content>}
				</For>
			}
		>
			<For each={props.items}>{(item) => <Tabs.Item {...item} />}</For>
		</Tabs>
	)
}

/** Секции разметки с абзацем в панели. */
function AccordionMarkup(props: { items: AccordionItemProps[] }): JSX.Element {
	return (
		<Accordion>
			<For each={props.items}>
				{(item) => (
					<Accordion.Item {...item}>
						<p>Содержимое {String(item.value)}</p>
					</Accordion.Item>
				)}
			</For>
		</Accordion>
	)
}

/** Радио разметки; значение группы — `value`. */
function RadioMarkup(props: { value?: string; items: RadioGroupItemProps[] }): JSX.Element {
	return (
		<RadioGroup value={props.value}>
			<For each={props.items}>
				{(item) => <RadioGroup.Item {...item}>{String(item.value)}</RadioGroup.Item>}
			</For>
		</RadioGroup>
	)
}

describe('ListBox · серверный рендер', () => {
	it('список из items — полностью: выбранное — aria-selected', () => {
		const body = render(() => (
			<ListBox
				items={[
					{ value: 'a', text: 'Первый' },
					{ value: 'b', text: 'Второй' },
					{ value: 'c', text: 'Третий' },
				]}
				value="b"
			/>
		))

		expect(attributeOf(tagsWith(body, 'aria-selected'), 'aria-selected')).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('элементы разметки — с выбором и остановками Tab от коллекции', () => {
		const body = render(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" selected />
			</ListBox>
		))
		const rows = tagsWith(body, 'aria-selected')

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '-1'])
		expect(attributeOf(withClass(body, 'so-list-box-item'), 'data-selected')).toEqual([
			'false',
			'true',
		])
	})
})

/**
 * Лифт на сервере: своего владельца у компонента нет, и только `Provider`
 * отделяет слой списка от его соседей.
 */
describe('лифт · серверный рендер', () => {
	it('элемент после списка его движка не видит', () => {
		const engine = createEngineListBox()
		const body = render(() => (
			<div>
				<ListBox engine={engine}>
					<ListBox.Item value="a" text="A" />
				</ListBox>
				<ListBox.Item value="z" text="Z" />
			</div>
		))

		// Рендер снимает корень следующей задачей: движок ещё держит своих
		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual(['a'])
		// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
		expect(tagsWith(body, 'aria-selected')).toHaveLength(1)
	})

	it('два списка рядом: у каждого свои элементы', () => {
		const left = createEngineListBox()
		const right = createEngineListBox()

		render(() => (
			<div>
				<ListBox engine={left}>
					<ListBox.Item value="a" text="A" />
					<ListBox.Item value="b" text="B" />
				</ListBox>
				<ListBox engine={right}>
					<ListBox.Item value="x" text="X" />
				</ListBox>
			</div>
		))

		expect(left.extensions.batch.items.map((item) => item.value)).toEqual(['a', 'b'])
		expect(right.extensions.batch.items.map((item) => item.value)).toEqual(['x'])
	})
})

describe('Tabs · серверный рендер', () => {
	/** Табы — строки с ролью, показанные панели — с ролью панели. */
	function partsOf(body: string) {
		return { rows: tagsWith(body, 'role', 'tab'), panels: tagsWith(body, 'role', 'tabpanel') }
	}

	it('табы из items: aria-selected, связка таба с панелью и панель активного таба', () => {
		const body = render(() => (
			<Tabs
				items={[
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', _: { active: true } },
				]}
				content={
					<>
						<Tabs.Content value="a">Панель A</Tabs.Content>
						<Tabs.Content value="b">Панель B</Tabs.Content>
					</>
				}
			/>
		))
		const { rows, panels } = partsOf(body)

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(panels).toHaveLength(1)
		expect(textOf(body)).toContain('Панель B')
		expect(textOf(body)).not.toContain('Панель A')
		expect(rows[1]?.attributes['aria-controls']).toBe(panels[0]?.attributes.id)
		expect(panels[0]?.attributes['aria-labelledby']).toBe(rows[1]?.attributes.id)
	})

	it('табы и панели из разметки: панель активного таба — в разметке, со связкой', () => {
		const body = render(() => (
			<TabsMarkup
				items={[
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', active: true },
				]}
				panels={[{ value: 'b', text: 'Панель B' }]}
			/>
		))
		const { rows, panels } = partsOf(body)

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(panels).toHaveLength(1)
		expect(textOf(body)).toContain('Панель B')
		expect(rows[1]?.attributes['aria-controls']).toBe(panels[0]?.attributes.id)
		expect(panels[0]?.attributes['aria-labelledby']).toBe(rows[1]?.attributes.id)
	})
})

describe('Accordion · серверный рендер', () => {
	/** Заголовки и панели секций. */
	function partsOf(body: string) {
		return {
			heads: withClass(body, 'so-accordion-item__header'),
			bodies: withClass(body, 'so-accordion-item__content'),
		}
	}

	it('секции из items: aria-expanded и связка заголовка с панелью', () => {
		const body = render(() => (
			<Accordion
				items={[
					{ value: 'a', text: 'A', _: { selected: true } },
					{ value: 'b', text: 'B' },
				]}
			/>
		))
		const { heads, bodies } = partsOf(body)

		expect(attributeOf(heads, 'aria-expanded')).toEqual(['true', 'false'])
		expect(attributeOf(heads, 'aria-controls')).toEqual(attributeOf(bodies, 'id'))
		expect(attributeOf(bodies, 'aria-labelledby')).toEqual(attributeOf(heads, 'id'))
	})

	it('секции из разметки: aria-expanded и связка заголовка с панелью', () => {
		const body = render(() => (
			<AccordionMarkup
				items={[
					{ value: 'a', text: 'A', selected: true },
					{ value: 'b', text: 'B' },
				]}
			/>
		))
		const { heads, bodies } = partsOf(body)

		expect(attributeOf(heads, 'aria-expanded')).toEqual(['true', 'false'])
		expect(attributeOf(heads, 'aria-controls')).toEqual(attributeOf(bodies, 'id'))
		expect(attributeOf(bodies, 'aria-labelledby')).toEqual(attributeOf(heads, 'id'))
	})
})

describe('RadioGroup · серверный рендер', () => {
	it('радио из items — с общим name и отметкой', () => {
		const body = render(() => (
			<RadioGroup name="delivery" value="b" items={[{ value: 'a' }, { value: 'b' }]} />
		))
		const fields = tagsWith(body, 'type', 'radio')

		expect(attributeOf(fields, 'name')).toEqual(['delivery', 'delivery'])
		expect(fields.map((field) => 'checked' in field.attributes)).toEqual([false, true])
	})

	it('радио из разметки — с общим name и отметкой', () => {
		const body = render(() => (
			<RadioMarkup value="b" items={[{ value: 'a' }, { value: 'b' }, { value: 'c' }]} />
		))
		const fields = tagsWith(body, 'type', 'radio')
		const names = new Set(attributeOf(fields, 'name'))

		expect(fields.map((field) => 'checked' in field.attributes)).toEqual([false, true, false])
		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})
})

/**
 * Таблица из данных: строки в коллекции с самой сборки, и сервер рисует их со
 * всем, что пишут им коллекция и плагины, — `id` заголовков строк и ссылки
 * чекбоксов на них, `id` подписей колонок и ссылки заголовков и поля ручки на
 * них, имя кнопки сортировки от локали.
 */
describe('Table · серверный рендер', () => {
	const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
	const AGE: TTableColumnSource = {
		field: 'age',
		text: 'Возраст',
		sortable: true,
		resizable: true,
		width: 120,
	}
	const ROWS = [
		{ data: { id: 1, name: 'Анна', age: 30 } },
		{ data: { id: 2, name: 'Борис', age: 41 } },
	]

	it('строки и колонки из данных — со связками, именами и шириной', () => {
		const body = render(() => <Table items={ROWS} columns={[NAME, AGE]} mode="multiple" />)
		const rowHeaders = attributeOf(tagsWith(body, 'scope', 'row'), 'id')
		const captions = attributeOf(withClass(body, 'so-table-column__text'), 'id')
		// Чекбоксы строк называет ссылка; у «выбрать все» — своё имя
		const rowChecks = tagsWith(body, 'type', 'checkbox').filter(
			(tag) => 'aria-labelledby' in tag.attributes,
		)

		expect(textOf(body)).toContain('Анна')
		expect(textOf(body)).toContain('Борис')
		expect(rowHeaders).toHaveLength(2)
		expect(rowHeaders.every(Boolean)).toBe(true)
		expect(attributeOf(rowChecks, 'aria-labelledby')).toEqual(rowHeaders)
		expect(captions).toHaveLength(2)
		expect(captions.every(Boolean)).toBe(true)
		expect(attributeOf(withClass(body, 'so-table-column'), 'aria-labelledby')).toEqual(captions)
		expect(attributeOf(withClass(body, 'so-table-column__sort'), 'aria-label')).toEqual([
			'Sort by Возраст',
		])

		const [field] = withClass(body, 'so-table-column__input')

		expect(field?.attributes['aria-labelledby']).toBe(captions[1])
		expect(field?.attributes.value).toBe('120')
	})

	it('окно таблицы — внешний узел, корень и наборы — у table', () => {
		const body = render(() => (
			<Table items={ROWS} columns={[NAME]} class="staff" aria_label="Сотрудники" />
		))
		const [viewport] = withClass(body, 'so-table__viewport')
		const [table] = withClass(body, 'so-table')
		// Класс сервер Solid печатает с пробелом в конце — сверяются имена
		const classes = (tag: TTag | undefined) =>
			(tag?.attributes.class ?? '').split(' ').filter(Boolean)

		expect(viewport?.name).toBe('div')
		expect(classes(viewport)).toEqual(['so-table__viewport', 'staff'])
		expect(viewport?.attributes['aria-label']).toBeUndefined()
		expect(table?.name).toBe('table')
		expect(table?.attributes['aria-label']).toBe('Сотрудники')
		expect(classes(table)).not.toContain('staff')
	})
})

/**
 * Окно на сервере: подхват — при сборке коллекции, а она идёт и на сервере.
 * Сервер рисует уже окно — первые 50 элементов, без распорок: замера нет.
 */
describe('Virtual · серверный рендер', () => {
	const ITEMS = Array.from({ length: 80 }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))

	it('список в окне — первые 50 элементов, распорок нет', () => {
		const body = render(() => (
			<Virtual>
				<ListBox items={ITEMS} />
			</Virtual>
		))

		expect(withClass(body, 'so-list-box-item')).toHaveLength(50)
		expect(withClass(body, 'so-list-box__filler')).toEqual([])
		expect(attributeOf(tagsWith(body, 'aria-posinset'), 'aria-posinset').at(-1)).toBe('50')
	})

	it('таблица в окне — первые 50 строк и число строк у таблицы', () => {
		const rows = ITEMS.map((item, index) => ({ data: { id: index + 1, name: item.text } }))
		const body = render(() => (
			<Virtual>
				<Table items={rows} columns={[{ field: 'name', text: 'Имя', rowHeader: true }]} />
			</Virtual>
		))

		expect(withClass(body, 'so-table-row')).toHaveLength(50)
		expect(withClass(body, 'so-table__filler-row')).toEqual([])
		expect(withClass(body, 'so-table')[0]?.attributes['aria-rowcount']).toBe('81')
	})
})

describe('id и name — от createUniqueId()', () => {
	/** Страница: табы и панели, секции и радио — всё разметкой. */
	function page(): string {
		return render(() => (
			<div>
				<TabsMarkup
					items={[
						{ value: 'a', text: 'A', active: true },
						{ value: 'b', text: 'B' },
					]}
					panels={[{ value: 'a', text: 'Панель A' }]}
				/>
				<AccordionMarkup
					items={[
						{ value: 'a', text: 'A' },
						{ value: 'b', text: 'B' },
					]}
				/>
				<RadioMarkup items={[{ value: 'a' }, { value: 'b' }]} />
			</div>
		))
	}

	/** `id` и `name` страницы: табов, панели таба, заголовков и панелей секций, радио. */
	function idsOf(body: string) {
		return {
			tabs: attributeOf(tagsWith(body, 'role', 'tab'), 'id'),
			panel: attributeOf(tagsWith(body, 'role', 'tabpanel'), 'id'),
			heads: attributeOf(withClass(body, 'so-accordion-item__header'), 'id'),
			bodies: attributeOf(withClass(body, 'so-accordion-item__content'), 'id'),
			names: attributeOf(tagsWith(body, 'type', 'radio'), 'name'),
		}
	}

	it('два параллельных рендера одной разметки дают одни и те же id и name', async () => {
		const [first, second] = await Promise.all([
			Promise.resolve().then(page),
			Promise.resolve().then(page),
		])

		expect(idsOf(first)).toEqual(idsOf(second))
	})

	it('id у частей свои, name у радио группы — один', () => {
		const ids = idsOf(page())

		expect(new Set([...ids.tabs, ...ids.heads, ...ids.bodies]).size).toBe(6)
		expect(ids.panel).toEqual([expect.stringMatching(/\S/)])
		expect(new Set(ids.names).size).toBe(1)
	})

	/** Счётчик набора даёт `s-<n>`: им набор берёт, когда адаптер id монтирования не передал. */
	it('ни один id и name не от счётчика набора', () => {
		const ids = idsOf(page())

		for (const id of [...ids.tabs, ...ids.panel, ...ids.heads, ...ids.bodies, ...ids.names]) {
			expect(id).not.toMatch(/^s-\d+-/)
		}
	})
})
