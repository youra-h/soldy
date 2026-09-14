import { describe, it, expect } from 'vitest'
import { TCollectionEngine, TBatchExtension, TFactoryExtension } from '@soldy/core'

interface ITestItem {
	id: number
	text: string
}

class TTestItem implements ITestItem {
	id: number
	text: string

	constructor(source: Partial<ITestItem> | [number, string]) {
		if (Array.isArray(source)) {
			;[this.id, this.text] = source
		} else {
			this.id = source.id ?? 0
			this.text = source.text ?? ''
		}
	}
}

function createCollection() {
	const factory = new TFactoryExtension<ITestItem>({ itemCtor: TTestItem })
	const batch = new TBatchExtension<ITestItem>()

	const col = new TCollectionEngine<
		ITestItem,
		{ factory: TFactoryExtension<ITestItem>; batch: TBatchExtension<ITestItem> }
	>({
		extensions: { factory, batch },
	})

	return { col, factory, batch }
}

describe('TFactoryExtension + TBatchExtension.update/trackBy', () => {
	it('update без trackBy: plain-объекты превращаются в инстансы', () => {
		const { col } = createCollection()

		col.extensions.batch.update([
			{ id: 1, text: 'a' },
			{ id: 2, text: 'b' },
		])

		expect(col.extensions.batch.items.length).toBe(2)
		expect([...col.extensions.batch.items].every((i) => i instanceof TTestItem)).toBe(true)
		expect([...col.extensions.batch.items].map((i) => i.id).sort()).toEqual([1, 2])
	})

	it('update + trackBy: plain-объекты превращаются в инстансы (patch)', () => {
		const { col } = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.update([
			{ id: 1, text: 'a' },
			{ id: 2, text: 'b' },
		])

		expect(col.extensions.batch.items.length).toBe(2)
		expect([...col.extensions.batch.items].every((i) => i instanceof TTestItem)).toBe(true)
		expect([...col.extensions.batch.items].map((i) => i.text).sort()).toEqual(['a', 'b'])
	})

	it('patch: неполный источник с meta `_` превращается в инстанс без приведения типов', () => {
		const { col } = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.patch([{ id: 1, _: { note: 'x' } }])

		expect(col.extensions.batch.items.length).toBe(1)
		expect(col.extensions.batch.items[0]).toBeInstanceOf(TTestItem)
		expect(col.extensions.batch.items[0].id).toBe(1)
	})

	it('update + trackBy: обновляет существующий инстанс и добавляет новый', () => {
		const { col } = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.update([
			{ id: 1, text: 'a' },
			{ id: 2, text: 'b' },
		])

		col.extensions.batch.update([
			{ id: 1, text: 'a-updated' },
			{ id: 3, text: 'c' },
		])

		const byId = new Map([...col.extensions.batch.items].map((i) => [i.id, i]))

		expect(byId.size).toBe(2)
		expect(byId.get(1)).toBeInstanceOf(TTestItem)
		expect(byId.get(1)!.text).toBe('a-updated')
		expect(byId.get(3)).toBeInstanceOf(TTestItem)
		expect(byId.get(3)!.text).toBe('c')
	})
})
