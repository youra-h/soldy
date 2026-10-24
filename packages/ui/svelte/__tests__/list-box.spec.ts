/**
 * ListBox в Svelte — первая коллекция адаптера.
 *
 * Движок коллекций, его расширения и плагины перенесены без правок, и эти
 * тесты — проверка того, что механика ядра не написана под Vue и React.
 * Сценарии — те же, что у React (`list-box.spec.tsx`): выбор, состав, отметка
 * и слоты.
 *
 * Своё у Svelte — момент входа элемента в коллекцию: при инициализации
 * компонента (`attach` контекста в `useAdapter`), как у Vue. Лифт — контекст
 * Svelte (`setContext` списка), его проверяет `collection-elevator.spec.ts`.
 *
 * И слоты. Сниппет непрозрачен: что он нарисовал, элемент не видит, поэтому
 * заданный слот рисуется вместо своего у каждого элемента — даже там, где
 * сниппет ничего не нарисовал. У React и Vue пустой слот уступает место
 * своему.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import {
	createEngine,
	createEngineListBox,
	type IListBoxItem,
	type TListBoxCollection,
	type TListBoxValue,
} from '@soldy-ui/core'
import {
	ListBox,
	ListBoxGroup,
	ListBoxItem,
	type ListBoxItemProps,
	type ListBoxProps,
} from '@soldy-ui/svelte'
import Harness from './ListBox.test.svelte'
import Groups from './ListBoxGroups.test.svelte'
import Slots from './ListBoxSlots.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup, scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Строки элементов — на них обработчик выбора, `aria-selected` и `tabindex`. */
const rows = () => [...document.querySelectorAll('.so-list-box-item .so-button')]

/** Строка элемента по тексту; нет её — тест падает здесь. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

const listItems = () => [...document.querySelectorAll('.so-list-box-item')]

/** Узел списка в корне: на нём набор `aria` списка и остановка Tab. */
const list = () => find(document, '.so-list-box > .so-list-box__list', HTMLElement)

/** Текстовые узлы прямо в узле, кроме пустых: пробелы между частями разметки. */
const strayText = (node: Node) =>
	[...node.childNodes].filter(
		(child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '',
	)

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await Promise.resolve()
	flushSync()
}

/** Scope слотов: строки элемента, проброса строки и проброса без своего scope. */
type TRowScope = { text: string; selected: boolean }
type TItemRowScope = TRowScope & { item: IListBoxItem }
type TItemScope = { item: IListBoxItem }

/** Движок так, как его видит тест: состав элементов. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

const valuesOf = (engine: TEngineView | undefined) =>
	engine?.extensions.batch.items.map((item) => Reflect.get(item, 'value'))

type THarnessProps = ComponentProps<typeof Harness>

/** «B» выключается `itemOff`, весь список — `listOff`. */
function harness({
	itemOff = false,
	listOff = false,
	...list
}: ListBoxProps & { itemOff?: boolean; listOff?: boolean } = {}): THarnessProps {
	return {
		list: { mode: 'multiple', disabled: listOff, ...list },
		items: [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', disabled: itemOff },
		],
	}
}

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const engines: TEngineView[] = []

		mount(Harness, {
			list: { onEngineCreate: (engine) => engines.push(engine) },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			],
		})
		await flush()

		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, onChangeValue сообщает', () => {
		const onChangeValue = vi.fn()

		mount(Harness, harness({ onChangeValue }))

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
		expect(onChangeValue).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: ['b'] }))

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])
		expect(onChangeValue).toHaveBeenCalledTimes(2)
	})

	/**
	 * Выключенный элемент кликом не выбирается — выключен ли он сам или весь
	 * список. Включённый обратно — выбирается тем же кликом: так видно, что
	 * обработчик на месте и отказ даёт именно выключенность.
	 */
	it.each([
		['выключен сам', { itemOff: true }, { itemOff: false }],
		['выключен список', { listOff: true }, { listOff: false }],
	] as const)('%s: клик не выбирает, после включения — выбирает', (_way, off, on) => {
		const props = reactiveProps(harness(off))

		mount(Harness, props)

		expect(rowOf('B').dataset.disabled).toBe('true')

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])

		Object.assign(props, harness(on))
		flushSync()
		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
	})

	/**
	 * Остановка Tab одна — узел списка (APG Listbox), а по элементам ходят
	 * стрелки. `tabindex="-1"` элемента пишет ядро в его `aria`, и на
	 * строке он перекрывает `tabindex="0"`, который кнопка на `div` ставит себе
	 * сама: атрибуты снаружи ложатся на корень поверх наборов. Корень — рамка
	 * вокруг шапки, списка и подвала, остановкой он не бывает.
	 */
	it('строки — не остановки Tab, узел списка — остановка, корень — нет', () => {
		const { root } = mount(Harness, harness())

		expect(list().parentElement).toBe(root())
		expect(list().getAttribute('tabindex')).toBe('0')
		expect(root().hasAttribute('tabindex')).toBe(false)
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	/**
	 * Роли пишет ядро: узел списка — `listbox`, в `multiple` — с
	 * `aria-multiselectable`, строка — `option`. Набор элемента ложится на
	 * строку поверх того, что кнопка на `div` пишет себе сама, и её
	 * `role="button"` в разметку не попадает.
	 */
	it('узел списка — listbox с aria-multiselectable, строки — опции, а не кнопки', () => {
		const { root } = mount(Harness, harness())

		expect(list().getAttribute('role')).toBe('listbox')
		expect(list().getAttribute('aria-multiselectable')).toBe('true')
		expect(root().hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		mount(Harness, harness())

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		press(list(), 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		press(list(), 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		press(list(), 'ArrowDown')
		press(list(), ' ')

		expect(selection()).toEqual(['true', 'true'])
	})

	/**
	 * Фокус по строкам не ходит, и элемент под стрелками скринридеру называет
	 * `aria-activedescendant` узла списка (APG Listbox): `id` строке пишет
	 * плагин `id` элемента от монтирования, ссылку — клавиатура списка. До
	 * клавиш подсветки на экране нет — и ссылки нет.
	 */
	it('элемент под стрелками — aria-activedescendant узла списка на id подсвеченной строки', async () => {
		mount(ListBox, { items: ITEMS })

		await nextFrame()

		const ids = rows().map((row) => row.id)

		expect(ids.every((id) => id !== '')).toBe(true)
		expect(new Set(ids).size).toBe(ids.length)
		expect(list().hasAttribute('aria-activedescendant')).toBe(false)

		for (const step of [0, 1]) {
			press(list(), 'ArrowDown')

			const reference = list().getAttribute('aria-activedescendant')

			expect(reference).toBe(ids[step])
			expect(document.querySelector('[role="option"][data-highlighted="true"]')?.id).toBe(
				reference,
			)
			expect(document.querySelectorAll(`[id="${reference}"]`)).toHaveLength(1)
		}
	})

	/**
	 * Свой `id` элемента — его вход: он встаёт на строку вместо `id` от
	 * монтирования, и ссылка ведёт на него. Атрибутом снаружи он не идёт —
	 * его съедает связка, — поэтому узел с ним один, строка. Сменили у
	 * подсвеченного — строка и ссылка идут за ним.
	 */
	it('свой id элемента — на строке, ссылка ведёт на него и идёт за его сменой', async () => {
		const items = (id?: string): ListBoxItemProps[] => [
			{ value: 'a', text: 'Первый', id },
			{ value: 'b', text: 'Второй' },
		]
		const props = reactiveProps<THarnessProps>({ items: items('row-first') })

		mount(Harness, props)

		await nextFrame()
		press(list(), 'ArrowDown')

		expect(rowOf('Первый').id).toBe('row-first')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-first')
		expect(document.querySelectorAll('[id="row-first"]')).toHaveLength(1)
		expect(listItems()[0].hasAttribute('id')).toBe(false)

		props.items = items('row-one')
		flushSync()

		expect(rowOf('Первый').id).toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-one')

		props.items = items()
		flushSync()

		const fallback = rowOf('Первый').id

		expect(fallback).not.toBe('')
		expect(fallback).not.toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe(fallback)
	})

	/**
	 * В `listbox` ARIA пускает только опции, поэтому шапка и подвал — дети
	 * корня рядом с узлом списка. Их клавиши — не списка: поле печатает,
	 * кнопка нажимается. Части стоят вплотную — пробелов текстом ни в корне, ни
	 * в списке.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const { root } = mount(ListBox, {
			items: ITEMS.slice(0, 1),
			header: markup('<input class="so-test-header" />'),
			footer: markup('<button class="so-test-footer">Готово</button>'),
		})

		await nextFrame()

		const header = find(document, '.so-test-header', HTMLInputElement)
		const footer = find(document, '.so-test-footer', HTMLButtonElement)

		expect([...root().children]).toEqual([header, list(), footer])
		expect(list().contains(header)).toBe(false)
		expect(list().contains(footer)).toBe(false)
		expect(strayText(root())).toEqual([])
		expect(strayText(list())).toEqual([])

		press(header, 'ArrowDown')
		press(footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})
})

/**
 * Отметка элемента — в обе стороны, парой «проп + колбэк», без `ctrl`:
 * `selected` пропом пишет её, а `onChangeSelected` приходит только элементу,
 * чья отметка сменилась, и несёт новую. Состояние приложения — пропсы
 * родителя (`reactiveProps`): колбэк пишет отметку туда, и элемент получает
 * её обратно пропом. Коллекцию приложение не читает.
 */
describe('отметка элемента: selected и onChangeSelected', () => {
	/** Список из трёх, отметки — в пропсах родителя; колбэки — в журнал. */
	function app(log: string[], mode?: ListBoxProps['mode']) {
		const props = reactiveProps<THarnessProps>({ list: { mode }, items: [] })
		const item = (value: string, selected: boolean): ListBoxItemProps => ({
			value,
			text: value.toUpperCase(),
			selected,
			onChangeSelected: (next) => {
				log.push(`${value}: ${next}`)

				const own = props.items?.find((candidate) => candidate.value === value)

				if (own) own.selected = next
			},
		})

		props.items = [item('a', true), item('b', false), item('c', false)]
		mount(Harness, props)

		return () => props.items?.map(({ selected }) => String(selected)).join(' ')
	}

	it('клик по B: A получает false, B — true, C молчит; состояние сходится с выбором', () => {
		const log: string[] = []
		const state = app(log)

		expect(selection()).toEqual(['true', 'false', 'false'])

		log.length = 0
		click(rowOf('B'))

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('multiple: повторный клик снимает только свою отметку', () => {
		const log: string[] = []
		const state = app(log, 'multiple')

		log.length = 0
		click(rowOf('C'))
		click(rowOf('A'))

		expect(log).toEqual(['c: true', 'a: false'])
		expect(state()).toBe('false false true')
		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('колбэк получает отметку: boolean', () => {
		expectTypeOf<NonNullable<ListBoxItemProps['onChangeSelected']>>()
			.parameter(0)
			.toEqualTypeOf<boolean>()
	})
})

describe('состав', () => {
	it('список из items рисует элемент на каждый', () => {
		mount(ListBox, { items: ITEMS })

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/**
	 * Фасад собирается конструктором из тех же пропсов, и `items` он уже
	 * записал: связка, получив те же пропсы в эффекте, второй раз их не пишет.
	 * Сеттер `items` без `trackBy` — это очистка и новый набор.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<TItem>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		mount(ListBox, { engine, items: ITEMS })

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		mount(ListBox, { engine })

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		flushSync()

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const props = reactiveProps<ListBoxProps>({ items: ITEMS, value: 'b' })

		mount(ListBox, props)

		expect(selection()).toEqual(['false', 'true', 'false'])

		props.value = 'c'
		flushSync()

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		mount(ListBox, { engine })

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()
		flushSync()

		expect(listItems()).toHaveLength(2)
		expect(engine.extensions.batch.items).toHaveLength(3)
	})

	/**
	 * Пропсы фасада — `mode`, `items`, `engine` у списка и `selected` у
	 * элемента — съедает связка фасада, и атрибутами в DOM они не уходят. Что
	 * не съели ни компонент, ни фасад, — уходит: у списка — узлу списка, у
	 * элемента — строке.
	 */
	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		const engine = createEngine<TItem>()
		const { root } = mount(Harness, {
			list: { engine, mode: 'multiple', items: ITEMS, title: 'Города' },
			items: [{ value: 'z', text: 'Z', selected: true, title: 'Строка' }],
		})

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(list().hasAttribute(name), name).toBe(false)
		}

		expect(root().hasAttribute('title')).toBe(false)
		expect(list().getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		mount(Harness, {
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', selected: true },
			],
		})

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		mount(Harness, {
			items: [{ value: 'a', text: 'A', class: 'mine', style: 'color: red', id: 'row-a' }],
		})

		const item = find(document, '.so-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по строке не отменяет выбор', () => {
		const onclick = vi.fn()

		mount(Harness, { items: [{ value: 'a', text: 'A', onclick }] })

		click(rowOf('A'))

		expect(onclick).toHaveBeenCalledTimes(1)
		expect(selection()).toEqual(['true'])
	})
})

describe('отметка выбранного и слоты', () => {
	it('без indicator обёртки отметки нет', () => {
		mount(ListBox, { items: ITEMS, value: 'a' })

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(ListBox, { items: ITEMS, indicator: 'start' })

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.so-list-box-item__indicator svg')).toHaveLength(0)

		click(rowOf('Второй'))

		expect(
			listItems().map((item) => !!item.querySelector('.so-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const sideOf = () => {
			const indicator = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return indicator.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}
		const props = reactiveProps<ListBoxProps>({ items: ITEMS.slice(0, 1), indicator: 'start' })

		mount(ListBox, props)

		expect(sideOf()).toBe('start')

		props.indicator = 'end'
		flushSync()

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		mount(Slots, { case: 'indicator' })

		expect(document.querySelector('.custom')).toBeNull()

		click(rowOf('A'))

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
	})

	it('children элемента получает text и selected, без него — text', () => {
		mount(Harness, {
			items: [
				{
					value: 'a',
					text: 'A',
					children: scopeText<TRowScope>(
						({ text, selected }) => `${text}:${String(selected)}`,
					),
				},
				{ value: 'b', text: 'B' },
			],
		})

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		click(rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		mount(ListBox, {
			items: ITEMS.slice(0, 2),
			header: markup('<i class="head">шапка</i>'),
			footer: markup('<i class="foot">подвал</i>'),
			item: scopeText<TItemRowScope>(({ item }) => `[${item.text}]`),
			'item-leading': scopeMarkup<TItemScope>(
				({ item }) => `<u class="lead">${String(item.value)}</u>`,
			),
			'item-trailing': scopeMarkup<TItemScope>(
				({ item }) => `<s class="trail">${String(item.value)}</s>`,
			),
		})

		expect(rows().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'[Первый]',
			'[Второй]',
		])
		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect(document.querySelector('.head')?.textContent).toBe('шапка')
		expect(document.querySelector('.foot')?.textContent).toBe('подвал')
	})

	/**
	 * Проброс целиком: scope `item` — scope слота элемента плюс сам элемент.
	 * Слот, нарисованный списком без проброса, scope элемента терял бы: `text`
	 * и `selected` держит элемент.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		mount(ListBox, {
			items: ITEMS.slice(0, 2),
			item: scopeText<TItemRowScope>(
				({ item, text, selected }) => `${String(item.value)}:${text}:${String(selected)}`,
			),
		})

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		click(rowOf('b:Второй:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * Сниппет непрозрачен: что он нарисовал у элемента, тот не видит, — и
	 * заданная списку отметка стоит у каждого элемента вместо своей, даже где
	 * сниппет пуст. У React и Vue пустой слот уступает место иконке. Иконку
	 * такому элементу рисует сам сниппет — веткой по `item`.
	 */
	it('item-indicator-icon задан — у каждого элемента вместо своей отметки', () => {
		mount(Slots, { case: 'owner-indicator' })

		const marks = () =>
			[...document.querySelectorAll('.so-list-box-item__indicator')].map((indicator) =>
				indicator.querySelector('.probe')
					? `slot:${indicator.textContent ?? ''}`
					: indicator.querySelector('svg')
						? 'icon'
						: 'empty',
			)
		// Текст отметки входит в текст строки — строки берём по месту
		const rowAt = (index: number) => find(listItems()[index], '.so-button', HTMLElement)

		expect(marks()).toEqual(['slot:false', 'empty'])

		click(rowAt(0))
		click(rowAt(1))

		expect(marks()).toEqual(['slot:true', 'empty'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		const props = reactiveProps<ListBoxProps>({
			items: [],
			header: markup('<i class="head"></i>'),
			empty: markup('<p class="probe">Пусто</p>'),
			footer: markup('<i class="foot"></i>'),
		})
		const { root } = mount(ListBox, props)

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...list().children].map((child) => child.className)).toEqual(['probe'])

		props.items = ITEMS.slice(0, 2)
		flushSync()

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})
})

/**
 * Группы — как у Vue (`ui/vue/__tests__/list-groups.spec.ts`). Из данных:
 * секции нарисованного (`drawnSections`) — группа с подписью в
 * `ListBox.Group`, элементы без группы — прямо в списке, а между секциями,
 * пока их просит список (`groupSeparators`, по умолчанию выключен), — немой
 * разделитель; группы из `groups` — первыми, остальное — по месту. Разметкой:
 * `ListBox.Group` входит в ту же группировку, и секции описывают её. Стрелки
 * ходят тем же порядком, что элементы стоят на экране. Части стоят вплотную —
 * пробелов текстом нет ни в списке, ни в группе.
 */
describe('группы', () => {
	/** В данных «Морковь» стоит между фруктами, у «Воды» группы нет. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	/** Части списка: группа — подписью и текстами элементов, разделитель — `—`. */
	const parts = () =>
		[...list().children].map((node) => {
			if (node.classList.contains('so-list-box-group')) {
				return [
					node.querySelector('.so-list-box-group__label')?.textContent?.trim() ?? '',
					[...node.querySelectorAll('.so-list-box-item')].map((item) =>
						item.textContent?.trim(),
					),
				]
			}

			if (node.classList.contains('so-list-box__separator')) return '—'

			return node.textContent?.trim()
		})

	/** Секции `MIXED` на экране — без разделителей и с ними. */
	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']
	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	it('группа с подписью, без группы — последними; разделителей по умолчанию нет', () => {
		mount(ListBox, { items: MIXED, groups: GROUPS })

		expect(parts()).toEqual(SECTIONS)

		const groups = [...list().querySelectorAll('.so-list-box-group')]

		for (const group of groups) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
			expect(strayText(group)).toEqual([])
		}

		expect(strayText(list())).toEqual([])
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже', () => {
		const props = reactiveProps<ListBoxProps>({
			items: MIXED,
			groups: GROUPS,
			groupSeparators: true,
		})

		mount(ListBox, props)

		expect(parts()).toEqual(SEPARATED)
		expect(strayText(list())).toEqual([])
		expect(
			[...list().querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		props.groupSeparators = false
		flushSync()

		expect(parts()).toEqual(SECTIONS)
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		mount(ListBox, { items: MIXED, groups: GROUPS })

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Яблоко')

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Груша')

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Морковь')
	})

	it('смена подписи в groups перерисовывает подписи групп', () => {
		const props = reactiveProps<ListBoxProps>({ items: MIXED, groups: GROUPS })

		mount(ListBox, props)

		props.groups = [
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		]
		flushSync()

		expect(parts()).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
	})

	it('без группировки — ни групп, ни разделителей', () => {
		mount(ListBox, { items: ITEMS })

		expect(parts()).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/** Секции коротко: подпись группы (`null` — без группы) и значения элементов. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const engine = createEngineListBox()

		mount(Groups, { engine })

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts()).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		mount(Groups, { engine: createEngineListBox() })

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()
		const visited: unknown[] = []

		for (let step = 0; step < 4; step += 1) {
			press(list(), 'ArrowDown')
			visited.push(highlighted())
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша', 'Сок'])
	})

	it('смена подписи группы разметки — новая подпись секции', () => {
		const engine = createEngineListBox()
		const props = reactiveProps({ engine, label: 'Фрукты' })

		mount(Groups, props)

		props.label = 'Ягоды'
		flushSync()

		expect(brief(engine)[1]).toEqual(['Ягоды', ['apple', 'pear']])
	})
})

describe('типы', () => {
	it('ListBox.Item — это ListBoxItem', () => {
		expect(ListBox.Item).toBe(ListBoxItem)
		expectTypeOf(ListBox.Item).toEqualTypeOf<typeof ListBoxItem>()
	})

	it('ListBox.Group — это ListBoxGroup', () => {
		expect(ListBox.Group).toBe(ListBoxGroup)
		expectTypeOf(ListBox.Group).toEqualTypeOf<typeof ListBoxGroup>()
	})

	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[{ item: IListBoxItem; text: string; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxProps['item']>
		>()
		expectTypeOf<Snippet<[{ item: IListBoxItem; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxProps['item-indicator-icon']>
		>()
		expectTypeOf<Snippet<[{ text: string; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxItemProps['children']>
		>()
		expectTypeOf<Snippet<[{ selected: boolean }]>>().toExtend<
			NonNullable<ListBoxItemProps['indicator-icon']>
		>()
	})

	it('колбэки фасада — пропсы компонента', () => {
		expectTypeOf<ListBoxProps>().toHaveProperty('onChangeMode')
		expectTypeOf<ListBoxProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<ListBoxProps>().toHaveProperty('onChangeValue')
		expectTypeOf<ListBoxItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<ListBoxItemProps>().toHaveProperty('onChangeOrder')
	})

	it('value списка — значение элементов', () => {
		expectTypeOf<NonNullable<ListBoxProps['value']>>().toEqualTypeOf<
			NonNullable<TListBoxValue>
		>()
	})
})
