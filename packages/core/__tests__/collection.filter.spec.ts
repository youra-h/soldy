/**
 * `filter` на реальном Select — регрессия по трём поломкам, которые ломала бы
 * проекция, если бы `batch.patch`/`value`/`tags` читали её вместо сырого
 * driver'а.
 *
 * Проверяется на уровне `driver.projection`, а не `collection.items`:
 * фасад-геттер `items` намеренно остался сырым — см. комментарий у
 * `TBatchCollectionFacade.items` (`batch.facade.ts`) о конфликте с
 * elevator-регистрацией опций в `Select.vue`. Показ отфильтрованных опций в
 * DOM — отдельная задача; здесь проверяется сам движковый механизм, которым
 * она будет пользоваться.
 *
 * Предикат по умолчанию (сравнение по `text`) ставит `TSelectExtension` —
 * сам `filter` его не знает, поэтому здесь же проверяется и фильтрация по
 * произвольному полю.
 */

import { describe, it, expect, vi } from 'vitest'
import { TSelect, TSelectItem, TSelectCollectionFacade } from '@soldy/core'
import type { ISelectItem } from '@soldy/core'

function createSelect(values: string[], props: Record<string, unknown> = {}) {
	const owner = new TSelect(props as any)
	const collection = new TSelectCollectionFacade({}, { owner })
	const items = values.map((value) => new TSelectItem({ value, text: value.toUpperCase() }))

	collection.items = items as ISelectItem[]
	collection.trackBy = (item) => item.value

	return { owner, collection, items: items as ISelectItem[] }
}

describe('filter — предикат по тексту ставит Select', () => {
	it('сужает driver.projection по подстроке без учёта регистра', () => {
		const { collection } = createSelect(['apple', 'banana', 'cherry'])

		collection.extensions.filter.query = 'an'

		expect(collection.driver.projection.map((item) => item.value)).toEqual(['banana'])
	})

	it('пустой запрос не сужает состав', () => {
		const { collection } = createSelect(['apple', 'banana'])

		expect(collection.extensions.filter.query).toBe('')
		expect(collection.driver.projection).toHaveLength(2)
	})
})

describe('главный тест: batch.patch видит полный состав при активном фильтре', () => {
	it('скрытые опции не теряются и не дублируются в storage', () => {
		const { collection, items } = createSelect(['apple', 'banana', 'cherry'])

		collection.extensions.filter.query = 'apple'
		expect(collection.driver.projection).toHaveLength(1)

		const before = [...collection.driver]

		collection.extensions.batch.patch(
			items.map((item) => ({ value: item.value, text: item.text })) as unknown as ISelectItem[],
		)

		const after = [...collection.driver]

		expect(after).toHaveLength(3)
		expect(after).toEqual(before) // те же ссылки, ничего не пересоздано
	})
})

describe('value не обнуляется, когда выбранная опция скрыта фильтром', () => {
	it('value.extension продолжает видеть выбранный элемент через сырой driver', () => {
		const { owner, collection } = createSelect(['apple', 'banana'])

		owner.value = 'apple'
		expect(owner.value).toBe('apple')

		collection.extensions.filter.query = 'banana'

		expect(collection.driver.projection.map((item) => item.value)).toEqual(['banana'])
		expect(owner.value).toBe('apple')
		expect(collection.selected.map((item) => item.value)).toEqual(['apple'])
	})
})

describe('смена фильтра не чистит выбор', () => {
	it('change:items не эмитится, поэтому selection.extension._selected не трогается', () => {
		const { owner, collection } = createSelect(['apple', 'banana'])

		owner.value = 'apple'

		const changeItems = vi.fn()

		collection.driver.events.on('change:items', changeItems)

		collection.extensions.filter.query = 'zzz-нет-совпадений'

		expect(changeItems).not.toHaveBeenCalled()
		expect(collection.selected.map((item) => item.value)).toEqual(['apple'])
	})
})

describe('снятие фильтра', () => {
	it('возвращает полный состав и прежний выбор', () => {
		const { owner, collection } = createSelect(['apple', 'banana', 'cherry'])

		owner.value = 'banana'
		collection.extensions.filter.query = 'apple'
		expect(collection.driver.projection).toHaveLength(1)

		collection.extensions.filter.query = ''

		expect(collection.driver.projection).toHaveLength(3)
		expect(owner.value).toBe('banana')
		expect(collection.selected.map((item) => item.value)).toEqual(['banana'])
	})
})

describe('теги при активном фильтре', () => {
	it('закрытие тега снимает выбор с опции по value, даже когда она скрыта проекцией', () => {
		const { collection, items } = createSelect(['apple', 'banana'])

		collection.mode = 'multiple'
		collection.extensions.selection.select(items[0])
		collection.extensions.selection.select(items[1])

		collection.extensions.filter.query = 'apple' // прячет banana из projection

		const engine = collection.tags_engine!
		const tag = [...engine.driver].find((item) => item.value === 'banana')!

		engine.extensions.tags.closeTag(tag)

		expect(collection.selected.map((item) => item.value)).toEqual(['apple'])
	})
})

describe('фильтр по произвольному полю', () => {
	it('предикат не зашит на text/value — можно сравнивать любое поле опции', () => {
		const { collection, items } = createSelect(['a', 'b', 'c'])

		;(items[0] as unknown as { category: string }).category = 'fruit'
		;(items[1] as unknown as { category: string }).category = 'veg'
		;(items[2] as unknown as { category: string }).category = 'fruit'

		collection.extensions.filter.predicate = (item, query) =>
			(item as unknown as { category: string }).category === query
		collection.extensions.filter.query = 'fruit'

		expect(collection.driver.projection.map((item) => item.value)).toEqual(['a', 'c'])
	})
})

describe('filter вместе с map-проектором', () => {
	it('состав сужен фильтром и текст подменён проектором одновременно', () => {
		const { collection } = createSelect(['apple', 'banana'])

		collection.driver.projectors.use((list, ctx) =>
			list.map((source) => {
				const proxy = new Proxy(source, {
					get: (target, prop, receiver) =>
						prop === 'text' ? `pre ${target.text}` : Reflect.get(target, prop, receiver),
				})

				ctx.link(proxy, source)

				return proxy
			}),
		)

		collection.extensions.filter.query = 'apple'

		expect(collection.driver.projection).toHaveLength(1)
		expect(collection.driver.projection[0].text).toBe('pre APPLE')
		// storage не тронут
		expect([...collection.driver].map((item) => item.text)).toEqual(['APPLE', 'BANANA'])
	})
})
