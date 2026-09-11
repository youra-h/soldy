/**
 * Подмена представления через проектор — второй уровень контракта слоя
 * (первый — состав/порядок, у `filter`). Proxy меняет то, что нужно (`text`),
 * оставляя всё остальное поведение оригинала на месте: `uid`, `dataset` и
 * прочие геттеры доезжают через `Reflect.get`, а storage не знает о подмене.
 */

import { describe, it, expect } from 'vitest'
import { TCollectionEngine, TBatchExtension, TSelectionExtension, TSelectItem } from '@soldy/core'
import type { IProjectionContext, ISelectItem } from '@soldy/core'

function createCollection() {
	const batch = new TBatchExtension<ISelectItem>()
	const selection = new TSelectionExtension<ISelectItem>()

	return new TCollectionEngine<
		ISelectItem,
		{ batch: TBatchExtension<ISelectItem>; selection: TSelectionExtension<ISelectItem> }
	>({ extensions: { batch, selection } })
}

/** Проектор с префиксом — подменяет только `text`, остальное форвардит. */
function prefixProjector(
	items: readonly ISelectItem[],
	ctx: IProjectionContext<ISelectItem>,
): readonly ISelectItem[] {
	return items.map((source) => {
		const proxy = new Proxy(source, {
			get: (target, prop, receiver) =>
				prop === 'text' ? `pre ${target.text}` : Reflect.get(target, prop, receiver),
		})

		ctx.link(proxy, source)

		return proxy as unknown as ISelectItem
	})
}

describe('Proxy-проектор подменяет представление', () => {
	it('projection[0].text содержит префикс, driver[0].text — сырой (storage чистый)', () => {
		const col = createCollection()
		const item: ISelectItem = new TSelectItem({ value: 'a', text: 'A' })

		col.extensions.batch.set([item])
		col.driver.projectors.use(prefixProjector)

		expect(col.driver.projection[0].text).toBe('pre A')
		expect(col.driver[0].text).toBe('A')
		expect(col.driver.valueOf()[0].text).toBe('A')
	})

	it('uid доезжает через обёртку как есть', () => {
		const col = createCollection()
		const item: ISelectItem = new TSelectItem({ value: 'a', text: 'A' })

		col.extensions.batch.set([item])
		col.driver.projectors.use(prefixProjector)

		expect(col.driver.projection[0].uid).toBe(item.uid)
	})

	it('dataset доезжает через обёртку: data-selected ставится настоящему элементу и виден через проекцию', () => {
		const col = createCollection()
		const item: ISelectItem = new TSelectItem({ value: 'a', text: 'A' })

		col.extensions.batch.set([item])
		col.driver.projectors.use(prefixProjector)

		col.extensions.selection.select(item)

		// TSelectionExtension зеркалит выбор в data-selected всем элементам storage
		expect(item.dataset.get('selected')).toBe('true')
		expect(col.driver.projection[0].dataset.get('selected')).toBe('true')
	})
})
