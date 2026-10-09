import { describe, it, expect } from 'vitest'
import { TListBox, TListBoxCollectionFacade, TWindowStrategy } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'

/**
 * ListBox в окне: в документе только видимые элементы, и посчитать набор
 * скринридер не может. Поэтому нарисованным элементам список пишет размер
 * набора и место в нём — `aria-setsize` и `aria-posinset`, с единицы (APG
 * Listbox). Ушедшие из окна и все без окна их теряют: без окна в документе
 * весь набор, и счёт браузера верен.
 *
 * Окно ставит обёртка `Virtual` (`setup/__tests__/virtual.spec.ts`), здесь —
 * руками; что рисует окно, — `collection.draw.spec.ts`.
 */

const STEP = 30

/** Список из `count` элементов и его рисование. */
function list(count: number) {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{
			items: Array.from({ length: count }, (_, index) => ({
				value: `v${index + 1}`,
				text: `Пункт ${index + 1}`,
			})),
		},
		{ owner },
	)
	const draw = facade.engine.extensions.draw
	const items = facade.engine.extensions.batch.items

	return { owner, facade, draw, items }
}

/** Место элемента в наборе: `размер/место` или `-`, если его нет. */
const position = (item: IListBoxItem): string =>
	item.aria.has('aria-posinset')
		? `${item.aria.get('aria-setsize')}/${item.aria.get('aria-posinset')}`
		: '-'

/** Видимая полоса от `top` до `bottom` пикселей. */
const viewport = (top: number, bottom: number) => ({ top, bottom, step: STEP })

describe('место в наборе', () => {
	it('без окна — его нет ни у кого', () => {
		const { items } = list(3)

		expect(items.map(position)).toEqual(['-', '-', '-'])
	})

	it('в окне — нарисованным размер набора и место, с единицы; остальным — нет', () => {
		const { draw, items } = list(200)

		draw.useStrategy(new TWindowStrategy())
		// Видны места 100–109: с запасом — 90–119
		draw.notifyViewport(viewport(3000, 3300))

		expect(position(items[90])).toBe('200/91')
		expect(position(items[119])).toBe('200/120')
		expect(position(items[89])).toBe('-')
		expect(position(items[120])).toBe('-')
	})

	it('окно на коротком списке рисует всех — место у всех', () => {
		const { draw, items } = list(3)

		draw.useStrategy(new TWindowStrategy())

		expect(items.map(position)).toEqual(['3/1', '3/2', '3/3'])
	})

	it('элемент ушёл из окна — место снято', () => {
		const { draw, items } = list(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(3000, 3300))
		draw.notifyViewport(viewport(0, 300))

		expect(position(items[100])).toBe('-')
		expect(position(items[0])).toBe('200/1')
	})

	it('окно сняли — места сняты у всех', () => {
		const { draw, items } = list(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		draw.useStrategy(null)

		expect(items.some((item) => item.aria.has('aria-posinset'))).toBe(false)
		expect(items.some((item) => item.aria.has('aria-setsize'))).toBe(false)
	})

	it('набор вырос за окном — размер у нарисованных новый', () => {
		const { facade, draw, items } = list(100)

		draw.useStrategy(new TWindowStrategy())
		// До замера окно — первые 50: что рисовать, не изменится
		facade.engine.extensions.plain.push({ value: 'new', text: 'Новый' })

		expect(position(items[0])).toBe('101/1')
	})

	it('закреплённый вне окна — со своим местом', () => {
		const { draw, items } = list(200)

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport(viewport(0, 300))
		draw.pin('highlight', items[150])

		expect(position(items[150])).toBe('200/151')
	})
})
