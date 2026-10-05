import { describe, it, expect, vi } from 'vitest'
import {
	TBatchExtension,
	TCollectionEngine,
	TMemoryExtension,
	TPlainExtension,
} from '@soldy-ui/core'
import type { TQueryEvent } from '@soldy-ui/core'

/**
 * Память выборки — стратегия чтения драйвера: `batch.shown` исполняет
 * выборку один раз и отдаёт тот же массив, пока драйвер не сообщит, что она
 * устарела, — запись изменила хранилище или выборку объявили
 * недействительной (`invalidateQuery()`). Без памяти выборка исполняется на
 * каждое чтение, как прежде.
 *
 * Подписчик выборки здесь — стенд-ин фильтра: прячет элементы по имени и
 * считает свои вызовы. Каждый вызов — одна выборка.
 */

type Item = { id: number; name: string }

const items = (): Item[] => [
	{ id: 1, name: 'alpha' },
	{ id: 2, name: 'beta' },
	{ id: 3, name: 'gamma' },
]

const ids = (list: ReadonlyArray<Item>): number[] => list.map((item) => item.id)

/** Движок из трёх элементов с подписчиком выборки и, если не сказано иначе, памятью. */
function collection({ memory = true } = {}) {
	const engine = new TCollectionEngine<
		Item,
		{ plain: TPlainExtension<Item>; batch: TBatchExtension<Item> }
	>({
		extensions: { plain: new TPlainExtension<Item>(), batch: new TBatchExtension<Item>() },
	})
	const { driver } = engine.getCore()
	const hidden = new Set<string>(['hidden'])
	const queries = vi.fn((e: TQueryEvent<Item>) => {
		e.items = e.items.filter((item) => !hidden.has(item.name))
	})

	driver.events.on('items:query:before', queries)
	engine.extensions.batch.set(items())

	// Последней — после подписчика выборки, как в коллекции строк таблицы
	if (memory) engine.use(new TMemoryExtension<Item>())

	return { engine, driver, hidden, queries, ...engine.extensions }
}

type TCollection = ReturnType<typeof collection>

describe('память выборки', () => {
	it('повторное чтение shown и length — одна выборка, тот же массив', () => {
		const { batch, queries } = collection()
		const shown = batch.shown

		expect(ids(shown)).toEqual([1, 2, 3])
		expect(batch.shown).toBe(shown)
		expect(batch.length).toBe(3)
		expect(queries).toHaveBeenCalledOnce()
	})

	it('без памяти — выборка на каждое чтение, как прежде', () => {
		const { batch, queries } = collection({ memory: false })

		expect(batch.shown).not.toBe(batch.shown)
		expect(batch.length).toBe(3)
		expect(queries).toHaveBeenCalledTimes(3)
	})

	const WRITES: [string, (collection: TCollection) => void, number[]][] = [
		['insert', ({ plain }) => plain.insert({ id: 4, name: 'delta' }, 1), [1, 4, 2, 3]],
		['remove', ({ plain, batch }) => plain.remove(batch.items[0]), [2, 3]],
		['move', ({ plain, batch }) => plain.move(batch.items[0], 2), [2, 3, 1]],
		['update', ({ plain, batch }) => plain.update(batch.items[1], { name: 'hidden' }), [1, 3]],
		[
			'patch',
			({ batch }) => {
				batch.trackBy = (item) => item.id
				batch.patch([
					{ id: 3, name: 'gamma' },
					{ id: 1, name: 'alpha' },
					{ id: 5, name: 'epsilon' },
				])
			},
			[1, 3, 5],
		],
		['clear', ({ batch }) => batch.clear(), []],
		[
			'invalidateQuery',
			({ driver, hidden }) => {
				hidden.add('beta')
				driver.invalidateQuery()
			},
			[1, 3],
		],
	]

	it.each(WRITES)('%s — выборка заново, одна на следующие чтения', (_, write, expected) => {
		const target = collection()
		const before = target.batch.shown

		write(target)

		const after = target.batch.shown

		expect(after).not.toBe(before)
		expect(ids(after)).toEqual(expected)
		expect(target.batch.shown).toBe(after)
		expect(target.queries).toHaveBeenCalledTimes(2)
	})

	const CANCELLED: [string, (collection: TCollection) => void][] = [
		[
			'insert',
			({ plain }) => {
				plain.events.on('item:add:before', (e) => e.preventDefault())
				plain.push({ id: 4, name: 'delta' })
			},
		],
		[
			'remove',
			({ plain, batch }) => {
				plain.events.on('item:remove:before', (e) => e.preventDefault())
				plain.remove(batch.items[0])
			},
		],
		[
			'move',
			({ plain, batch }) => {
				plain.events.on('item:move:before', (e) => e.preventDefault())
				plain.move(batch.items[0], 2)
			},
		],
		[
			'update',
			({ plain, batch }) => {
				plain.events.on('item:update:before', (e) => e.preventDefault())
				plain.update(batch.items[1], { name: 'hidden' })
			},
		],
		[
			'clear',
			({ plain, batch }) => {
				plain.events.on('items:clear:before', (e) => e.preventDefault())
				batch.clear()
			},
		],
		['перемещение на своё место', ({ plain, batch }) => plain.move(batch.items[1], 1)],
		['удаление элемента не из коллекции', ({ plain }) => plain.remove({ id: 9, name: 'z' })],
	]

	it.each(CANCELLED)('отменённая запись (%s) хранилище не меняла — память та же', (_, write) => {
		const target = collection()
		const before = target.batch.shown

		write(target)

		expect(target.batch.shown).toBe(before)
		expect(target.queries).toHaveBeenCalledOnce()
	})

	it('подписчик item:added читает уже новый состав', () => {
		const { batch, plain } = collection()
		const seen: number[][] = []

		void batch.shown
		plain.events.on('item:added', () => seen.push(ids(batch.shown)))
		plain.push({ id: 4, name: 'delta' })

		expect(seen).toEqual([[1, 2, 3, 4]])
	})

	it('внутри engine.batch() чтение видит каждую запись, отложенные уведомления — итог', () => {
		const { engine, batch, plain } = collection()
		const inside: number[][] = []
		const notified: number[][] = []

		void batch.shown
		plain.events.on('item:added', () => notified.push(ids(batch.shown)))

		engine.batch(() => {
			plain.push({ id: 4, name: 'delta' })
			inside.push(ids(batch.shown))
			plain.push({ id: 5, name: 'epsilon' })
			inside.push(ids(batch.shown))
		})

		expect(inside).toEqual([
			[1, 2, 3, 4],
			[1, 2, 3, 4, 5],
		])
		expect(notified).toEqual([
			[1, 2, 3, 4, 5],
			[1, 2, 3, 4, 5],
		])
	})

	it('invalidateQuery: память сброшена до items:query:invalidated — его подписчик читает новую выборку', () => {
		const { batch, driver, hidden } = collection()
		const seen: number[][] = []

		void batch.shown
		driver.events.on('items:query:invalidated', () => seen.push(ids(batch.shown)))
		batch.events.on('change:shown', () => seen.push(ids(batch.shown)))

		hidden.add('alpha')
		driver.invalidateQuery()

		expect(seen).toEqual([
			[2, 3],
			[2, 3],
		])
	})

	it('чтение из хука шага patch — хранилище как есть, мимо памяти', () => {
		const { batch, plain, queries } = collection()
		const seen: number[][] = []

		batch.trackBy = (item) => item.id
		void batch.shown
		plain.events.on('item:add:before', () => seen.push(ids(batch.shown)))

		batch.patch([...items(), { id: 4, name: 'delta' }, { id: 5, name: 'epsilon' }])

		// Хук второго нового элемента видит первый уже в хранилище
		expect(seen).toEqual([
			[1, 2, 3],
			[1, 2, 3, 4],
		])

		// Середина команды в память не попала: после неё — одна новая выборка
		queries.mockClear()

		expect(ids(batch.shown)).toEqual([1, 2, 3, 4, 5])
		expect(ids(batch.shown)).toEqual([1, 2, 3, 4, 5])
		expect(queries).toHaveBeenCalledOnce()
	})

	it('предел: правку элемента на месте, мимо команд, выборка не видит до сброса', () => {
		const { batch, driver } = collection()
		const [, beta] = batch.items

		expect(ids(batch.shown)).toEqual([1, 2, 3])

		beta.name = 'hidden'

		expect(ids(batch.shown)).toEqual([1, 2, 3])

		driver.invalidateQuery()

		expect(ids(batch.shown)).toEqual([1, 3])
	})

	it('поставленная в наполненный движок — первое чтение исполняет выборку', () => {
		const { engine, batch, queries } = collection({ memory: false })

		void batch.shown
		engine.use(new TMemoryExtension<Item>())
		queries.mockClear()

		const shown = batch.shown

		expect(ids(shown)).toEqual([1, 2, 3])
		expect(batch.shown).toBe(shown)
		expect(queries).toHaveBeenCalledOnce()
	})
})

describe('стратегия чтения драйвера', () => {
	it('о записи — сразу после применения, до уведомлений; об invalidateQuery — до items:query:invalidated', () => {
		const { driver, plain } = collection({ memory: false })
		const log: string[] = []

		driver.useQueryStrategy({
			read: (run) => {
				log.push('read')

				return run()
			},
			stale: () => log.push('stale'),
		})
		plain.events.on('item:added', () => log.push('item:added'))
		plain.events.on('change:items', () => log.push('change:items'))
		driver.events.on('items:query:invalidated', () => log.push('items:query:invalidated'))

		plain.push({ id: 4, name: 'delta' })
		driver.invalidateQuery()

		expect(log).toEqual([
			'stale',
			'item:added',
			'change:items',
			'stale',
			'items:query:invalidated',
		])
	})

	it('исполнение чтения стратегия получает функцией — её результат и есть выборка', () => {
		const { driver, batch } = collection({ memory: false })
		const read = vi.fn((run: () => readonly Item[]) => run().slice(1))

		driver.useQueryStrategy({ read, stale: () => {} })

		expect(ids(batch.shown)).toEqual([2, 3])
		expect(read).toHaveBeenCalledOnce()
	})
})
