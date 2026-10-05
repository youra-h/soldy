/**
 * Наполнение коллекции — линейно по числу элементов.
 *
 * Пачка (`batch.set`, `patch`) шлёт `item:added` на каждый элемент разом в
 * конце, когда в хранилище уже лежат все. Обработчик `item:added`, который
 * проходит всю коллекцию, превращает наполнение в N проходов по N элементам:
 * 5000 строк таблицы с выбором наполнялись около 3,2 с, тот же состав без
 * выбора — около 0,03 с. Правило: на `item:added` — только добавленный
 * элемент; всем — на смену своего состояния (`change:selection`,
 * `change:activation`) и раз на запись (`change:items`).
 *
 * Замер — числом, а не временем: время зависит от машины, число — нет.
 * Записей в наборы элементов (`aria`, `dataset`) за наполнение вдвое больше
 * элементов — вдвое больше записей, а не вчетверо. Значение владельца
 * сверяется с составом раз на запись, а не на каждый добавленный элемент.
 *
 * Выбранных при наполнении бывает много — отметкой в данных
 * (`_: { selected: true }`) или значением владельца в `multiple`. Выбор,
 * поставленный по одному элементу, слал бы `change:selection` на каждый, и
 * подписчики выбора проходили бы всю коллекцию на каждый выбранный. Отметки
 * записи и ключи значения выбираются одной операцией: смен выбора за
 * наполнение — одна-две при любом числе выбранных.
 *
 * Сценарий один на все коллекции: забытая коллекция иначе прошла бы мимо.
 * Каждая сборка — замыкание на своей фабрике, как в
 * `collection-style-inherit.spec.ts`: общая сигнатура движков стёрла бы их
 * типы.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createEngine,
	createEngineAccordion,
	createEngineListBox,
	createEngineRadioGroup,
	createEngineSelect,
	createEngineTable,
	createEngineTabs,
	createEngineTags,
	TAccordion,
	TAttributes,
	TCollectionStorageDriver,
	TListBox,
	TRadioGroup,
	TSelect,
	TTable,
	TTabs,
	TTags,
} from '@soldy-ui/core'
import type { TAria, TDataset } from '@soldy-ui/core'

/** Сколько элементов в меньшем наполнении; большее — вдвое. */
const COUNT = 100

/** Источник элемента — то, что приходит в `items`; `_` — отметки из данных. */
type TSource = { value: string; _?: { selected: boolean } }

/** Наборы элемента, записи в которые считаются. */
type TItemSets = { readonly aria: TAria; readonly dataset: TDataset }

/** Собранная коллекция с владельцем, ещё пустая. */
type THarness = {
	/** Наполнить: весь состав — одной записью, `batch.set`. */
	fill(sources: TSource[]): void
	/** Элементы коллекции после наполнения. */
	items(): ReadonlyArray<TItemSets>
}

type TCase = { name: string; build(): THarness }

/** `count` источников со своими значениями: `v0`, `v1`, … */
function sources(count: number): TSource[] {
	return Array.from({ length: count }, (_, index) => ({ value: `v${index}` }))
}

/** Каждый `MARK_STEP`-й источник отмечен выбранным: отметок — доля состава. */
const MARK_STEP = 4

/** Отмечен ли выбранным источник с номером `index`. */
const isMarked = (index: number) => index % MARK_STEP === 0

/** `count` источников, каждый `MARK_STEP`-й — с `_: { selected: true }`. */
function markedSources(count: number): TSource[] {
	return sources(count).map((source, index) =>
		isMarked(index) ? { ...source, _: { selected: true } } : source,
	)
}

/**
 * У строки таблицы `value` нет: строка — запись приложения, и `value`
 * источника становится ключом записи. Отметки из данных — как есть.
 */
const tableRow = ({ value, ...marks }: TSource) => ({ data: { value }, ...marks })

const cases: TCase[] = [
	{
		name: 'ListBox',
		build: () => {
			const { batch } = createEngineListBox({ owner: new TListBox() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'Tabs',
		build: () => {
			const { batch } = createEngineTabs({ owner: new TTabs() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'Accordion',
		build: () => {
			const { batch } = createEngineAccordion({ owner: new TAccordion() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'Tags',
		build: () => {
			const { batch } = createEngineTags({ owner: new TTags() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'RadioGroup',
		build: () => {
			const { batch } = createEngineRadioGroup({ owner: new TRadioGroup() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'Select',
		build: () => {
			const { batch } = createEngineSelect({ owner: new TSelect() }).extensions

			return { fill: (list) => batch.set(list), items: () => batch.items }
		},
	},
	{
		name: 'Table',
		build: () => {
			const { batch } = createEngineTable({ owner: new TTable() }).extensions

			return { fill: (list) => batch.set(list.map(tableRow)), items: () => batch.items }
		},
	},
]

/**
 * Сколько раз за наполнение `count` элементами писали в наборы `aria` и
 * `dataset` элементов. Считается каждая запись, а не только сменившая
 * значение: проход, который пишет то же самое, стоит столько же.
 */
function writesOnFill(
	build: () => THarness,
	count: number,
	make: (count: number) => TSource[] = sources,
): number {
	const harness = build()
	const add = vi.spyOn(TAttributes.prototype, 'add')

	try {
		harness.fill(make(count))

		const sets = new Set<unknown>(harness.items().flatMap((item) => [item.aria, item.dataset]))

		return add.mock.contexts.filter((context) => sets.has(context)).length
	} finally {
		add.mockRestore()
	}
}

describe.each(cases)('$name · наполнение линейно по числу элементов', ({ build }) => {
	it('вдвое больше элементов — вдвое больше записей в наборы, а не вчетверо', () => {
		const once = writesOnFill(build, COUNT)
		const twice = writesOnFill(build, 2 * COUNT)

		// Наборы элементов пишутся при наполнении: иначе считать было бы нечего
		expect(once).toBeGreaterThan(0)
		expect(twice).toBeLessThanOrEqual(2 * once)
	})
})

/**
 * Сколько элементов скопировали снимки состава (`driver.valueOf()`) за
 * `fill`. Снимок — копия хранилища: взятый на каждый вставляемый элемент
 * (позиция «в конец» по длине снимка), он делал пачку квадратичной даже без
 * выбора — 20 000 строк копировали 200 млн элементов.
 */
function copiesOf(fill: () => void): number {
	const valueOf = vi.spyOn(TCollectionStorageDriver.prototype, 'valueOf')

	try {
		fill()

		return valueOf.mock.results.reduce(
			(sum, result) => sum + (Array.isArray(result.value) ? result.value.length : 0),
			0,
		)
	} finally {
		valueOf.mockRestore()
	}
}

describe.each(cases)('$name · снимки состава при наполнении', ({ build }) => {
	it('вдвое больше элементов — вдвое больше скопированных, а не вчетверо', () => {
		const once = copiesOf(() => build().fill(sources(COUNT)))
		const twice = copiesOf(() => build().fill(sources(2 * COUNT)))

		expect(twice).toBeLessThanOrEqual(2 * once)
	})
})

describe('движок без компонента · снимки состава', () => {
	it('batch.set и push по одному копий состава не снимают', () => {
		expect(copiesOf(() => createEngine({ items: sources(COUNT) }))).toBe(0)

		const engine = createEngine<TSource>()

		expect(
			copiesOf(() => sources(COUNT).forEach((item) => engine.extensions.plain.push(item))),
		).toBe(0)
		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual(
			sources(COUNT).map((item) => item.value),
		)
	})
})

/** Владелец со значением и коллекция, в которую состав приходит после. */
type TValuedHarness = {
	/** Сколько раз за наполнение прочли значение владельца. */
	readonly valueReads: () => number
	/** Сколько раз за наполнение сменился выбор (у радио — активный элемент). */
	readonly selectionChanges: () => number
	/** Заменить состав: новые элементы с теми же значениями — `batch.items`. */
	replace(sources: TSource[]): void
}

type TValuedCase = { name: string; build(): TValuedHarness }

/**
 * Значение владельца — два элемента в `multiple`, у радио — один. Элементы со
 * значениями из него есть в любом наполнении (`v1`, `v3`).
 */
const VALUE = ['v1', 'v3']

const valuedCases: TValuedCase[] = [
	{
		name: 'ListBox',
		build: () => {
			const owner = new TListBox({ value: VALUE })
			const { batch, selection } = createEngineListBox({ owner }).extensions
			const reads = vi.spyOn(owner, 'value', 'get')
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)
			reads.mockClear()

			return {
				valueReads: () => reads.mock.calls.length,
				selectionChanges: () => changes.mock.calls.length,
				replace: (list) => {
					batch.items = list
				},
			}
		},
	},
	{
		name: 'Select',
		build: () => {
			const owner = new TSelect({ value: VALUE })
			const { batch, selection } = createEngineSelect({ owner }).extensions
			const reads = vi.spyOn(owner, 'value', 'get')
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)
			reads.mockClear()

			return {
				valueReads: () => reads.mock.calls.length,
				selectionChanges: () => changes.mock.calls.length,
				replace: (list) => {
					batch.items = list
				},
			}
		},
	},
	{
		name: 'Tags',
		build: () => {
			const owner = new TTags({ value: VALUE })
			const { batch, selection } = createEngineTags({ owner }).extensions
			const reads = vi.spyOn(owner, 'value', 'get')
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)
			reads.mockClear()

			return {
				valueReads: () => reads.mock.calls.length,
				selectionChanges: () => changes.mock.calls.length,
				replace: (list) => {
					batch.items = list
				},
			}
		},
	},
	{
		name: 'RadioGroup',
		build: () => {
			const owner = new TRadioGroup({ value: VALUE[1] })
			const { batch, activation } = createEngineRadioGroup({ owner }).extensions
			const reads = vi.spyOn(owner, 'value', 'get')
			const changes = vi.fn()

			activation.events.on('change:activation', changes)
			reads.mockClear()

			return {
				valueReads: () => reads.mock.calls.length,
				selectionChanges: () => changes.mock.calls.length,
				replace: (list) => {
					batch.items = list
				},
			}
		},
	},
]

/**
 * Наполнить коллекцию со значением `count` элементами и заменить их новыми с
 * теми же значениями — то, что приложение делает при каждом ответе сервера.
 */
function fillAndReplace(build: () => TValuedHarness, count: number): TValuedHarness {
	const harness = build()

	harness.replace(sources(count))
	harness.replace(sources(count))

	return harness
}

describe.each(valuedCases)('$name · значение владельца при наполнении', ({ build }) => {
	it('значение сверяется с составом раз на запись, а не на каждый элемент', () => {
		const once = fillAndReplace(build, COUNT)
		const twice = fillAndReplace(build, 2 * COUNT)

		expect(twice.valueReads()).toBe(once.valueReads())
	})

	it('смен выбора за наполнение и замену столько же при любом числе элементов', () => {
		const once = fillAndReplace(build, COUNT)
		const twice = fillAndReplace(build, 2 * COUNT)

		expect(once.selectionChanges()).toBeGreaterThan(0)
		expect(twice.selectionChanges()).toBe(once.selectionChanges())
	})
})

/** Коллекция с выбором в `multiple`, ещё пустая. */
type TMarkedHarness = THarness & {
	/** Сколько раз за наполнение сменился выбор. */
	readonly selectionChanges: () => number
}

/**
 * `aria` — чем элемент объявляет выбор скринридеру; у строки таблицы выбор
 * объявляет её чекбокс, и набор строки его не несёт.
 */
type TMarkedCase = { name: string; aria?: string; build(): TMarkedHarness }

const markedCases: TMarkedCase[] = [
	{
		name: 'ListBox',
		aria: 'aria-selected',
		build: () => {
			const { batch, selection } = createEngineListBox({ owner: new TListBox() }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				fill: (list) => batch.set(list),
				items: () => batch.items,
				selectionChanges: () => changes.mock.calls.length,
			}
		},
	},
	{
		name: 'Select',
		aria: 'aria-selected',
		build: () => {
			const { batch, selection } = createEngineSelect({ owner: new TSelect() }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				fill: (list) => batch.set(list),
				items: () => batch.items,
				selectionChanges: () => changes.mock.calls.length,
			}
		},
	},
	{
		name: 'Tags',
		aria: 'aria-selected',
		build: () => {
			const { batch, selection } = createEngineTags({ owner: new TTags() }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				fill: (list) => batch.set(list),
				items: () => batch.items,
				selectionChanges: () => changes.mock.calls.length,
			}
		},
	},
	{
		name: 'Accordion',
		aria: 'aria-expanded',
		build: () => {
			const { batch, selection } = createEngineAccordion({
				owner: new TAccordion(),
			}).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				fill: (list) => batch.set(list),
				items: () => batch.items,
				selectionChanges: () => changes.mock.calls.length,
			}
		},
	},
	{
		name: 'Table',
		build: () => {
			const { batch, selection } = createEngineTable({ owner: new TTable() }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				fill: (list) => batch.set(list.map(tableRow)),
				items: () => batch.items,
				selectionChanges: () => changes.mock.calls.length,
			}
		},
	},
]

describe.each(markedCases)('$name · отметки выбора из данных', ({ build, aria }) => {
	it('одна смена выбора за наполнение, признак выбора у каждого элемента итоговый', () => {
		const harness = build()

		harness.fill(markedSources(COUNT))

		const items = harness.items()
		const marks = items.map((_, index) => String(isMarked(index)))

		expect(harness.selectionChanges()).toBe(1)
		expect(items.map((item) => item.dataset.get('selected'))).toEqual(marks)
		// Добавленному признак пишут при добавлении, когда отмеченный ещё не
		// выбран, — итог ставит смена выбора в конце записи
		expect(items.map((item) => aria && item.aria.get(aria))).toEqual(
			marks.map((mark) => aria && mark),
		)
	})

	it('вдвое больше элементов и отметок — вдвое больше записей в наборы, а не вчетверо', () => {
		const once = writesOnFill(build, COUNT, markedSources)
		const twice = writesOnFill(build, 2 * COUNT, markedSources)

		expect(twice).toBeLessThanOrEqual(2 * once)
	})
})

/** Владелец в `multiple` со значением из многих ключей; состав приходит после. */
type TKeyedHarness = {
	/** Сколько раз за наполнение сменился выбор. */
	readonly selectionChanges: () => number
	/** Сколько элементов выбрано. */
	readonly selectedCount: () => number
	/** Наполнить: весь состав — одной записью, `batch.set`. */
	fill(sources: TSource[]): void
}

type TKeyedCase = { name: string; build(value: string[]): TKeyedHarness }

const keyedCases: TKeyedCase[] = [
	{
		name: 'ListBox',
		build: (value) => {
			const owner = new TListBox({ value })
			const { batch, selection } = createEngineListBox({ owner }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				selectionChanges: () => changes.mock.calls.length,
				selectedCount: () => selection.selectedCount,
				fill: (list) => batch.set(list),
			}
		},
	},
	{
		name: 'Select',
		build: (value) => {
			const owner = new TSelect({ value })
			const { batch, selection } = createEngineSelect({ owner }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				selectionChanges: () => changes.mock.calls.length,
				selectedCount: () => selection.selectedCount,
				fill: (list) => batch.set(list),
			}
		},
	},
	{
		name: 'Tags',
		build: (value) => {
			const owner = new TTags({ value })
			const { batch, selection } = createEngineTags({ owner }).extensions
			const changes = vi.fn()

			selection.mode = 'multiple'
			selection.events.on('change:selection', changes)

			return {
				selectionChanges: () => changes.mock.calls.length,
				selectedCount: () => selection.selectedCount,
				fill: (list) => batch.set(list),
			}
		},
	},
]

describe.each(keyedCases)('$name · значение из многих ключей при наполнении', ({ build }) => {
	it('ключи значения выбираются пачкой — не больше двух смен выбора при любом их числе', () => {
		const list = sources(COUNT)
		const harness = build(list.map(({ value }) => value))

		harness.fill(list)

		expect(harness.selectedCount()).toBe(COUNT)
		expect(harness.selectionChanges()).toBeLessThanOrEqual(2)
	})
})
