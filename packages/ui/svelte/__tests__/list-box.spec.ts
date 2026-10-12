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
import { createEngine, type IListBoxItem, type TListBoxValue } from '@soldy-ui/core'
import { ListBox, ListBoxItem, type ListBoxItemProps, type ListBoxProps } from '@soldy-ui/svelte'
import Harness from './ListBox.test.svelte'
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
const rows = () => [...document.querySelectorAll('.s-list-box-item .s-button')]

/** Строка элемента по тексту; нет её — тест падает здесь. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

const listItems = () => [...document.querySelectorAll('.s-list-box-item')]

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
	 * Roving tabindex (APG listbox): Tab фокусирует контейнер, а по элементам
	 * ходят стрелки. `tabindex="-1"` элемента пишет ядро в его `aria`, и на
	 * строке он перекрывает `tabindex="0"`, который кнопка на `div` ставит себе
	 * сама: атрибуты снаружи ложатся на корень поверх наборов.
	 */
	it('строки — не остановки Tab, контейнер — остановка', () => {
		const { root } = mount(Harness, harness())

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		const { root } = mount(Harness, harness())

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		press(root(), 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		press(root(), 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		press(root(), 'ArrowDown')
		press(root(), ' ')

		expect(selection()).toEqual(['true', 'true'])
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
	 * не съели ни компонент, ни фасад, — уходит.
	 */
	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		const engine = createEngine<TItem>()
		const { root } = mount(Harness, {
			list: { engine, mode: 'multiple', items: ITEMS, title: 'Города' },
			items: [{ value: 'z', text: 'Z', selected: true, title: 'Строка' }],
		})

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
		}

		expect(root().getAttribute('title')).toBe('Города')
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

		const item = find(document, '.s-list-box-item', HTMLElement)

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

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(ListBox, { items: ITEMS, indicator: 'start' })

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.s-list-box-item__indicator svg')).toHaveLength(0)

		click(rowOf('Второй'))

		expect(
			listItems().map((item) => !!item.querySelector('.s-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.s-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const sideOf = () => {
			const indicator = find(document, '.s-list-box-item__indicator', HTMLElement)
			const text = find(document, '.s-button__text', HTMLElement)

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

		expect(document.querySelector('.s-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.s-list-box-item__indicator svg')).toBeNull()
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

		expect(rows().map((row) => row.querySelector('.s-button__text')?.textContent)).toEqual([
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
			[...document.querySelectorAll('.s-list-box-item__indicator')].map((indicator) =>
				indicator.querySelector('.probe')
					? `slot:${indicator.textContent ?? ''}`
					: indicator.querySelector('svg')
						? 'icon'
						: 'empty',
			)
		// Текст отметки входит в текст строки — строки берём по месту
		const rowAt = (index: number) => find(listItems()[index], '.s-button', HTMLElement)

		expect(marks()).toEqual(['slot:false', 'empty'])

		click(rowAt(0))
		click(rowAt(1))

		expect(marks()).toEqual(['slot:true', 'empty'])
	})

	it('empty — пока элементов нет: после шапки, перед подвалом; появились — пропал', () => {
		const props = reactiveProps<ListBoxProps>({
			items: [],
			header: markup('<i class="head"></i>'),
			empty: markup('<p class="probe">Пусто</p>'),
			footer: markup('<i class="foot"></i>'),
		})
		const { root } = mount(ListBox, props)

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'probe',
			'foot',
		])

		props.items = ITEMS.slice(0, 2)
		flushSync()

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})
})

describe('типы', () => {
	it('ListBox.Item — это ListBoxItem', () => {
		expect(ListBox.Item).toBe(ListBoxItem)
		expectTypeOf(ListBox.Item).toEqualTypeOf<typeof ListBoxItem>()
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
