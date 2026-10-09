import { describe, it, expect, vi } from 'vitest'
import { TSelect, TSelectCollectionFacade, TWindowStrategy } from '@soldy-ui/core'
import type { ISelectItem, TDrawnEntry } from '@soldy-ui/core'

/**
 * Select в окне: список панели рисует то, что отдаёт рисование коллекции
 * (`drawn`), — без окна все показанные опции, в окне — видимые и распорки на
 * месте пропущенных. Окно читает `batch.shown`, а не подменяет его: отбор
 * сужает показанные, и рисование берёт из них.
 *
 * Нарисованным опциям в окне — размер набора и место в нём (`aria-setsize`,
 * `aria-posinset`): общее с ListBox расширение `positionInSet`.
 *
 * Окно ставит обёртка `Virtual` (`setup/__tests__/virtual.spec.ts`), здесь —
 * руками; что рисует окно, — `collection.draw.spec.ts`.
 */

const STEP = 30

/** Select из `count` опций и его рисование. */
function select(count: number) {
	const owner = new TSelect()
	const facade = new TSelectCollectionFacade(
		{
			items: Array.from({ length: count }, (_, index) => ({
				value: `v${index + 1}`,
				text: `Пункт ${index + 1}`,
			})),
		},
		{ owner },
	)
	const { draw, filter, batch } = facade.engine.extensions

	return { owner, facade, draw, filter, items: batch.items }
}

/** Что нарисовано коротко: опции — текстом, распорки — `…высота`. */
const brief = (entries: ReadonlyArray<TDrawnEntry<ISelectItem>>): string[] =>
	entries.map((entry) =>
		entry.kind === 'item' ? entry.item.text : `…${entry.style['--s-filler-height']}`,
	)

/** Место опции в наборе: `размер/место` или `-`, если его нет. */
const position = (item: ISelectItem): string =>
	item.aria.has('aria-posinset')
		? `${item.aria.get('aria-setsize')}/${item.aria.get('aria-posinset')}`
		: '-'

/** Видимая полоса от `top` до `bottom` пикселей. */
const viewport = (top: number, bottom: number) => ({ top, bottom, step: STEP })

describe('что рисует список панели', () => {
	it('без окна — все показанные опции на своих местах', () => {
		const { facade, draw } = select(3)

		expect(draw.virtual).toBe(false)
		expect(brief(facade.drawn)).toEqual(['Пункт 1', 'Пункт 2', 'Пункт 3'])
		expect(facade.drawn.map((entry) => (entry.kind === 'item' ? entry.place : -1))).toEqual([
			0, 1, 2,
		])
	})

	it('под отбором — только отобранные, места — среди показанных', () => {
		const { facade, filter } = select(12)

		filter.query = 'Пункт 1'

		// «Пункт 1», «Пункт 10», «Пункт 11», «Пункт 12»
		expect(brief(facade.drawn)).toEqual(['Пункт 1', 'Пункт 10', 'Пункт 11', 'Пункт 12'])
		expect(facade.drawn.map((entry) => (entry.kind === 'item' ? entry.place : -1))).toEqual([
			0, 1, 2, 3,
		])
	})

	it('в окне до замера — первые 50, без распорок', () => {
		const { facade, draw } = select(200)

		draw.useStrategy(new TWindowStrategy())

		expect(facade.drawn).toHaveLength(50)
		expect(facade.drawn.every((entry) => entry.kind === 'item')).toBe(true)
	})

	it('в окне по замеру — видимые с запасом и распорки на месте пропущенных', () => {
		const { facade, draw } = select(200)

		draw.useStrategy(new TWindowStrategy())
		// Видны места 100–109: с запасом — 90–119
		draw.notifyViewport(viewport(3000, 3300))

		const entries = brief(facade.drawn)

		expect(entries[0]).toBe(`…${90 * STEP}px`)
		expect(entries[1]).toBe('Пункт 91')
		expect(entries.at(-2)).toBe('Пункт 120')
		expect(entries.at(-1)).toBe(`…${80 * STEP}px`)
		expect(entries).toHaveLength(32)
	})

	it('отбор в окне — окно из отобранных, а не из всего состава', () => {
		const { facade, draw, filter } = select(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		filter.query = 'Пункт 19'

		// «Пункт 19» и «Пункт 190»–«Пункт 199»: все в полосе, распорок нет
		expect(brief(facade.drawn)).toEqual([
			'Пункт 19',
			...Array.from({ length: 10 }, (_, index) => `Пункт ${190 + index}`),
		])
	})

	it('закреплённая вне окна — нарисована на своём месте между распорками', () => {
		const { facade, draw, items } = select(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		draw.pin('highlight', items[150])

		const entries = brief(facade.drawn)
		const at = entries.indexOf('Пункт 151')

		expect(entries[at - 1]).toBe(`…${(150 - 20) * STEP}px`)
		expect(entries[at + 1]).toBe(`…${(200 - 151) * STEP}px`)
	})

	it('смену того, что рисовать, фасад сообщает своим событием', () => {
		const { facade, draw } = select(200)
		const changed = vi.fn()

		facade.events.on('change:drawn', changed)
		draw.useStrategy(new TWindowStrategy())

		expect(changed).toHaveBeenCalledTimes(1)
		expect(changed).toHaveBeenLastCalledWith(facade.drawn)
	})
})

describe('место опции в наборе', () => {
	it('без окна — его нет ни у кого', () => {
		const { items } = select(3)

		expect(items.map(position)).toEqual(['-', '-', '-'])
	})

	it('в окне — нарисованным размер набора и место, с единицы; остальным — нет', () => {
		const { draw, items } = select(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(3000, 3300))

		expect(position(items[90])).toBe('200/91')
		expect(position(items[119])).toBe('200/120')
		expect(position(items[89])).toBe('-')
		expect(position(items[120])).toBe('-')
	})

	it('отбор в окне — размер набора и места среди отобранных', () => {
		const { draw, filter, items } = select(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		filter.query = 'Пункт 19'

		expect(position(items[18])).toBe('11/1')
		expect(position(items[189])).toBe('11/2')
		// Ушедшие из отобранных место теряют
		expect(position(items[0])).toBe('-')
	})

	it('окно сняли — места сняты у всех', () => {
		const { draw, items } = select(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		draw.useStrategy(null)

		expect(items.some((item) => item.aria.has('aria-posinset'))).toBe(false)
		expect(items.some((item) => item.aria.has('aria-setsize'))).toBe(false)
	})
})
