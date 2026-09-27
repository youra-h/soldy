/**
 * ListBox в React — первый коллекционный компонент адаптера.
 *
 * Движок коллекций, его расширения и плагины перенесены без правок, и эти
 * тесты — проверка того, что механика ядра не написана под Vue. Сценарии —
 * те же, что у Vue (`list-box-choose`, `list-box-tabindex`, `list-indicator`,
 * `engine-prop`, `collection-shown`): выбор, состав, отметка и слоты.
 *
 * Своё у React — момент входа элемента в коллекцию: не на рендере, а при
 * коммите (`join()` шагом коммита `useAdapterContext`). Его и лифт проверяет
 * `list-box-elevator.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createEngine, type IListBoxItem, type TListBoxValue } from '@soldy-ui/core'
import { ListBox, ListBoxItem, type ListBoxItemProps, type ListBoxProps } from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

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
	act(() => element.click())
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	act(() => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	})
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await act(async () => {})
}

/** «B» выключается пропом `itemOff`, весь список — пропом `listOff`. */
function Harness({ itemOff = false, listOff = false, ...rest }: THarnessProps): ReactNode {
	return (
		<ListBox mode="multiple" disabled={listOff} {...rest}>
			<ListBox.Item value="a" text="A" />
			<ListBox.Item value="b" text="B" disabled={itemOff} />
		</ListBox>
	)
}

type THarnessProps = ListBoxProps & { itemOff?: boolean; listOff?: boolean }

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const engines: Array<{ extensions: { batch: { items: readonly object[] } } }> = []

		mount(
			<ListBox onEngineCreate={(engine) => engines.push(engine)}>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" />
				<ListBox.Item value="c" text="C" />
			</ListBox>,
		)
		await flush()

		const items = engines.at(-1)?.extensions.batch.items ?? []

		expect(items.map((item) => Reflect.get(item, 'value'))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, onChangeValue сообщает', () => {
		const onChangeValue = vi.fn()

		mount(<Harness onChangeValue={onChangeValue} />)

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
		const { render } = mount(<Harness {...off} />)

		expect(rowOf('B').dataset.disabled).toBe('true')

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])

		render(<Harness {...on} />)
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
		const { root } = mount(<Harness />)

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		const { root } = mount(<Harness />)

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
		mount(<ListBox items={ITEMS} />)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/**
	 * Фасад собирается конструктором из тех же пропсов, и `items` он уже
	 * записал: связка, получив те же пропсы при коммите, второй раз их не пишет.
	 * Сеттер `items` без `trackBy` — это очистка и новый набор.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<TItem>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		mount(<ListBox engine={engine} items={ITEMS} />)

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		mount(<ListBox engine={engine} />)

		expect(listItems()).toHaveLength(2)

		act(() => engine.extensions.batch.set([{ value: 'c', text: 'Третий' }]))

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const { render } = mount(<ListBox items={ITEMS} value="b" />)

		expect(selection()).toEqual(['false', 'true', 'false'])

		render(<ListBox items={ITEMS} value="c" />)

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		mount(<ListBox engine={engine} />)

		act(() => {
			engine.getCore().driver.events.on('items:query:before', (e) => {
				e.items = e.items.filter((item) => item.value !== 'b')
			})
			engine.getCore().driver.invalidateQuery()
		})

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
		const { root } = mount(
			<ListBox engine={engine} mode="multiple" items={ITEMS} title="Города">
				<ListBox.Item value="z" text="Z" selected title="Строка" />
			</ListBox>,
		)

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
		}

		expect(root().getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		mount(
			<ListBox>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" selected />
			</ListBox>,
		)

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		mount(
			<ListBox>
				<ListBox.Item
					value="a"
					text="A"
					className="mine"
					style={{ color: 'red' }}
					id="row-a"
				/>
			</ListBox>,
		)

		const item = find(document, '.s-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по строке не отменяет выбор', () => {
		const onClick = vi.fn()

		mount(
			<ListBox>
				<ListBox.Item value="a" text="A" onClick={onClick} />
			</ListBox>,
		)

		click(rowOf('A'))

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(selection()).toEqual(['true'])
	})
})

describe('отметка выбранного и слоты', () => {
	it('без indicator обёртки отметки нет', () => {
		mount(<ListBox items={ITEMS} value="a" />)

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(<ListBox items={ITEMS} indicator="start" />)

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
		const { render } = mount(<ListBox items={ITEMS.slice(0, 1)} indicator="start" />)

		expect(sideOf()).toBe('start')

		render(<ListBox items={ITEMS.slice(0, 1)} indicator="end" />)

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		mount(
			<ListBox indicator="start">
				<ListBox.Item
					value="a"
					text="A"
					indicator-icon={({ selected }) =>
						selected ? <b className="custom">V</b> : null
					}
				/>
			</ListBox>,
		)

		expect(document.querySelector('.custom')).toBeNull()

		click(rowOf('A'))

		expect(document.querySelector('.s-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.s-list-box-item__indicator svg')).toBeNull()
	})

	it('children элемента получает text и selected, без него — text', () => {
		mount(
			<ListBox>
				<ListBox.Item value="a" text="A">
					{({ text, selected }) => `${text}:${String(selected)}`}
				</ListBox.Item>
				<ListBox.Item value="b" text="B" />
			</ListBox>,
		)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		click(rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		mount(
			<ListBox
				items={ITEMS.slice(0, 2)}
				header={<i className="head">шапка</i>}
				footer={<i className="foot">подвал</i>}
				item={({ item }) => `[${item.text}]`}
				item-leading={({ item }) => <u className="lead">{String(item.value)}</u>}
				item-trailing={({ item }) => <s className="trail">{String(item.value)}</s>}
			/>,
		)

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
})

describe('типы', () => {
	it('ListBox.Item — это ListBoxItem', () => {
		expect(ListBox.Item).toBe(ListBoxItem)
		expectTypeOf(ListBox.Item).toEqualTypeOf<typeof ListBoxItem>()
	})

	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<ListBoxProps['item']>
		type TChildren = NonNullable<ListBoxItemProps['children']>
		type TIndicator = NonNullable<ListBoxItemProps['indicator-icon']>

		expectTypeOf<(scope: { item: IListBoxItem }) => ReactNode>().toExtend<TItemSlot>()
		expectTypeOf<
			(scope: { text: string; selected: boolean }) => ReactNode
		>().toExtend<TChildren>()
		expectTypeOf<(scope: { selected: boolean }) => ReactNode>().toExtend<TIndicator>()
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
