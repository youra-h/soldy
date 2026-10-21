/**
 * ListBox в React — первый коллекционный компонент адаптера.
 *
 * Движок коллекций, его расширения и плагины перенесены без правок, и эти
 * тесты — проверка того, что механика ядра не написана под Vue. Сценарии —
 * те же, что у Vue (`list-box-choose`, `list-box-tabindex`, `list-indicator`,
 * `engine-prop`, `collection-shown`): выбор, состав, отметка и слоты.
 *
 * Своё у React — момент входа элемента в коллекцию: не на рендере, а при
 * коммите (`attach` контекста в эффекте `useAdapterContext`). Его и лифт проверяет
 * `list-box-elevator.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { act, useState, type ReactNode } from 'react'
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
} from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

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
	 * Roving tabindex (APG listbox): Tab фокусирует узел списка, а по элементам
	 * ходят стрелки. `tabindex="-1"` элемента пишет ядро в его `aria`, и на
	 * строке он перекрывает `tabindex="0"`, который кнопка на `div` ставит себе
	 * сама: атрибуты снаружи ложатся на корень поверх наборов. Корень — рамка
	 * вокруг шапки, списка и подвала, остановкой он не бывает.
	 */
	it('строки — не остановки Tab, узел списка — остановка, корень — нет', () => {
		const { root } = mount(<Harness />)

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
		const { root } = mount(<Harness />)

		expect(list().getAttribute('role')).toBe('listbox')
		expect(list().getAttribute('aria-multiselectable')).toBe('true')
		expect(root().hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		mount(<Harness />)

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
	 * В `listbox` ARIA пускает только опции, поэтому шапка и подвал — дети
	 * корня рядом с узлом списка. Их клавиши — не списка: поле печатает,
	 * кнопка нажимается.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const { root } = mount(
			<ListBox
				header={<input className="so-test-header" />}
				footer={<button className="so-test-footer">Готово</button>}
			>
				<ListBox.Item value="a" text="A" />
			</ListBox>,
		)

		await nextFrame()

		const header = find(document, '.so-test-header', HTMLInputElement)
		const footer = find(document, '.so-test-footer', HTMLButtonElement)

		expect([...root().children]).toEqual([header, list(), footer])
		expect(list().contains(header)).toBe(false)
		expect(list().contains(footer)).toBe(false)

		press(header, 'ArrowDown')
		press(footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})
})

/**
 * Отметка элемента — в обе стороны, парой «проп + колбэк», без `ctrl`:
 * `selected` пропом пишет её, а `onChangeSelected` приходит только элементу,
 * чья отметка сменилась, и несёт новую. Состояние приложения держит отметку
 * само и коллекцию не читает.
 */
describe('отметка элемента: selected и onChangeSelected', () => {
	/** Список из трёх, отметки — в состоянии приложения; колбэки — в журнал. */
	function App({ log, mode }: { log: string[]; mode?: ListBoxProps['mode'] }): ReactNode {
		const [a, setA] = useState(true)
		const [b, setB] = useState(false)
		const [c, setC] = useState(false)
		const item = (value: string, selected: boolean, set: (selected: boolean) => void) => (
			<ListBox.Item
				value={value}
				text={value.toUpperCase()}
				selected={selected}
				onChangeSelected={(next) => {
					log.push(`${value}: ${next}`)
					set(next)
				}}
			/>
		)

		return (
			<>
				<ListBox mode={mode}>
					{item('a', a, setA)}
					{item('b', b, setB)}
					{item('c', c, setC)}
				</ListBox>
				<output className="so-test-state">{[a, b, c].map(String).join(' ')}</output>
			</>
		)
	}

	const state = () => document.querySelector('.so-test-state')?.textContent

	it('клик по B: A получает false, B — true, C молчит; состояние сходится с выбором', () => {
		const log: string[] = []

		mount(<App log={log} />)

		expect(selection()).toEqual(['true', 'false', 'false'])

		log.length = 0
		click(rowOf('B'))

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('multiple: повторный клик снимает только свою отметку', () => {
		const log: string[] = []

		mount(<App log={log} mode="multiple" />)
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
	 * не съели ни компонент, ни фасад, — уходит: у списка — узлу списка, у
	 * элемента — строке.
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
			expect(list().hasAttribute(name), name).toBe(false)
		}

		expect(root().hasAttribute('title')).toBe(false)
		expect(list().getAttribute('title')).toBe('Города')
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

		const item = find(document, '.so-list-box-item', HTMLElement)

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

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(<ListBox items={ITEMS} indicator="start" />)

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

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
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
	 * Узел, который нарисовал бы список, scope элемента терял бы: `text` и
	 * `selected` держит элемент.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		mount(
			<ListBox
				items={ITEMS.slice(0, 2)}
				item={({ item, text, selected }) =>
					`${String(item.value)}:${text}:${String(selected)}`
				}
			/>,
		)

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

	it('item-indicator-icon подменяет отметку одному элементу, у остальных — своя', () => {
		mount(
			<ListBox
				items={ITEMS.slice(0, 2)}
				mode="multiple"
				indicator="start"
				item-indicator-icon={({ item, selected }) =>
					item.value === 'a' ? <b className="probe">{String(selected)}</b> : null
				}
			/>,
		)
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

		expect(marks()).toEqual(['slot:true', 'icon'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		const { root, render } = mount(
			<ListBox
				items={[]}
				header={<i className="head" />}
				empty={<p className="probe">Пусто</p>}
				footer={<i className="foot" />}
			/>,
		)

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...list().children].map((child) => child.className)).toEqual(['probe'])

		render(
			<ListBox
				items={ITEMS.slice(0, 2)}
				header={<i className="head" />}
				empty={<p className="probe">Пусто</p>}
				footer={<i className="foot" />}
			/>,
		)

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
 * ходят тем же порядком, что элементы стоят на экране.
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
					node.querySelector('.so-list-box-group__label')?.textContent ?? '',
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
		mount(<ListBox items={MIXED} groups={GROUPS} />)

		expect(parts()).toEqual(SECTIONS)

		for (const group of list().querySelectorAll('.so-list-box-group')) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
		}
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже', () => {
		const { render } = mount(<ListBox items={MIXED} groups={GROUPS} groupSeparators />)

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		render(<ListBox items={MIXED} groups={GROUPS} groupSeparators={false} />)

		expect(parts()).toEqual(SECTIONS)
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		mount(<ListBox items={MIXED} groups={GROUPS} />)

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
		const { render } = mount(<ListBox items={MIXED} groups={GROUPS} />)

		render(
			<ListBox
				items={MIXED}
				groups={[
					{ key: 'fruit', label: 'Fruit' },
					{ key: 'veg', label: 'Vegetables' },
				]}
			/>,
		)

		expect(parts()).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
	})

	it('без группировки — ни групп, ни разделителей', () => {
		mount(<ListBox items={ITEMS} />)

		expect(parts()).toEqual(['Первый', 'Второй', 'Третий'])
	})

	it('ListBox.Group разметкой — группа с подписью, элементы — в коллекции списка', () => {
		mount(
			<ListBox>
				<ListBox.Group label="Фрукты">
					<ListBox.Item value="apple" text="Яблоко" />
				</ListBox.Group>
				<ListBox.Item value="water" text="Вода" />
			</ListBox>,
		)

		expect(parts()).toEqual([['Фрукты', ['Яблоко']], 'Вода'])
		expect(selection()).toEqual(['false', 'false'])
	})

	/** «Вода» — над группой «Фрукты», «Сок» — под ней: группы не заявлены. */
	function Markup({ engine, label = 'Фрукты' }: TMarkupProps): ReactNode {
		return (
			<ListBox engine={engine}>
				<ListBox.Item value="water" text="Вода" />
				<ListBox.Group label={label}>
					<ListBox.Item value="apple" text="Яблоко" />
					<ListBox.Item value="pear" text="Груша" />
				</ListBox.Group>
				<ListBox.Item value="juice" text="Сок" />
			</ListBox>
		)
	}

	type TMarkupProps = { engine: TListBoxCollection; label?: string }

	/** Секции коротко: подпись группы (`null` — без группы) и значения элементов. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const engine = createEngineListBox()

		mount(<Markup engine={engine} />)

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts()).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		mount(<Markup engine={createEngineListBox()} />)

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
		const { render } = mount(<Markup engine={engine} />)

		render(<Markup engine={engine} label="Ягоды" />)

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

	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<ListBoxProps['item']>
		type TChildren = NonNullable<ListBoxItemProps['children']>
		type TIndicator = NonNullable<ListBoxItemProps['indicator-icon']>

		expectTypeOf<
			(scope: { item: IListBoxItem; text: string; selected: boolean }) => ReactNode
		>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: IListBoxItem; selected: boolean }) => ReactNode>().toExtend<
			NonNullable<ListBoxProps['item-indicator-icon']>
		>()
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
