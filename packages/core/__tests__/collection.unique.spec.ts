import { describe, it, expect } from 'vitest'
import { TCollectionEngine, TPlainExtension, TBatchExtension, TUniqueExtension } from '@soldy/core'

type Item = { uid: number; name: string }

/** Простой объект без `uid` — расширение его не отслеживает. */
type Plain = { name: string }

/** `uid` есть, но не числовой — тоже не отслеживается. */
type StringUid = { uid: string; name: string }

function createEngine<TItem extends object>() {
	return new TCollectionEngine<
		TItem,
		{
			plain: TPlainExtension<TItem>
			batch: TBatchExtension<TItem>
			unique: TUniqueExtension<TItem>
		}
	>({
		extensions: {
			plain: new TPlainExtension<TItem>(),
			batch: new TBatchExtension<TItem>(),
			unique: new TUniqueExtension<TItem>(),
		},
	})
}

describe('TUniqueExtension', () => {
	describe('вставка', () => {
		it('отменяет вставку другого элемента с тем же uid', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const twin: Item = { uid: 1, name: 'twin' }

			engine.extensions.plain.insert(a)
			engine.extensions.plain.insert(twin)

			expect(engine.extensions.batch.items).toHaveLength(1)
			expect(engine.extensions.batch.items[0]).toBe(a)
		})

		it('отменяет повторную вставку того же элемента', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }

			engine.extensions.plain.insert(a)
			engine.extensions.plain.insert(a)

			expect(engine.extensions.batch.items).toHaveLength(1)
		})

		it('has и exists — true для вставленного элемента', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }

			expect(engine.extensions.unique.has(a)).toBe(false)

			engine.extensions.plain.insert(a)

			expect(engine.extensions.unique.has(a)).toBe(true)
			expect(engine.extensions.unique.createItem(a).exists).toBe(true)
		})
	})

	describe('удаление', () => {
		it('plain.remove: has — false, элемент вставляется снова', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }

			engine.extensions.plain.insert(a)
			engine.extensions.plain.remove(a)

			expect(engine.extensions.unique.has(a)).toBe(false)

			engine.extensions.plain.insert(a)

			expect([...engine.extensions.batch.items]).toEqual([a])
		})

		it('batch.remove: has — false у удалённых, элемент вставляется снова', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const b: Item = { uid: 2, name: 'b' }

			engine.extensions.batch.set([a, b])
			engine.extensions.batch.remove([a])

			expect(engine.extensions.unique.has(a)).toBe(false)
			expect(engine.extensions.unique.has(b)).toBe(true)

			engine.extensions.plain.insert(a)

			expect([...engine.extensions.batch.items]).toEqual([a, b])
		})

		it('batch.clear: has — false, элементы вставляются снова', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const b: Item = { uid: 2, name: 'b' }

			engine.extensions.batch.set([a, b])
			engine.extensions.batch.clear()

			expect(engine.extensions.unique.has(a)).toBe(false)
			expect(engine.extensions.unique.has(b)).toBe(false)

			engine.extensions.batch.set([a, b])

			expect([...engine.extensions.batch.items]).toEqual([a, b])
		})
	})

	describe('замена набора через batch', () => {
		it('set: has — по новому составу', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const b: Item = { uid: 2, name: 'b' }
			const c: Item = { uid: 3, name: 'c' }

			engine.extensions.batch.set([a, b])

			expect(engine.extensions.unique.has(a)).toBe(true)
			expect(engine.extensions.unique.has(b)).toBe(true)
			expect(engine.extensions.unique.has(c)).toBe(false)
		})

		it('update без trackBy: has — по новому составу, элемент прежнего набора вставляется снова', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const b: Item = { uid: 2, name: 'b' }
			const c: Item = { uid: 3, name: 'c' }

			engine.extensions.batch.set([a, b])
			engine.extensions.batch.update([b, c])

			expect([...engine.extensions.batch.items]).toEqual([b, c])
			expect(engine.extensions.unique.has(a)).toBe(false)
			expect(engine.extensions.unique.has(b)).toBe(true)
			expect(engine.extensions.unique.has(c)).toBe(true)
		})

		it('patch: has — по новому составу', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const b: Item = { uid: 2, name: 'b' }
			const c: Item = { uid: 3, name: 'c' }

			engine.extensions.batch.trackBy = (item) => item.uid
			engine.extensions.batch.set([a, b])
			engine.extensions.batch.patch([{ uid: 2, name: 'b2' }, c])

			expect([...engine.extensions.batch.items]).toEqual([b, c])
			expect(engine.extensions.unique.has(a)).toBe(false)
			expect(engine.extensions.unique.has(b)).toBe(true)
			expect(engine.extensions.unique.has(c)).toBe(true)
		})
	})

	describe('элементы без числового uid не отслеживаются', () => {
		it('без поля uid: повтор вставляется, has — false', () => {
			const engine = createEngine<Plain>()
			const item: Plain = { name: 'a' }

			engine.extensions.plain.insert(item)
			engine.extensions.plain.insert(item)

			expect(engine.extensions.batch.items).toHaveLength(2)
			expect(engine.extensions.unique.has(item)).toBe(false)
		})

		it('строковый uid: повтор вставляется, has — false', () => {
			const engine = createEngine<StringUid>()
			const a: StringUid = { uid: 'a', name: 'a' }
			const twin: StringUid = { uid: 'a', name: 'twin' }

			engine.extensions.plain.insert(a)
			engine.extensions.plain.insert(twin)

			expect(engine.extensions.batch.items).toHaveLength(2)
			expect(engine.extensions.unique.has(a)).toBe(false)
		})
	})

	describe('внутри батча', () => {
		// временно, до 869f2h1h9 (https://app.clickup.com/t/869f2h1h9)
		it.skip('batch.set: из двух элементов с одним uid вставляется один', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }
			const twin: Item = { uid: 1, name: 'twin' }

			engine.extensions.batch.set([a, twin])

			expect(engine.extensions.batch.items).toHaveLength(1)
			expect(engine.extensions.batch.items[0]).toBe(a)
		})

		// временно, до 869f2h1h9 (https://app.clickup.com/t/869f2h1h9)
		it.skip('engine.batch: удалённый и снова вставленный элемент остаётся в составе', () => {
			const engine = createEngine<Item>()
			const a: Item = { uid: 1, name: 'a' }

			engine.extensions.plain.insert(a)

			engine.batch(() => {
				engine.extensions.plain.remove(a)
				engine.extensions.plain.insert(a)
			})

			expect([...engine.extensions.batch.items]).toEqual([a])
		})
	})
})
