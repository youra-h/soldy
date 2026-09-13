import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TCollectionComponent,
} from '@soldy/core'

type Item = { id: number; name: string }
type Extensions = { plain: TPlainExtension<Item>; batch: TBatchExtension<Item> }

class TestCollectionFacade extends TCollectionComponent<Item, Extensions> {}

function createFacade() {
	const engine = new TCollectionEngine<Item, Extensions>({
		extensions: { plain: new TPlainExtension<Item>(), batch: new TBatchExtension<Item>() },
	})

	return new TestCollectionFacade({}, { engine })
}

/**
 * Сторож модели «объект события + before-хук» у remove/move/clear (см. AGENTS.md,
 * "Движок не знает о конкретных расширениях" — здесь проверяется симметричный
 * случай, что публичный relay фасада не теряет ни один из хуков).
 */
describe('TCollectionComponent — relay *:before хуков до фасада', () => {
	it('item:remove:before доходит до фасада и может отменить удаление', () => {
		const facade = createFacade()
		const item: Item = { id: 1, name: 'a' }

		facade.extensions.plain.insert(item)

		const before = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())

		facade.events.on('item:remove:before', before)

		facade.extensions.plain.remove(item)

		expect(before).toHaveBeenCalledTimes(1)
		expect(facade.engine.getCore().driver.valueOf()).toEqual([item])
	})

	it('item:move:before доходит до фасада и может подменить newIndex', () => {
		const facade = createFacade()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const c: Item = { id: 3, name: 'c' }

		facade.extensions.plain.insert(a, 0)
		facade.extensions.plain.insert(b, 1)
		facade.extensions.plain.insert(c, 2)

		facade.events.on('item:move:before', (e) => {
			e.newIndex = 2
		})

		facade.extensions.plain.move(a, 1)

		expect(facade.engine.getCore().driver.valueOf()).toEqual([b, c, a])
	})

	it('items:clear:before доходит до фасада и может отменить очистку', () => {
		const facade = createFacade()

		facade.extensions.plain.insert({ id: 1, name: 'a' })
		facade.extensions.batch.trackBy = (item) => item.id

		const before = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())

		facade.events.on('items:clear:before', before)

		facade.extensions.batch.clear()

		expect(before).toHaveBeenCalledTimes(1)
		expect(facade.engine.getCore().driver.valueOf().length).toBe(1)
	})

	it('item:update:before (пропущенный ранее relay) доходит до фасада', () => {
		const facade = createFacade()
		const item: Item = { id: 1, name: 'a' }

		facade.extensions.plain.insert(item)

		const before = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())

		facade.events.on('item:update:before', before)

		facade.extensions.plain.update(item, { name: 'b' })

		expect(before).toHaveBeenCalledTimes(1)
		expect(item.name).toBe('a')
	})
})
