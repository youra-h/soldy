import { describe, it, expect } from 'vitest'
import { TCollection, TBatchExtension, TFactoryExtension } from '@soldy/core'

interface ITestItem {
	id: number
	text: string
}

class TTestItem implements ITestItem {
	id: number
	text: string

	constructor(source: any) {
		if (Array.isArray(source)) {
			;[this.id, this.text] = source
		} else {
			this.id = source.id
			this.text = source.text
		}
	}
}

function createCollection() {
	const factory = new TFactoryExtension<ITestItem>(TTestItem)
	const batch = new TBatchExtension<ITestItem>()

	const col = new TCollection<
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

		expect(col.engine.length).toBe(2)
		expect([...col.engine].every((i) => i instanceof TTestItem)).toBe(true)
		expect([...col.engine].map((i) => i.id).sort()).toEqual([1, 2])
	})

	it('update + trackBy: plain-объекты превращаются в инстансы (patch)', () => {
		const { col } = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.update([
			{ id: 1, text: 'a' },
			{ id: 2, text: 'b' },
		])

		expect(col.engine.length).toBe(2)
		expect([...col.engine].every((i) => i instanceof TTestItem)).toBe(true)
		expect([...col.engine].map((i) => i.text).sort()).toEqual(['a', 'b'])
	})

	it('update + trackBy: двумерный массив превращается в массив инстансов', () => {
		const { col } = createCollection()
		col.extensions.batch.trackBy = (item) =>
			item instanceof TTestItem ? item.id : item[0]

		col.extensions.batch.update([
			[1, 'a'],
			[2, 'b'],
		] as unknown as ITestItem[])

		expect(col.engine.length).toBe(2)
		expect([...col.engine].every((i) => i instanceof TTestItem)).toBe(true)
		expect([...col.engine].map((i) => i.id).sort()).toEqual([1, 2])
		expect([...col.engine].map((i) => i.text).sort()).toEqual(['a', 'b'])
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

		const byId = new Map([...col.engine].map((i) => [i.id, i]))

		expect(byId.size).toBe(2)
		expect(byId.get(1)).toBeInstanceOf(TTestItem)
		expect(byId.get(1)!.text).toBe('a-updated')
		expect(byId.get(3)).toBeInstanceOf(TTestItem)
		expect(byId.get(3)!.text).toBe('c')
	})
})
