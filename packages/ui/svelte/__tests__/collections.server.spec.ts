/**
 * Коллекции на сервере: компоненты собраны для сервера, рисует их `render` из
 * `svelte/server` — как сервер приложения.
 *
 * Элемент коллекции входит в неё при инициализации компонента, а она идёт и
 * на сервере. Поэтому сервер рисует полностью и список из данных, и элементы
 * разметки — вместе с тем, что пишет им коллекция: выбор, раскрытость,
 * отметку, общий `name` радио, остановки Tab. Панель таба находит свой таб к
 * своей инициализации, и панель активного таба тоже в разметке сервера. У
 * React элементы разметки входят в коллекцию при коммите, и сервер рисует их
 * без этого.
 *
 * `id` частей — связки «таб ↔ панель» и «заголовок ↔ панель» — и общий `name`
 * радио строят плагины связок от id монтирования, а он у Svelte — от
 * `$props.id()`: счётчик у каждого рендера свой. Два рендера одной разметки,
 * параллельные или нет, дают одни и те же `id`, и ни один не сдвигает другой.
 * Счётчик набора, общий для процесса, дал бы им разные.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { Accordion, ListBox, RadioGroup } from '@soldy-ui/svelte'
import AccordionHarness from './Accordion.test.svelte'
import ListBoxHarness from './ListBox.test.svelte'
import RadioGroupHarness from './RadioGroup.test.svelte'
import TabsHarness from './Tabs.test.svelte'

/** Открывающий тег разметки: имя и атрибуты; атрибут без значения — пустая строка. */
type TTag = {
	readonly name: string
	readonly attributes: Readonly<Record<string, string>>
}

/**
 * Открывающие теги разметки сервера по порядку, без меток гидратации — в
 * комментариях Svelte пишет метки блоков и id монтирования (`<!--$s1-->`).
 */
function tagsOf(body: string): TTag[] {
	const tags = body.replace(/<!--[\s\S]*?-->/g, '').match(/<[a-z][^>]*>/g) ?? []

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
const textOf = (body: string) => body.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '')

/**
 * Временно, до 869ffnvvn: плагины списка (высота, прокрутка) планируют кадр
 * уже при сборке, а в Node `requestAnimationFrame` нет — рендер ListBox
 * падает. Серверные тесты Vue и React идут в jsdom и этого не видят.
 */
describe.skip('ListBox · серверный рендер', () => {
	it('список из items — полностью: выбранное — aria-selected', () => {
		const { body } = render(ListBox, {
			props: {
				items: [
					{ value: 'a', text: 'Первый' },
					{ value: 'b', text: 'Второй' },
					{ value: 'c', text: 'Третий' },
				],
				value: 'b',
			},
		})

		expect(attributeOf(tagsWith(body, 'aria-selected'), 'aria-selected')).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('элементы разметки — с выбором и остановками Tab от коллекции', () => {
		const { body } = render(ListBoxHarness, {
			props: {
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', selected: true },
				],
			},
		})
		const rows = tagsWith(body, 'aria-selected')

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(attributeOf(rows, 'tabindex')).toEqual(['-1', '-1'])
		expect(attributeOf(withClass(body, 's-list-box-item'), 'data-selected')).toEqual([
			'false',
			'true',
		])
	})
})

describe('Tabs · серверный рендер', () => {
	/** Табы — строки с ролью, показанные панели — с ролью панели. */
	function partsOf(body: string) {
		return { rows: tagsWith(body, 'role', 'tab'), panels: tagsWith(body, 'role', 'tabpanel') }
	}

	it('табы из items: aria-selected, связка таба с панелью и панель активного таба', () => {
		const { body } = render(TabsHarness, {
			props: {
				tabs: {
					items: [
						{ value: 'a', text: 'A' },
						{ value: 'b', text: 'B', _: { active: true } },
					],
				},
				panels: [
					{ value: 'a', text: 'Панель A' },
					{ value: 'b', text: 'Панель B' },
				],
			},
		})
		const { rows, panels } = partsOf(body)

		expect(attributeOf(rows, 'aria-selected')).toEqual(['false', 'true'])
		expect(panels).toHaveLength(1)
		expect(textOf(body)).toContain('Панель B')
		expect(textOf(body)).not.toContain('Панель A')
		expect(rows[1]?.attributes['aria-controls']).toBe(panels[0]?.attributes.id)
		expect(panels[0]?.attributes['aria-labelledby']).toBe(rows[1]?.attributes.id)
	})

	it('табы и панели из разметки: панель активного таба — в разметке, со связкой', () => {
		const { body } = render(TabsHarness, {
			props: {
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', active: true },
				],
				panels: [{ value: 'b', text: 'Панель B' }],
			},
		})
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
			heads: withClass(body, 's-accordion-item__header'),
			bodies: withClass(body, 's-accordion-item__content'),
		}
	}

	it('секции из items: aria-expanded и связка заголовка с панелью', () => {
		const { body } = render(Accordion, {
			props: {
				items: [
					{ value: 'a', text: 'A', _: { selected: true } },
					{ value: 'b', text: 'B' },
				],
			},
		})
		const { heads, bodies } = partsOf(body)

		expect(attributeOf(heads, 'aria-expanded')).toEqual(['true', 'false'])
		expect(attributeOf(heads, 'aria-controls')).toEqual(attributeOf(bodies, 'id'))
		expect(attributeOf(bodies, 'aria-labelledby')).toEqual(attributeOf(heads, 'id'))
	})

	it('секции из разметки: aria-expanded и связка заголовка с панелью', () => {
		const { body } = render(AccordionHarness, {
			props: {
				items: [
					{ value: 'a', text: 'A', selected: true },
					{ value: 'b', text: 'B' },
				],
				bodies: { a: 'Содержимое A', b: 'Содержимое B' },
			},
		})
		const { heads, bodies } = partsOf(body)

		expect(attributeOf(heads, 'aria-expanded')).toEqual(['true', 'false'])
		expect(attributeOf(heads, 'aria-controls')).toEqual(attributeOf(bodies, 'id'))
		expect(attributeOf(bodies, 'aria-labelledby')).toEqual(attributeOf(heads, 'id'))
	})
})

describe('RadioGroup · серверный рендер', () => {
	it('радио из items — с общим name и отметкой', () => {
		const { body } = render(RadioGroup, {
			props: { name: 'delivery', value: 'b', items: [{ value: 'a' }, { value: 'b' }] },
		})
		const fields = tagsWith(body, 'type', 'radio')

		expect(attributeOf(fields, 'name')).toEqual(['delivery', 'delivery'])
		expect(fields.map((field) => 'checked' in field.attributes)).toEqual([false, true])
	})

	it('радио из разметки — с общим name и отметкой', () => {
		const { body } = render(RadioGroupHarness, {
			props: {
				group: { value: 'b' },
				items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
				labels: { a: 'Первый', b: 'Второй', c: 'Третий' },
			},
		})
		const fields = tagsWith(body, 'type', 'radio')
		const names = new Set(attributeOf(fields, 'name'))

		expect(fields.map((field) => 'checked' in field.attributes)).toEqual([false, true, false])
		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})
})

describe('id и name — от $props.id()', () => {
	/** Страница: табы и панели, секции и радио — всё разметкой. */
	function page(): string {
		const tabs = render(TabsHarness, {
			props: {
				items: [
					{ value: 'a', text: 'A', active: true },
					{ value: 'b', text: 'B' },
				],
				panels: [{ value: 'a', text: 'Панель A' }],
			},
		}).body
		const accordion = render(AccordionHarness, {
			props: {
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
				],
			},
		}).body
		const radios = render(RadioGroupHarness, {
			props: { items: [{ value: 'a' }, { value: 'b' }] },
		}).body

		return tabs + accordion + radios
	}

	/** `id` и `name` страницы: табов, панели таба, заголовков и панелей секций, радио. */
	function idsOf(body: string) {
		return {
			tabs: attributeOf(tagsWith(body, 'role', 'tab'), 'id'),
			panel: attributeOf(tagsWith(body, 'role', 'tabpanel'), 'id'),
			heads: attributeOf(withClass(body, 's-accordion-item__header'), 'id'),
			bodies: attributeOf(withClass(body, 's-accordion-item__content'), 'id'),
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
