/**
 * `meta` — отметки элементов из данных (`_`).
 *
 * Отметки одной записи — команды или всего `batch()` — уходят одним событием
 * в её конце, на `change:items`: добавленных — `meta:applied`, обновлённых —
 * `meta:changed`. Событие на элемент заставляло потребителя ставить отметки
 * по одной, и выбор тысяч строк из данных стоил столько же проходов по
 * коллекции. Программный `apply` записью не является — его отметка уходит
 * сразу.
 */

import { describe, it, expect, vi } from 'vitest'
import { createEngine } from '@soldy-ui/core'
import type { TCollectionEngineItemSource, TMetaEntry } from '@soldy-ui/core'

type Item = { id: number; name: string }

/** Источник элемента, как он приходит в данных: с отметками `_` или без. */
function source(id: number, marks?: Record<string, unknown>): TCollectionEngineItemSource<Item> {
	return marks ? { id, name: String(id), _: marks } : { id, name: String(id) }
}

/** Пустой движок первого уровня — `meta` в нём есть — и журнал событий записи. */
function setup() {
	const engine = createEngine<Item>()
	const { meta, plain } = engine.extensions
	const log: string[] = []
	const applied = vi.fn<(entries: readonly TMetaEntry<Item>[]) => void>()
	const changed = vi.fn<(entries: readonly TMetaEntry<Item>[]) => void>()

	plain.events.on('item:added', () => log.push('item:added'))
	plain.events.on('item:updated', () => log.push('item:updated'))
	meta.events.on('meta:applied', (entries) => {
		log.push('meta:applied')
		applied(entries)
	})
	meta.events.on('meta:changed', (entries) => {
		log.push('meta:changed')
		changed(entries)
	})

	return { engine, log, applied, changed }
}

/** Номера элементов списка отметок. */
const idsOf = (entries: readonly TMetaEntry<Item>[]) => entries.map(({ item }) => item.id)

describe('meta: отметки записи — одним событием в её конце', () => {
	it('batch.set: отметки добавленных — одно meta:applied после всех item:added', () => {
		const { engine, log, applied } = setup()

		engine.extensions.batch.set([
			{ id: 1, name: 'a', _: { selected: true } },
			{ id: 2, name: 'b' },
			{ id: 3, name: 'c', _: { active: true } },
		])

		const [a, , c] = engine.extensions.batch.items

		expect(log).toEqual(['item:added', 'item:added', 'item:added', 'meta:applied'])
		expect(applied.mock.calls).toEqual([
			[
				[
					{ item: a, meta: { selected: true } },
					{ item: c, meta: { active: true } },
				],
			],
		])
	})

	it('запись без отметок — без события', () => {
		const { engine, applied, changed } = setup()

		engine.extensions.batch.set([{ id: 1, name: 'a' }])
		engine.extensions.plain.push(source(2, {}))

		expect(applied).not.toHaveBeenCalled()
		expect(changed).not.toHaveBeenCalled()
	})

	it('одиночная вставка — тоже запись: событие следом за её item:added', () => {
		const { engine, log, applied } = setup()

		engine.extensions.plain.push(source(1, { selected: true }))

		expect(log).toEqual(['item:added', 'meta:applied'])
		expect(idsOf(applied.mock.calls[0][0])).toEqual([1])
	})

	it('batch(): отметки всех команд — одним событием, в порядке записи', () => {
		const { engine, applied } = setup()
		const { plain } = engine.extensions

		engine.batch(() => {
			plain.push(source(1, { selected: true }))
			plain.push(source(2))
			plain.push(source(3, { selected: true }))
		})

		expect(applied).toHaveBeenCalledOnce()
		expect(idsOf(applied.mock.calls[0][0])).toEqual([1, 3])
	})

	it('patch: сначала meta:applied добавленных, следом meta:changed обновлённых', () => {
		const { engine, log, applied, changed } = setup()
		const { batch } = engine.extensions

		batch.trackBy = (item) => item.id
		batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])
		log.length = 0

		batch.patch([
			{ id: 2, name: 'b', _: { selected: true } },
			{ id: 3, name: 'c', _: { selected: true } },
			{ id: 1, name: 'a', _: { selected: true } },
		])

		expect(log).toEqual([
			'item:updated',
			'item:added',
			'item:updated',
			'meta:applied',
			'meta:changed',
		])
		expect(idsOf(applied.mock.calls[0][0])).toEqual([3])
		expect(idsOf(changed.mock.calls[0][0])).toEqual([2, 1])
	})

	/**
	 * Догон опоздавших читает снимок (`get`), а снимок помнится на событии
	 * элемента, не дожидаясь конца записи. Слушатель драйвера здесь — после
	 * `meta`: он подписан позже, чем `meta` установлен.
	 */
	it('снимок помнится сразу, на событии элемента', () => {
		const { engine, applied } = setup()
		const { batch, meta } = engine.extensions
		const seen: unknown[] = []

		engine.getCore().driver.events.on('item:added', () => {
			seen.push(meta.get(batch.items[0]), applied.mock.calls.length)
		})
		engine.extensions.plain.push(source(1, { selected: true }))

		expect(seen).toEqual([{ selected: true }, 0])
		expect(applied).toHaveBeenCalledOnce()
	})
})

describe('meta.apply', () => {
	it('список из одной пары — сразу', () => {
		const { engine, applied } = setup()

		engine.extensions.batch.set([{ id: 1, name: 'a' }])

		const [a] = engine.extensions.batch.items

		engine.extensions.meta.apply(a, { selected: true })

		expect(applied.mock.calls).toEqual([[[{ item: a, meta: { selected: true } }]]])
		expect(engine.extensions.meta.get(a)).toEqual({ selected: true })
	})

	it('пустая meta — без события', () => {
		const { engine, applied } = setup()

		engine.extensions.batch.set([{ id: 1, name: 'a' }])
		engine.extensions.meta.apply(engine.extensions.batch.items[0], {})

		expect(applied).not.toHaveBeenCalled()
	})
})
