/**
 * ListBox в Solid — первая коллекция адаптера.
 *
 * Движок коллекций, его расширения и плагины перенесены без правок, и эти
 * тесты — проверка того, что механика ядра не написана под Vue и React.
 * Сценарии — те же, что у React (`list-box.spec.tsx`) и Svelte
 * (`list-box.spec.ts`): выбор, состав, отметка и слоты.
 *
 * Своё у Solid — момент входа элемента в коллекцию: при выполнении тела
 * компонента (`attach` контекста в `useAdapter`), как у Vue и Svelte. Лифт —
 * слой значений, который детям отдаёт `Elevate`; его проверяет
 * `collection-elevator.spec.tsx`.
 *
 * И петля. Записи `drawn` новые на каждую смену, и `<For>` пересоздавал бы
 * все элементы списка вместе с узлами и фокусом. Петля адаптера держит узел
 * по ключу записи (`KeyedFor`): элемент, добавленный в список, соседей не
 * трогает.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { createSignal, For, Show, type JSX } from 'solid-js'
import {
	createEngine,
	createEngineListBox,
	type IListBoxItem,
	type TListBoxCollection,
	type TListBoxValue,
	type TListBoxView,
	type TListIndicator,
} from '@soldy-ui/core'
import {
	ListBox,
	ListBoxGroup,
	ListBoxItem,
	type ListBoxItemProps,
	type ListBoxProps,
} from '@soldy-ui/solid'
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

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await Promise.resolve()
}

/** Движок так, как его видит тест: состав элементов. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

const valuesOf = (engine: TEngineView | undefined) =>
	engine?.extensions.batch.items.map((item) => Reflect.get(item, 'value'))

/** «B» выключается `itemOff`, весь список — `listOff`. */
type TOff = { itemOff?: boolean; listOff?: boolean }

/** Список из двух элементов разметки; выключенность — сигналом. */
function harness(off: () => TOff, list: ListBoxProps = {}): () => JSX.Element {
	return () => (
		<ListBox mode="multiple" disabled={off().listOff ?? false} {...list}>
			<ListBox.Item value="a" text="A" />
			<ListBox.Item value="b" text="B" disabled={off().itemOff ?? false} />
		</ListBox>
	)
}

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const engines: TEngineView[] = []

		mount(() => (
			<ListBox onEngineCreate={(engine) => engines.push(engine)}>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" />
				<ListBox.Item value="c" text="C" />
			</ListBox>
		))
		await flush()

		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, onChangeValue сообщает', () => {
		const onChangeValue = vi.fn()

		mount(harness(() => ({}), { onChangeValue }))

		rowOf('B').click()

		expect(selection()).toEqual(['false', 'true'])
		expect(onChangeValue).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: ['b'] }))

		rowOf('B').click()

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
		const [state, setState] = createSignal<TOff>(off)

		mount(harness(state))

		expect(rowOf('B').dataset.disabled).toBe('true')

		rowOf('B').click()

		expect(selection()).toEqual(['false', 'false'])

		setState(on)
		rowOf('B').click()

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
		const { root } = mount(harness(() => ({})))

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
		const { root } = mount(harness(() => ({})))

		expect(list().getAttribute('role')).toBe('listbox')
		expect(list().getAttribute('aria-multiselectable')).toBe('true')
		expect(root().hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		mount(harness(() => ({})))

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
		mount(() => <ListBox items={ITEMS} />)

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
		const [own, setOwn] = createSignal<string | undefined>('row-first')

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="Первый" id={own()} />
				<ListBox.Item value="b" text="Второй" />
			</ListBox>
		))

		await nextFrame()
		press(list(), 'ArrowDown')

		expect(rowOf('Первый').id).toBe('row-first')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-first')
		expect(document.querySelectorAll('[id="row-first"]')).toHaveLength(1)
		expect(listItems()[0].hasAttribute('id')).toBe(false)

		setOwn('row-one')

		expect(rowOf('Первый').id).toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-one')

		setOwn(undefined)

		const fallback = rowOf('Первый').id

		expect(fallback).not.toBe('')
		expect(fallback).not.toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe(fallback)
	})

	/**
	 * В `listbox` ARIA пускает только опции, поэтому шапка и подвал — дети
	 * корня рядом с узлом списка. Их клавиши — не списка: поле печатает,
	 * кнопка нажимается.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const { root } = mount(() => (
			<ListBox
				header={<input class="so-test-header" />}
				footer={<button class="so-test-footer">Готово</button>}
			>
				<ListBox.Item value="a" text="A" />
			</ListBox>
		))

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
 * чья отметка сменилась, и несёт новую. `v-model` у Solid нет, и состояние
 * приложения держит отметку само, коллекцию не читает.
 */
describe('отметка элемента: selected и onChangeSelected', () => {
	/** Список из трёх, отметки — в сигналах приложения; колбэки — в журнал. */
	function app(log: string[], mode?: ListBoxProps['mode']) {
		const marks = ['a', 'b', 'c'].map((value, index) => {
			const [selected, setSelected] = createSignal(index === 0)

			return { value, selected, setSelected }
		})

		mount(() => (
			<ListBox mode={mode}>
				<For each={marks}>
					{({ value, selected, setSelected }) => (
						<ListBox.Item
							value={value}
							text={value.toUpperCase()}
							selected={selected()}
							onChangeSelected={(next) => {
								log.push(`${value}: ${next}`)
								setSelected(next)
							}}
						/>
					)}
				</For>
			</ListBox>
		))

		return () => marks.map(({ selected }) => String(selected())).join(' ')
	}

	it('клик по B: A получает false, B — true, C молчит; состояние сходится с выбором', () => {
		const log: string[] = []
		const state = app(log)

		expect(selection()).toEqual(['true', 'false', 'false'])

		log.length = 0
		rowOf('B').click()

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('multiple: повторный клик снимает только свою отметку', () => {
		const log: string[] = []
		const state = app(log, 'multiple')

		log.length = 0
		rowOf('C').click()
		rowOf('A').click()

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
		mount(() => <ListBox items={ITEMS} />)

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

		mount(() => <ListBox engine={engine} items={ITEMS} />)

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		mount(() => <ListBox engine={engine} />)

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const [value, setValue] = createSignal('b')

		mount(() => <ListBox items={ITEMS} value={value()} />)

		expect(selection()).toEqual(['false', 'true', 'false'])

		setValue('c')

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		mount(() => <ListBox engine={engine} />)

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()

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
		const { root } = mount(() => (
			<ListBox engine={engine} mode="multiple" items={ITEMS} title="Города">
				<ListBox.Item value="z" text="Z" selected title="Строка" />
			</ListBox>
		))

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(list().hasAttribute(name), name).toBe(false)
		}

		expect(root().hasAttribute('title')).toBe(false)
		expect(list().getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	/**
	 * Элемент разметки, удалённый движком, пока смонтирован, не рисуется
	 * (`TItemContext.destroy`), но остаётся содержимым списка: слот задан
	 * значением, а не узлами. Запасное из данных по ещё не обновлённым секциям
	 * не включается и удалённый элемент в коллекцию не возвращает — список
	 * пуст, на месте элементов слот `empty`.
	 */
	it.each([
		[
			'remove',
			(engine: TListBoxCollection) =>
				engine.extensions.batch.remove([...engine.extensions.batch.items]),
		],
		['clear', (engine: TListBoxCollection) => engine.extensions.batch.clear()],
	])(
		'элемент разметки, удалённый движком (%s), — коллекция пуста, empty на месте',
		(_name, drop) => {
			const engine = createEngineListBox()

			mount(() => (
				<ListBox engine={engine} empty={<span class="empty">Пусто</span>}>
					<ListBox.Item value="a" text="A" />
				</ListBox>
			))

			expect(valuesOf(engine)).toEqual(['a'])

			drop(engine)

			expect(engine.extensions.batch.items).toEqual([])
			expect(engine.extensions.batch.shown).toEqual([])
			expect(listItems()).toHaveLength(0)
			expect([...list().children].map((child) => child.className)).toEqual(['empty'])
		},
	)

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" selected />
			</ListBox>
		))

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" class="mine" style={{ color: 'red' }} id="row-a" />
			</ListBox>
		))

		const item = find(document, '.so-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по строке не отменяет выбор', () => {
		const onClick = vi.fn()

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" onClick={onClick} />
			</ListBox>
		))

		rowOf('A').click()

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(selection()).toEqual(['true'])
	})

	/** Обработчик Solid бывает и парой `[handler, data]`: склейка зовёт его так же. */
	it('клик потребителя парой [handler, data] — после выбора, с данными', () => {
		const calls: Array<[string, boolean]> = []
		const handler = (data: string, event: MouseEvent) => {
			calls.push([data, event instanceof MouseEvent])
		}

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" onClick={[handler, 'данные']} />
			</ListBox>
		))

		rowOf('A').click()

		expect(calls).toEqual([['данные', true]])
		expect(selection()).toEqual(['true'])
	})

	/**
	 * Вид строки элементу отдаёт фасад, а у списка без вида его нет вовсе:
	 * ключа со значением `undefined` в сторе Solid нет. Вид, заданный позже,
	 * доходит до строк — состояние двух контекстов элемента его видит.
	 */
	it('view, заданный списку после монтирования, доходит до строк', () => {
		const [view, setView] = createSignal<TListBoxView | undefined>(undefined)
		const views = () =>
			rows().map((row) => [...row.classList].filter((name) => name.includes('--view-')))

		mount(() => <ListBox items={ITEMS.slice(0, 2)} view={view()} />)

		expect(views()).toEqual([[], []])

		setView('ghost')

		expect(views()).toEqual([['so-button--view-ghost'], ['so-button--view-ghost']])
	})
})

/**
 * Петля по ключу записи. Записи `drawn` коллекция собирает заново на каждую
 * смену, а узел элемента держит ключ записи: добавленный элемент соседей не
 * пересоздаёт — их узлы те же, и фокус остаётся, где был.
 */
describe('петля по drawn', () => {
	it('элемент, добавленный в items, не пересоздаёт соседей — узел и фокус на месте', async () => {
		const engine = createEngineListBox({ items: ITEMS.slice(0, 2) })

		mount(() => <ListBox engine={engine} />)
		await nextFrame()

		const before = listItems()
		const focused = rowOf('Второй')

		focused.focus()

		expect(document.activeElement).toBe(focused)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])

		const after = listItems()

		expect(after).toHaveLength(3)
		expect(after.slice(0, 2)).toEqual(before)
		after.slice(0, 2).forEach((node, index) => expect(node).toBe(before[index]))
		expect(rowOf('Второй')).toBe(focused)
		expect(document.activeElement).toBe(focused)
	})

	/** С `trackBy` смена `items` — правка состава, а не новый набор: соседи — те же элементы. */
	it('снятый из items элемент уходит со своим узлом, соседи на месте', () => {
		const [items, setItems] = createSignal<TItem[]>(ITEMS)

		mount(() => <ListBox items={items()} trackBy={(item) => Reflect.get(item, 'value')} />)

		const [first, , third] = listItems()

		setItems([ITEMS[0], ITEMS[2]])

		const after = listItems()

		expect(after).toHaveLength(2)
		expect(after[0]).toBe(first)
		expect(after[1]).toBe(third)
	})
})

describe('отметка выбранного и слоты', () => {
	it('без indicator обёртки отметки нет', () => {
		mount(() => <ListBox items={ITEMS} value="a" />)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(() => <ListBox items={ITEMS} indicator="start" />)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.so-list-box-item__indicator svg')).toHaveLength(0)

		rowOf('Второй').click()

		expect(
			listItems().map((item) => !!item.querySelector('.so-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const [indicator, setIndicator] = createSignal<TListIndicator>('start')
		const sideOf = () => {
			const mark = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return mark.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		mount(() => <ListBox items={ITEMS.slice(0, 1)} indicator={indicator()} />)

		expect(sideOf()).toBe('start')

		setIndicator('end')

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		mount(() => (
			<ListBox indicator="start">
				<ListBox.Item
					value="a"
					text="A"
					indicator-icon={({ selected }) => (selected ? <b class="custom">V</b> : null)}
				/>
			</ListBox>
		))

		expect(document.querySelector('.custom')).toBeNull()

		rowOf('A').click()

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
	})

	it('children элемента получает text и selected, без него — text', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A">
					{({ text, selected }) => `${text}:${String(selected)}`}
				</ListBox.Item>
				<ListBox.Item value="b" text="B" />
			</ListBox>
		))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		rowOf('A:false').click()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				header={<i class="head">шапка</i>}
				footer={<i class="foot">подвал</i>}
				item={({ item }) => `[${item.text}]`}
				item-leading={({ item }) => <u class="lead">{String(item.value)}</u>}
				item-trailing={({ item }) => <s class="trail">{String(item.value)}</s>}
			/>
		))

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
	 * Узлы, которые нарисовал бы список, scope элемента теряли бы: `text` и
	 * `selected` держит элемент.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				item={({ item, text, selected }) =>
					`${String(item.value)}:${text}:${String(selected)}`
				}
			/>
		))

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		rowOf('b:Второй:false').click()

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * Scope слота живой: слот, прочитавший его в разметке, переживает выбор
	 * теми же узлами — кнопка или поле в пункте фокуса не теряют.
	 */
	it('children элемента, читающий scope в разметке, — тот же узел после выбора', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A">
					{(scope) => (
						<b class="probe">
							{scope.text}:{String(scope.selected)}
						</b>
					)}
				</ListBox.Item>
			</ListBox>
		))
		const probe = find(document, '.probe', HTMLElement)

		rowOf('A:false').click()

		expect(find(document, '.probe', HTMLElement)).toBe(probe)
		expect(probe.textContent).toBe('A:true')
	})

	/** Проброс сливает scope элемента с элементом живыми полями — так же. */
	it('item списка, читающий scope в разметке, — те же узлы после выбора', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				item={(scope) => (
					<b class="probe">
						{String(scope.item.value)}:{String(scope.selected)}
					</b>
				)}
			/>
		))
		const probes = [...document.querySelectorAll('.probe')]

		rowOf('b:false').click()

		expect([...document.querySelectorAll('.probe')]).toEqual(probes)
		expect(probes.map((probe) => probe.textContent)).toEqual(['a:false', 'b:true'])
	})

	/**
	 * Пустое, что вернул проброс, элемент видит и рисует своё — как у Vue и
	 * React: отметка одному элементу, у остальных — иконка.
	 */
	it('item-indicator-icon подменяет отметку одному элементу, у остальных — своя', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				mode="multiple"
				indicator="start"
				item-indicator-icon={({ item, selected }) =>
					item.value === 'a' ? <b class="probe">{String(selected)}</b> : null
				}
			/>
		))
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

		rowAt(0).click()
		rowAt(1).click()

		expect(marks()).toEqual(['slot:true', 'icon'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		const [items, setItems] = createSignal<TItem[]>([])
		const { root } = mount(() => (
			<ListBox
				items={items()}
				header={<i class="head" />}
				empty={<p class="probe">Пусто</p>}
				footer={<i class="foot" />}
			/>
		))

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...list().children].map((child) => child.className)).toEqual(['probe'])

		setItems(ITEMS.slice(0, 2))

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})

	/**
	 * Содержимое списка Solid разворачивает один раз: проверка «заданы ли
	 * элементы разметки» второго экземпляра не рисует.
	 */
	it('элементы разметки — по одному экземпляру, и в движке тоже', async () => {
		const engines: TEngineView[] = []
		const values = ['a', 'b']

		mount(() => (
			<ListBox onEngineCreate={(engine) => engines.push(engine)}>
				<For each={values}>{(value) => <ListBox.Item value={value} text={value} />}</For>
			</ListBox>
		))
		await flush()

		expect(listItems()).toHaveLength(2)
		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b'])
	})
})

/**
 * Группы — как у Vue (`ui/vue/__tests__/list-groups.spec.ts`). Из данных:
 * секции нарисованного (`drawnSections`) — группа с подписью в
 * `ListBox.Group`, элементы без группы — прямо в списке, а между секциями,
 * пока их просит список (`groupSeparators`, по умолчанию выключен), — немой
 * разделитель; группы из `groups` — первыми, остальное — по месту. Разметкой:
 * `ListBox.Group` входит в ту же группировку, и секции описывают её. Стрелки
 * ходят тем же порядком, что элементы стоят на экране. Петля секций — по
 * ключу секции: смена подписи группы и разделителей узлов элементов не
 * пересоздаёт.
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
		mount(() => <ListBox items={MIXED} groups={GROUPS} />)

		expect(parts()).toEqual(SECTIONS)

		for (const group of list().querySelectorAll('.so-list-box-group')) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
		}
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже, узлы элементов те же', () => {
		const [separated, setSeparated] = createSignal(true)

		mount(() => <ListBox items={MIXED} groups={GROUPS} groupSeparators={separated()} />)

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		const before = listItems()

		setSeparated(false)

		expect(parts()).toEqual(SECTIONS)
		listItems().forEach((node, index) => expect(node).toBe(before[index]))
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		mount(() => <ListBox items={MIXED} groups={GROUPS} />)

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

	it('смена подписи в groups — новые подписи, узлы элементов те же', () => {
		const [groups, setGroups] = createSignal(GROUPS)

		mount(() => <ListBox items={MIXED} groups={groups()} />)

		const before = listItems()

		setGroups([
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		])

		expect(parts()).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
		listItems().forEach((node, index) => expect(node).toBe(before[index]))
	})

	it('без группировки — ни групп, ни разделителей', () => {
		mount(() => <ListBox items={ITEMS} />)

		expect(parts()).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/** «Вода» — над группой «Фрукты», «Сок» — под ней: группы не заявлены. */
	function markup(engine: TListBoxCollection, label: () => string = () => 'Фрукты') {
		return () => (
			<ListBox engine={engine}>
				<ListBox.Item value="water" text="Вода" />
				<ListBox.Group label={label()}>
					<ListBox.Item value="apple" text="Яблоко" />
					<ListBox.Item value="pear" text="Груша" />
				</ListBox.Group>
				<ListBox.Item value="juice" text="Сок" />
			</ListBox>
		)
	}

	/** Секции коротко: подпись группы (`null` — без группы) и значения элементов. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const engine = createEngineListBox()

		mount(markup(engine))

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts()).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		mount(markup(createEngineListBox()))

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
		const [label, setLabel] = createSignal('Фрукты')

		mount(markup(engine, label))

		setLabel('Ягоды')

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
			(scope: { item: IListBoxItem; text: string; selected: boolean }) => JSX.Element
		>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: IListBoxItem; selected: boolean }) => JSX.Element>().toExtend<
			NonNullable<ListBoxProps['item-indicator-icon']>
		>()
		expectTypeOf<
			(scope: { text: string; selected: boolean }) => JSX.Element
		>().toExtend<TChildren>()
		expectTypeOf<(scope: { selected: boolean }) => JSX.Element>().toExtend<TIndicator>()
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

/**
 * The consumer hears nothing once the teardown began, as in the other
 * adapters: Solid cleans the children before the cleanups of the owner's
 * body, and the markup items leaving the collection sent `onChangeItems` with
 * an ever shorter list — a consumer keeping it in its state lost the list
 * with the owner (benchmarks/parity/README.md).
 */
describe('события снятия', () => {
	it('владелец под Show уходит молча: длина списка у потребителя прежняя', () => {
		const [shown, setShown] = createSignal(true)
		const [count, setCount] = createSignal(0)
		const heard: string[] = []

		mount(() => (
			<Show when={shown()}>
				<ListBox
					onChangeItems={(items) => setCount(items.length)}
					onItemRemoved={() => heard.push('item:removed')}
					onElementRemoved={() => heard.push('element:removed')}
				>
					<ListBoxItem value="a" text="A" />
					<ListBoxItem value="b" text="B" />
				</ListBox>
			</Show>
		))

		expect(count()).toBe(2)

		setShown(false)

		expect(count()).toBe(2)
		expect(heard).toEqual([])
	})

	it('снятие корня — без событий', () => {
		const heard: string[] = []
		const { destroy } = mount(() => (
			<ListBox
				onChangeItems={(items) => heard.push(`items ${items.length}`)}
				onElementRemoved={() => heard.push('element:removed')}
			>
				<ListBoxItem value="a" text="A" />
			</ListBox>
		))
		const mounted = heard.length

		destroy()

		expect(heard.slice(mounted)).toEqual([])
	})
})

/**
 * The items of markup hear nothing of their siblings going with the owner:
 * Solid cleans them one by one, and an item still heard heard its order
 * change as the others left. The owner's `detach` detaches its collection's
 * members before any goes (`TCollectionMembers`).
 */
describe('события снятия элементов', () => {
	it('элементы разметки не слышат, как уходят соседи', () => {
		const [shown, setShown] = createSignal(true)
		const heard: string[] = []
		const item = (value: string) => (
			<ListBoxItem
				value={value}
				text={value}
				onChangeOrder={() => heard.push(`${value} order`)}
				onChangeAria={() => heard.push(`${value} aria`)}
			/>
		)

		mount(() => (
			<Show when={shown()}>
				<ListBox>
					{item('a')}
					{item('b')}
					{item('c')}
				</ListBox>
			</Show>
		))

		const mounted = heard.length

		setShown(false)

		expect(heard.slice(mounted)).toEqual([])
	})
})
