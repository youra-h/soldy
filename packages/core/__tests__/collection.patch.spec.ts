import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TBatchExtension,
	TPlainExtension,
	TOrderExtension,
} from '@soldy-ui/core'

type Item = { id: number; name: string }

function createCollection() {
	const col = new TCollectionEngine<
		Item,
		{
			batch: TBatchExtension<Item>
			plain: TPlainExtension<Item>
			order: TOrderExtension<Item>
		}
	>({
		extensions: {
			batch: new TBatchExtension<Item>(),
			plain: new TPlainExtension<Item>(),
			order: new TOrderExtension<Item>(),
		},
	})

	col.extensions.batch.trackBy = (item) => item.id

	return col
}

const seed = (): Item[] => [
	{ id: 1, name: 'alpha' },
	{ id: 2, name: 'beta' },
	{ id: 3, name: 'gamma' },
]

/** Сужает выборку до одного элемента — стенд-ин расширения `filter`. */
function hideAllButId(col: ReturnType<typeof createCollection>, id: number) {
	col.getCore().driver.events.on('items:query:before', (e) => {
		e.items = e.items.filter((item) => item.id === id)
	})
}

describe('TPatchCommand — базовое поведение', () => {
	it('обновляет совпавшие, добавляет новые, удаляет пропавшие', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		col.extensions.batch.patch([
			{ id: 2, name: 'beta-2' },
			{ id: 4, name: 'delta' },
		])

		expect([...col.extensions.batch.items]).toEqual([
			{ id: 2, name: 'beta-2' },
			{ id: 4, name: 'delta' },
		])
	})

	it('обновляет элемент на месте, не пересоздавая его', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const before = col.getCore().driver.valueOf()[1]

		col.extensions.batch.patch([{ id: 2, name: 'beta-2' }])

		expect(col.getCore().driver.valueOf()[0]).toBe(before)
		expect(before.name).toBe('beta-2')
	})

	it('шлёт один change:items на всю сверку', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const changeItems = vi.fn()

		col.getCore().driver.events.on('change:items', changeItems)
		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 4, name: 'delta' },
		])

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('вложенные уведомления доходят по каждому элементу', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const updated = vi.fn()
		const added = vi.fn()
		const removed = vi.fn()

		col.getCore().driver.events.on('item:updated', updated)
		col.getCore().driver.events.on('item:added', added)
		col.getCore().driver.events.on('item:removed', removed)

		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 4, name: 'delta' },
		])

		expect(updated).toHaveBeenCalledTimes(1)
		expect(added).toHaveBeenCalledTimes(1)
		expect(removed).toHaveBeenCalledTimes(2)
	})

	it('патч, который только обновляет элементы, не шлёт change:order', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const changeOrder = vi.fn()

		col.extensions.order.events.on('change:order', changeOrder)
		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 2, name: 'beta-2' },
			{ id: 3, name: 'gamma-2' },
		])

		expect(changeOrder).not.toHaveBeenCalled()
	})

	it('патч со вставкой и удалением шлёт change:order один раз', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const changeOrder = vi.fn()

		col.extensions.order.events.on('change:order', changeOrder)
		col.extensions.batch.patch([
			{ id: 2, name: 'beta-2' },
			{ id: 4, name: 'delta' },
		])

		expect(changeOrder).toHaveBeenCalledTimes(1)
	})

	it('удаление внутри патча отменяется через item:remove:before', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		col.getCore().driver.events.on('item:remove:before', (e) => {
			if (e.item.id === 3) e.preventDefault()
		})

		// без id 3 во входном наборе — patch попытается его удалить
		col.extensions.batch.patch([
			{ id: 1, name: 'alpha' },
			{ id: 2, name: 'beta' },
		])

		expect(
			col
				.getCore()
				.driver.valueOf()
				.map((i) => i.id)
				.sort(),
		).toEqual([1, 2, 3])
	})

	it('без trackBy бросает ошибку', () => {
		const col = createCollection()

		col.extensions.batch.trackBy = undefined
		col.extensions.batch.set(seed())

		expect(() => col.extensions.batch.patch([{ id: 1, name: 'x' }])).toThrow(
			'trackBy function is not set',
		)
	})
})

/**
 * Удержанный (`batch.hold`) — элемент, чей состав задаёт не вход сверки, а тот,
 * кто держит: элемент разметки держит регистратор коллекции, пока элемент в
 * разметке. Сверка по ключу его не снимает, явное удаление — снимает.
 */
describe('удержанные элементы', () => {
	type TCollection = ReturnType<typeof createCollection>

	/** Состав из данных и элемент, вошедший поштучно и удержанный, — как его держит регистратор. */
	function withHeld() {
		const col = createCollection()
		const { batch, plain } = col.extensions

		batch.set(seed())

		const held = plain.push({ id: 9, name: 'markup' })
		const release = batch.hold(held)

		return { col, batch, plain, held, release }
	}

	const ids = (col: TCollection) => col.extensions.batch.items.map((item) => item.id)

	it('удержанный переживает сверку — и с пустым входом, и записью items', () => {
		const { col, batch, held } = withHeld()

		batch.patch([{ id: 2, name: 'beta-2' }])

		expect(ids(col)).toEqual([2, 9])
		expect(batch.items[1]).toBe(held)

		batch.patch([])

		expect(batch.items).toEqual([held])

		batch.items = [{ id: 1, name: 'alpha' }]

		expect(ids(col)).toEqual([9, 1])
		expect(batch.items[0]).toBe(held)
	})

	it('совпавший по ключу обновлён на месте, без дубля', () => {
		const { col, batch, held } = withHeld()
		const removed = vi.fn()

		col.extensions.plain.events.on('item:removed', removed)
		batch.patch([{ id: 9, name: 'from-data' }])

		expect(batch.items).toEqual([held])
		expect(batch.items[0]).toBe(held)
		expect(held.name).toBe('from-data')
		// Сняты три элемента данных, удержанный — нет
		expect(removed).toHaveBeenCalledTimes(3)
	})

	const REMOVALS: ReadonlyArray<readonly [string, (setup: ReturnType<typeof withHeld>) => void]> =
		[
			['batch.remove', ({ batch, held }) => batch.remove([held])],
			['plain.remove', ({ plain, held }) => plain.remove(held)],
			['batch.clear', ({ batch }) => batch.clear()],
		]

	it.each(REMOVALS)(
		'%s удаляет удержанный, и вернувшийся без удержания снимает следующая сверка',
		(_name, remove) => {
			const setup = withHeld()
			const { batch, plain, held } = setup

			remove(setup)

			expect(batch.items).not.toContain(held)

			plain.push(held)
			batch.patch([{ id: 1, name: 'alpha' }])

			expect(batch.items).not.toContain(held)
		},
	)

	it('замена без trackBy — пересборка: удержанный снят', () => {
		const { batch, held } = withHeld()

		batch.trackBy = undefined
		batch.items = [{ id: 1, name: 'alpha' }]

		expect(batch.items).not.toContain(held)
	})

	it('отпущенный снимает следующая сверка', () => {
		const { batch, release } = withHeld()

		release()
		batch.patch([])

		expect(batch.items).toEqual([])
	})

	it('удержаний несколько — удержан, пока не отпущено последнее; повторное «отпустить» чужого не снимает', () => {
		const { batch, held, release } = withHeld()
		const second = batch.hold(held)

		release()
		release()
		batch.patch([])

		expect(batch.items).toEqual([held])

		second()
		batch.patch([])

		expect(batch.items).toEqual([])
	})

	it('«отпустить» после ухода из состава не снимает нового удержания вернувшегося', () => {
		const { batch, plain, held, release } = withHeld()

		plain.remove(held)
		plain.push(held)
		batch.hold(held)
		release()
		batch.patch([])

		expect(batch.items).toEqual([held])
	})

	it('hold вне состава ничего не держит', () => {
		const col = createCollection()
		const { batch, plain } = col.extensions
		const outside: Item = { id: 9, name: 'outside' }

		batch.set(seed())

		const release = batch.hold(outside)

		plain.push(outside)
		batch.patch([{ id: 1, name: 'alpha' }])

		expect(batch.items).not.toContain(outside)
		expect(() => release()).not.toThrow()
	})
})

describe('TPatchCommand при активной выборке — сверка идёт по storage', () => {
	it('полный набор при сужённой выборке ничего не теряет и не дублирует', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		// снаружи прилетает тот же набор, что уже лежит в хранилище
		col.extensions.batch.patch(seed())

		// в storage по-прежнему три элемента: ни удалений, ни дублей
		expect(col.getCore().driver.valueOf().length).toBe(3)
		expect(
			col
				.getCore()
				.driver.valueOf()
				.map((i) => i.id),
		).toEqual([1, 2, 3])
		// а видно наружу по-прежнему только один
		expect(col.extensions.batch.shown.map((i) => i.id)).toEqual([2])
	})

	it('скрытые элементы обновляются, а не вставляются заново', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		const hidden = col.getCore().driver.valueOf()[0]

		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 2, name: 'beta' },
			{ id: 3, name: 'gamma' },
		])

		expect(col.getCore().driver.valueOf().length).toBe(3)
		expect(col.getCore().driver.valueOf()[0]).toBe(hidden)
		expect(hidden.name).toBe('alpha-2')
	})

	it('новый элемент добавляется, даже когда выборка его не покажет', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		col.extensions.batch.patch([...seed(), { id: 4, name: 'delta' }])

		expect(col.getCore().driver.valueOf().length).toBe(4)
		expect(col.extensions.batch.shown.map((i) => i.id)).toEqual([2])
	})
})
