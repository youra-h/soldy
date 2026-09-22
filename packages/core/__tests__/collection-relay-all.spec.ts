import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TCollectionComponent,
	TBatchCollectionFacade,
} from '@soldy-ui/core'

type Item = { id: number; name: string }
type Extensions = { plain: TPlainExtension<Item>; batch: TBatchExtension<Item> }

class TestCollectionFacade extends TCollectionComponent<Item, Extensions> {}
class TestBatchFacade extends TBatchCollectionFacade<Item, Extensions> {}

function createEngine() {
	return new TCollectionEngine<Item, Extensions>({
		extensions: { plain: new TPlainExtension<Item>(), batch: new TBatchExtension<Item>() },
	})
}

/**
 * Сторож контракта «фасад = коллекция» (см. AGENTS.md, «Фасад отдаёт наружу
 * карту источника целиком»).
 *
 * До перехода на `relayAll` состав проброса был записан списком имён в теле
 * фасада, а карта его событий — вторым списком в типах. Тесты здесь держат оба
 * следствия: событие источника доезжает до фасада без упоминания в списке, и
 * одно событие приходит один раз, а не по числу источников, которые его несут.
 */
describe('relayAll — фасад отдаёт карту источника целиком', () => {
	it('доносит событие, которого не было ни в одном списке имён', () => {
		const engine = createEngine()
		const facade = new TestCollectionFacade({}, { engine })
		const invalidated = vi.fn()

		facade.events.on('items:query:invalidated', invalidated)

		engine.getCore().driver.invalidateQuery()

		// Прежний relay пробрасывал 12 имён из 14, и это было одно из двух
		// пропущенных: карта `plain` его обещала, а проброс не передавал.
		expect(invalidated).toHaveBeenCalledTimes(1)
	})

	it('change:items приходит на фасад один раз, хотя источников у него было два', () => {
		const engine = createEngine()
		const facade = new TestBatchFacade({}, { engine })
		const changeItems = vi.fn()

		facade.events.on('change:items', changeItems)

		facade.extensions.plain.insert({ id: 1, name: 'a' })

		// driver → plain → фасад. Второй путь (driver → batch → фасад) снят:
		// подписчиков у `batch.change:items` не было, а фасаду он давал дубль.
		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('пробрасывает аргументы события как есть', () => {
		const engine = createEngine()
		const facade = new TestBatchFacade({}, { engine })
		const item: Item = { id: 1, name: 'a' }
		const added = vi.fn()

		facade.events.on('item:added', added)

		facade.extensions.plain.insert(item)

		expect(added).toHaveBeenCalledTimes(1)
		expect(added.mock.calls[0][0]).toMatchObject({ item })
	})

	it('destroy снимает проброс', () => {
		const engine = createEngine()
		const facade = new TestBatchFacade({}, { engine })
		const added = vi.fn()

		facade.events.on('item:added', added)
		facade.events.destroy()

		facade.extensions.plain.insert({ id: 1, name: 'a' })

		expect(added).not.toHaveBeenCalled()
	})

	it('карта фасада закрыта — имени вне карт источников в ней нет', () => {
		const engine = createEngine()
		const facade = new TestCollectionFacade({}, { engine })

		// @ts-expect-error — события нет ни у драйвера, ни у движка
		facade.events.on('change:nothing', () => {})

		// Событие `batch` в карту базы не входит: расширение подключает
		// `TBatchCollectionFacade`, и карту расширяет он.
		// @ts-expect-error — `items:added` есть у batch, но не у базы
		facade.events.on('items:added', () => {})

		// А у наследника с расширением — входит.
		const batchFacade = new TestBatchFacade({}, { engine: createEngine() })
		expect(() => batchFacade.events.on('items:added', () => {})).not.toThrow()
	})
})
