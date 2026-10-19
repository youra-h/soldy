import { describe, it, expect, vi } from 'vitest'
import {
	TBatchExtension,
	TCollectionEngine,
	TFilterExtension,
	TGroupExtension,
	TMemoryExtension,
	TMetaExtension,
	TPlainExtension,
} from '@soldy-ui/core'
import type { TCollectionEngineItemSource, TGroupSection, TQueryEvent } from '@soldy-ui/core'

/**
 * Группировка коллекции (`group`) — выборка, а не перестановка хранилища:
 * показанное (`batch.shown`) идёт по группам — в порядке `groups`,
 * незаявленные следом по первому элементу, без ключа в конце, — а состав
 * (`batch.items`) остаётся порядком данных. Секции — непрерывные куски
 * показанного с одной группой. Ключ элемента — `groupBy` или метка `_.group`
 * из данных.
 *
 * Здесь — голая коллекция, без компонента. Меню над ней — `menu.spec.ts`,
 * разметка — `ui/vue/__tests__/menu.spec.ts`.
 */

type Item = { id: string; kind?: string }

/** Источник элемента, как он приходит в данных: с меткой группы или без. */
function source(id: string, group?: unknown): TCollectionEngineItemSource<Item> {
	return group === undefined ? { id } : { id, _: { group } }
}

/** Голая коллекция с отметками, составом и группировкой — и, по просьбе, отбором до неё. */
function engineKit() {
	const engine = new TCollectionEngine<
		Item,
		{
			meta: TMetaExtension<Item>
			plain: TPlainExtension<Item>
			batch: TBatchExtension<Item>
			group: TGroupExtension<Item>
		}
	>({
		extensions: {
			meta: new TMetaExtension<Item>(),
			plain: new TPlainExtension<Item>(),
			batch: new TBatchExtension<Item>(),
			group: new TGroupExtension<Item>(),
		},
	})

	return { engine, driver: engine.getCore().driver, ...engine.extensions }
}

/** То же с отбором, который стоит до группировки. */
function filteredKit() {
	const engine = new TCollectionEngine<
		Item,
		{
			meta: TMetaExtension<Item>
			plain: TPlainExtension<Item>
			batch: TBatchExtension<Item>
			filter: TFilterExtension<Item>
			group: TGroupExtension<Item>
		}
	>({
		extensions: {
			meta: new TMetaExtension<Item>(),
			plain: new TPlainExtension<Item>(),
			batch: new TBatchExtension<Item>(),
			filter: new TFilterExtension<Item>(),
			group: new TGroupExtension<Item>(),
		},
	})

	return { engine, ...engine.extensions }
}

const ids = (list: ReadonlyArray<Item>): string[] => list.map((item) => item.id)

/** Секции коротко: ключ, подпись группы (`null` — без группы) и элементы. */
const brief = (sections: ReadonlyArray<TGroupSection<Item>>) =>
	sections.map(({ key, group, items }) => ({
		key,
		label: group === null ? null : (group.label ?? ''),
		items: ids(items),
	}))

/** Элемент состава по `id`: без него дальше проверять нечего. */
function itemOf(items: ReadonlyArray<Item>, id: string): Item {
	const found = items.find((candidate) => candidate.id === id)

	if (!found) throw new Error(`элемента "${id}" нет`)

	return found
}

const GROUPS = [
	{ key: 'edit', label: 'Правка' },
	{ key: 'view', label: 'Вид' },
]

describe('group · порядок показанного', () => {
	it('группы — в порядке groups, без ключа — в конце, внутри группы — порядок данных', () => {
		const { batch, group } = engineKit()

		batch.set([
			source('zoom-in', 'view'),
			source('cut', 'edit'),
			source('rename'),
			source('copy', 'edit'),
			source('zoom-out', 'view'),
			source('remove'),
		])
		group.groups = GROUPS

		expect(ids(batch.shown)).toEqual(['cut', 'copy', 'zoom-in', 'zoom-out', 'rename', 'remove'])
		// Состав — порядок данных: группировка его не трогает
		expect(ids(batch.items)).toEqual(['zoom-in', 'cut', 'rename', 'copy', 'zoom-out', 'remove'])
	})

	/** Пример владельца: стрелки ходят по показанному, и он идёт как экран. */
	it('cut, rename, copy в данных — показаны cut, copy, rename', () => {
		const { batch, group } = engineKit()

		group.groups = [{ key: 'edit', label: 'Правка' }]
		batch.set([source('cut', 'edit'), source('rename'), source('copy', 'edit')])

		expect(ids(batch.shown)).toEqual(['cut', 'copy', 'rename'])
		expect(brief(group.sections)).toEqual([
			{ key: 'group:edit', label: 'Правка', items: ['cut', 'copy'] },
			{ key: 'free', label: null, items: ['rename'] },
		])
	})

	it('ключ вне groups — следом за заявленными, по первому элементу, группой без подписи', () => {
		const { batch, group } = engineKit()

		group.groups = [{ key: 'edit', label: 'Правка' }]
		batch.set([source('a', 'x'), source('b', 'edit'), source('c', 'y'), source('d', 'x')])

		expect(ids(batch.shown)).toEqual(['b', 'a', 'd', 'c'])
		expect(group.sections.map((section) => section.group)).toEqual([
			{ key: 'edit', label: 'Правка' },
			{ key: 'x' },
			{ key: 'y' },
		])
	})

	it('без ключей — порядок как есть и одна секция без группы', () => {
		const { batch, group } = engineKit()

		group.groups = GROUPS
		batch.set([source('b'), source('a'), source('c')])

		expect(ids(batch.shown)).toEqual(['b', 'a', 'c'])
		expect(brief(group.sections)).toEqual([
			{ key: 'free', label: null, items: ['b', 'a', 'c'] },
		])
	})

	it('пустая коллекция — секций нет', () => {
		const { group } = engineKit()

		expect(group.sections).toEqual([])
	})

	it('метка не строка и не число — элемент без группы', () => {
		const { batch, group } = engineKit()

		batch.set([source('a', null), source('b', { key: 'x' }), source('c', true), source('d', 0)])

		expect(ids(batch.shown)).toEqual(['d', 'a', 'b', 'c'])
		expect(brief(group.sections)).toEqual([
			{ key: 'group:0', label: '', items: ['d'] },
			{ key: 'free', label: null, items: ['a', 'b', 'c'] },
		])
	})

	it('ключи сверяются строго: 1 и "1" — разные группы, ключи секций разные', () => {
		const { batch, group } = engineKit()

		batch.set([source('a', 1), source('b', '1'), source('c', 1)])

		expect(ids(batch.shown)).toEqual(['a', 'c', 'b'])
		expect(group.sections.map(({ key, group: of }) => [key, of?.key])).toEqual([
			['group:1', 1],
			['group:1~1', '1'],
		])
	})

	it('повтор ключа в groups — по первой записи', () => {
		const { group } = engineKit()

		group.groups = [
			{ key: 'edit', label: 'Правка' },
			{ key: 'view', label: 'Вид' },
			{ key: 'edit', label: 'Ещё правка' },
		]

		expect(group.groups).toEqual(GROUPS)
	})
})

describe('group · ключ элемента', () => {
	it('метка из patch перекладывает элемент в другую группу', () => {
		const { batch, group } = engineKit()

		batch.trackBy = (item) => item.id
		group.groups = GROUPS
		batch.set([source('a', 'view'), source('b', 'edit')])

		expect(ids(batch.shown)).toEqual(['b', 'a'])

		batch.patch([source('a', 'edit'), source('b', 'view')])

		expect(ids(batch.shown)).toEqual(['a', 'b'])
		expect(brief(group.sections).map(({ key }) => key)).toEqual(['group:edit', 'group:view'])
	})

	it('метка мимо записи (meta.apply) — смена показанного', () => {
		const { batch, group, meta } = engineKit()
		const shown = vi.fn()

		group.groups = GROUPS
		batch.set([source('a'), source('b', 'view')])
		batch.events.on('change:shown', shown)

		meta.apply(itemOf(batch.items, 'a'), { group: 'edit' })

		expect(ids(batch.shown)).toEqual(['a', 'b'])
		expect(shown).toHaveBeenCalled()
		expect(brief(group.sections).map(({ key }) => key)).toEqual(['group:edit', 'group:view'])
	})

	it('отметки без метки группы выборку не трогают', () => {
		const { batch, driver, meta } = engineKit()
		const invalidated = vi.fn()

		batch.set([source('a'), source('b')])
		driver.events.on('items:query:invalidated', invalidated)

		meta.apply(itemOf(batch.items, 'a'), { selected: true })

		expect(invalidated).not.toHaveBeenCalled()
	})

	it('groupBy — поверх метки; снят — снова метка', () => {
		const { batch, group } = engineKit()

		group.groups = GROUPS
		batch.set([
			{ id: 'a', kind: 'view', _: { group: 'edit' } },
			{ id: 'b', kind: 'edit', _: { group: 'view' } },
		])

		expect(ids(batch.shown)).toEqual(['a', 'b'])

		group.groupBy = (item) => item.kind

		expect(ids(batch.shown)).toEqual(['b', 'a'])
		expect(group.sections.map((section) => section.group?.key)).toEqual(['edit', 'view'])

		group.groupBy = undefined

		expect(ids(batch.shown)).toEqual(['a', 'b'])
	})

	it('change:groupBy — только на смену', () => {
		const { group } = engineKit()
		const handler = vi.fn()
		const by = (item: Item) => item.kind

		group.events.on('change:groupBy', handler)
		group.groupBy = by
		group.groupBy = by

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(by)
	})
})

describe('group · секции', () => {
	it('снимок — тот же массив, пока секции не сменились', () => {
		const { batch, group, plain } = engineKit()
		const sections = vi.fn()

		group.groups = GROUPS
		batch.set([source('a', 'edit'), source('b')])
		group.events.on('change:sections', sections)

		const before = group.sections

		// Запись, которая не меняет ни групп, ни состава секций
		plain.update(itemOf(batch.items, 'a'), { kind: 'x' })

		expect(group.sections).toBe(before)
		expect(sections).not.toHaveBeenCalled()
	})

	it('change:sections несёт снимок — на смену состава секции', () => {
		const { batch, group, plain } = engineKit()
		const sections = vi.fn()

		batch.set([source('a', 'edit')])
		group.events.on('change:sections', sections)

		plain.push(source('b', 'edit'))

		expect(sections).toHaveBeenCalledOnce()
		expect(sections).toHaveBeenCalledWith(group.sections)
		expect(brief(group.sections)).toEqual([{ key: 'group:edit', label: '', items: ['a', 'b'] }])
	})

	it('те же groups новым объектом — тишина; смена подписи — change:sections без новой выборки', () => {
		const { batch, driver, group } = engineKit()
		const groups = vi.fn()
		const sections = vi.fn()
		const invalidated = vi.fn()

		group.groups = GROUPS
		batch.set([source('a', 'edit'), source('b', 'view')])
		group.events.on('change:groups', groups)
		group.events.on('change:sections', sections)
		driver.events.on('items:query:invalidated', invalidated)

		group.groups = GROUPS.map((entry) => ({ ...entry }))

		expect(groups).not.toHaveBeenCalled()
		expect(sections).not.toHaveBeenCalled()

		group.groups = [
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'Вид' },
		]

		expect(groups).toHaveBeenCalledOnce()
		expect(sections).toHaveBeenCalledOnce()
		expect(brief(group.sections).map(({ label }) => label)).toEqual(['Edit', 'Вид'])
		// Порядок тот же — выборка прежняя
		expect(invalidated).not.toHaveBeenCalled()
	})

	it('смена порядка групп — новая выборка и новые секции', () => {
		const { batch, driver, group } = engineKit()
		const invalidated = vi.fn()

		group.groups = GROUPS
		batch.set([source('a', 'edit'), source('b', 'view')])
		driver.events.on('items:query:invalidated', invalidated)

		group.groups = [...GROUPS].reverse()

		expect(invalidated).toHaveBeenCalledOnce()
		expect(ids(batch.shown)).toEqual(['b', 'a'])
		expect(brief(group.sections).map(({ key }) => key)).toEqual(['group:view', 'group:edit'])
	})

	it('groups — копия: правка снаружи состояния не меняет; не заданы — групп нет', () => {
		const { group } = engineKit()
		const groups = [{ key: 'edit', label: 'Правка' }]

		group.groups = groups
		groups[0].label = 'Другое'
		group.groups.push({ key: 'x', label: 'X' })

		expect(group.groups).toEqual([{ key: 'edit', label: 'Правка' }])

		group.groups = undefined

		expect(group.groups).toEqual([])
	})

	it('отбор убрал всю группу — секции нет', () => {
		const { batch, filter, group } = filteredKit()

		group.groups = GROUPS
		batch.set([source('cut', 'edit'), source('zoom', 'view'), source('rename')])

		filter.predicate = (item) => item.id !== 'cut'

		expect(ids(batch.shown)).toEqual(['zoom', 'rename'])
		expect(brief(group.sections).map(({ key }) => key)).toEqual(['group:view', 'free'])
	})

	it('кусок группы, разорванный перестановкой после группировки, — свой ключ', () => {
		const { batch, driver, group } = engineKit()

		// Переставляет показанное после группировки: последний встаёт вторым
		driver.events.on('items:query:before', (e: TQueryEvent<Item>) => {
			const [first, ...rest] = e.items
			const last = rest.pop()

			e.items = first && last ? [first, last, ...rest] : e.items
		})

		batch.set([source('a', 'x'), source('b', 'x'), source('c')])

		expect(ids(batch.shown)).toEqual(['a', 'c', 'b'])
		expect(brief(group.sections).map(({ key }) => key)).toEqual([
			'group:x',
			'free',
			'group:x~1',
		])
	})
})

describe('group · память выборки', () => {
	/** Коллекция с памятью последней, как у строк таблицы. */
	function rememberingKit() {
		const kit = engineKit()

		kit.engine.use(new TMemoryExtension<Item>())

		return kit
	}

	it('смена groupBy видна с памятью', () => {
		const { batch, group } = rememberingKit()

		batch.set([
			{ id: 'a', kind: 'y' },
			{ id: 'b', kind: 'x' },
			{ id: 'c', kind: 'y' },
		])

		expect(ids(batch.shown)).toEqual(['a', 'b', 'c'])

		group.groupBy = (item) => item.kind

		expect(ids(batch.shown)).toEqual(['a', 'c', 'b'])
	})

	it('метка мимо записи видна с памятью', () => {
		const { batch, meta } = rememberingKit()

		batch.set([source('a'), source('b', 'edit')])

		expect(ids(batch.shown)).toEqual(['b', 'a'])

		meta.apply(itemOf(batch.items, 'a'), { group: 'edit' })

		expect(ids(batch.shown)).toEqual(['a', 'b'])
	})

	it('установка в наполненный движок — показанное по группам сразу', () => {
		const engine = new TCollectionEngine<
			Item,
			{
				meta: TMetaExtension<Item>
				plain: TPlainExtension<Item>
				batch: TBatchExtension<Item>
				memory: TMemoryExtension<Item>
			}
		>({
			extensions: {
				meta: new TMetaExtension<Item>(),
				plain: new TPlainExtension<Item>(),
				batch: new TBatchExtension<Item>(),
				memory: new TMemoryExtension<Item>(),
			},
		})
		const { batch } = engine.extensions
		const shown = vi.fn()

		batch.set([source('a'), source('b', 'edit')])

		// Выборка запомнена до группировки
		expect(ids(batch.shown)).toEqual(['a', 'b'])

		batch.events.on('change:shown', shown)

		const group = new TGroupExtension<Item>()

		engine.use(group)

		expect(shown).toHaveBeenCalled()
		expect(ids(batch.shown)).toEqual(['b', 'a'])
		expect(brief(group.sections).map(({ key }) => key)).toEqual(['group:edit', 'free'])
	})
})
