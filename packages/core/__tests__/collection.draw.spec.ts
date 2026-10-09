import { describe, it, expect, vi } from 'vitest'
import {
	TBatchExtension,
	TCollectionEngine,
	TDrawExtension,
	TListBoxCollectionFacade,
	TPlainExtension,
	TWindowStrategy,
	createEngineSelection,
} from '@soldy-ui/core'
import type { TDrawnEntry, TQueryEvent } from '@soldy-ui/core'

/**
 * Рисование коллекции (`draw`) — что коллекция рисует из показанных
 * элементов. Без окна — все показанные, каждый на своём месте; окно
 * (`TWindowStrategy`) ставит тот, кто его включает, и коллекция рисует только
 * видимые элементы, а на месте остальных — распорки. Окно читает
 * `batch.shown`, а не подменяет его.
 *
 * Здесь — голая коллекция, без компонента: состав, выборка и рисование.
 * Своё у компонентов — номера строк таблицы и место элемента ListBox — в
 * `table-virtual.spec.ts` и `list-box-virtual.spec.ts`.
 */

type Item = { uid: number; name: string }

const STEP = 20

let next = 1

const items = (count: number): Item[] =>
	Array.from({ length: count }, (_, index) => ({ uid: next++, name: `item ${index + 1}` }))

/** Голая коллекция из `count` элементов с рисованием и подписчиком выборки. */
function collection(count: number) {
	const engine = new TCollectionEngine<
		Item,
		{ plain: TPlainExtension<Item>; batch: TBatchExtension<Item>; draw: TDrawExtension<Item> }
	>({
		extensions: {
			plain: new TPlainExtension<Item>(),
			batch: new TBatchExtension<Item>(),
			draw: new TDrawExtension<Item>(),
		},
	})
	const { driver } = engine.getCore()
	const hidden = new Set<string>()

	driver.events.on('items:query:before', (e: TQueryEvent<Item>) => {
		e.items = e.items.filter((item) => !hidden.has(item.name))
	})

	engine.extensions.batch.set(items(count))

	return { engine, driver, hidden, ...engine.extensions }
}

/** Что нарисовано коротко: элементы — `имя@место`, распорки — `ключ:высота`. */
function drawn(entries: ReadonlyArray<TDrawnEntry<Item>>): string[] {
	return entries.map((entry) =>
		entry.kind === 'item'
			? `${entry.item.name}@${entry.place}`
			: `${entry.key}:${entry.style['--s-filler-height']}`,
	)
}

/** Имена нарисованных элементов. */
function names(entries: ReadonlyArray<TDrawnEntry<Item>>): string[] {
	return entries.flatMap((entry) => (entry.kind === 'item' ? [entry.item.name] : []))
}

/** Видимая полоса от `top` до `bottom` пикселей. */
const viewport = (top: number, bottom: number, step = STEP) => ({ top, bottom, step })

describe('без окна', () => {
	it('рисуются все показанные, каждый на своём месте, ключ — uid', () => {
		const { draw, batch } = collection(3)

		expect(draw.virtual).toBe(false)
		expect(drawn(draw.drawn)).toEqual(['item 1@0', 'item 2@1', 'item 3@2'])
		expect(draw.drawn.map((entry) => entry.key)).toEqual(batch.items.map((item) => item.uid))
	})

	it('отбор — рисуются только показанные, места — среди показанных', () => {
		const { draw, driver, hidden } = collection(3)

		hidden.add('item 2')
		driver.invalidateQuery()

		expect(drawn(draw.drawn)).toEqual(['item 1@0', 'item 3@1'])
	})

	it('закрепление и замер ничего не меняют и событий не шлют', () => {
		const { draw, batch } = collection(3)
		const changed = vi.fn()

		draw.events.on('change:drawn', changed)
		draw.pin('focus', batch.items[2])
		draw.notifyViewport(viewport(0, 20))

		expect(drawn(draw.drawn)).toEqual(['item 1@0', 'item 2@1', 'item 3@2'])
		expect(changed).not.toHaveBeenCalled()
	})
})

describe('окно', () => {
	it('до замера — первые 50, без распорок', () => {
		const { draw } = collection(80)

		draw.useStrategy(new TWindowStrategy())

		expect(draw.virtual).toBe(true)
		expect(draw.drawn).toHaveLength(50)
		expect(drawn(draw.drawn).at(-1)).toBe('item 50@49')
	})

	it('по замеру — видимые с запасом в 10, распорки высотой в пропущенные', () => {
		const { draw, batch } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		// Видны места 40–49: с запасом — 30–59
		draw.notifyViewport(viewport(800, 1000))

		const entries = drawn(draw.drawn)

		// Ключ распорки — от элемента за ней, с минусом; у хвостовой — 0
		expect(entries[0]).toBe(`${-batch.items[30].uid}:600px`)
		expect(entries.slice(1, -1)).toEqual(
			Array.from({ length: 30 }, (_, index) => `item ${31 + index}@${30 + index}`),
		)
		expect(entries.at(-1)).toBe('0:800px')
	})

	it('распорке — место в составе: индекс элемента за ней, у хвостовой — число элементов', () => {
		const { draw, driver, hidden } = collection(100)

		// Отбор спрятал первые десять: места среди показанных и в составе разошлись
		for (let index = 1; index <= 10; index++) hidden.add(`item ${index}`)
		driver.invalidateQuery()
		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(800, 1000))

		const orders = draw.drawn.flatMap((entry) =>
			entry.kind === 'filler' ? [entry.style.order] : [],
		)

		// Перед местом 30 среди показанных — 41-й элемент состава (индекс 40)
		expect(orders).toEqual(['40', '100'])
	})

	it('полоса за краем списка — окно рисует ближайший элемент, а не одни распорки', () => {
		const { draw } = collection(100)

		draw.useStrategy(new TWindowStrategy())

		// Список выше полосы: прокрутили за его конец
		draw.notifyViewport(viewport(5000, 5200))
		expect(names(draw.drawn)).toEqual(['item 100'])

		// Список ниже полосы: до него ещё не докрутили
		draw.notifyViewport(viewport(-1000, -800))
		expect(names(draw.drawn)).toEqual(['item 1'])
	})

	it('закреплённый вне полосы — на своём месте между распорками', () => {
		const { draw, batch } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))
		draw.pin('focus', batch.items[80])

		expect(drawn(draw.drawn).slice(-3)).toEqual([
			`${-batch.items[80].uid}:1200px`,
			'item 81@80',
			'0:380px',
		])
	})

	it('закрепление по причине: снимает только своя', () => {
		const { draw, batch } = collection(100)
		const far = batch.items[80]

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))
		draw.pin('focus', far)
		draw.pin('highlight', far)
		draw.pin('focus', undefined)

		expect(names(draw.drawn)).toContain(far.name)

		draw.pin('highlight', undefined)

		expect(names(draw.drawn)).not.toContain(far.name)
	})

	it('закреплённый, которого отбор спрятал, не рисуется', () => {
		const { draw, batch, driver, hidden } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))
		draw.pin('focus', batch.items[80])
		hidden.add('item 81')
		driver.invalidateQuery()

		expect(names(draw.drawn)).not.toContain('item 81')
	})

	it('показанные сменились — окно по новым, места сдвинулись', () => {
		const { draw, plain } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))
		plain.insert({ uid: next++, name: 'first' }, 0)

		expect(drawn(draw.drawn).slice(0, 2)).toEqual(['first@0', 'item 1@1'])
	})

	it('окно читает показанные, а не подменяет их', () => {
		const { draw, batch } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))

		expect(batch.shown).toHaveLength(100)
	})

	it('нулевой шаг — не замер: окно прежнее', () => {
		const { draw } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(800, 1000))

		const before = draw.drawn

		draw.notifyViewport(viewport(0, 200, 0))

		expect(draw.drawn).toBe(before)
	})

	it('окно сняли — снова все показанные', () => {
		const { draw } = collection(100)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 200))
		draw.useStrategy(null)

		expect(draw.virtual).toBe(false)
		expect(draw.drawn).toHaveLength(100)
	})
})

describe('события — только на смену', () => {
	it('change:virtual — на постановку и снятие окна, не на повтор', () => {
		const { draw } = collection(3)
		const strategy = new TWindowStrategy()
		const changed = vi.fn()

		draw.events.on('change:virtual', changed)
		draw.useStrategy(strategy)
		draw.useStrategy(strategy)
		draw.useStrategy(null)
		draw.useStrategy(null)

		expect(changed.mock.calls).toEqual([[true], [false]])
	})

	it('change:drawn — не шлётся, когда окно рисует то же самое', () => {
		const { draw } = collection(100)
		const changed = vi.fn()

		draw.useStrategy(new TWindowStrategy())
		draw.events.on('change:drawn', changed)
		draw.notifyViewport(viewport(800, 1000))
		// Края полосы остались в тех же элементах — окно то же
		draw.notifyViewport(viewport(805, 995))

		expect(changed).toHaveBeenCalledOnce()
	})

	it('окно на коротком списке рисует то же, что без окна: change:drawn нет, change:virtual есть', () => {
		const { draw } = collection(3)
		const drawnChanged = vi.fn()
		const virtualChanged = vi.fn()

		draw.events.on('change:drawn', drawnChanged)
		draw.events.on('change:virtual', virtualChanged)
		draw.useStrategy(new TWindowStrategy())

		expect(drawnChanged).not.toHaveBeenCalled()
		expect(virtualChanged).toHaveBeenCalledWith(true)
	})
})

it('движок снаружи любого уровня — фасад достраивает рисование', () => {
	const engine = createEngineSelection({ items: [{ text: 'Один' }, { text: 'Два' }] })
	const facade = new TListBoxCollectionFacade({}, { engine })

	expect(facade.engine.extensions.draw.virtual).toBe(false)
	expect(facade.drawn).toHaveLength(2)
})
