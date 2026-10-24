/**
 * Реестр наборов элементов коллекции (`TCollectionBundlesPlugin`): о каждой
 * снятой записи он сообщает `bundle:unregistered`.
 *
 * Запись живёт, пока набор элемента в документе, а уходит набор двумя путями:
 * кончается монтирование элемента из данных (`release`) или сам элемент уходит
 * из коллекции — убран из данных, снят из разметки, коллекцию очистили. Раньше
 * второй путь снимал запись молча, и подписчик, который держит что-то за
 * набором элемента, узнавал только о первом: ссылка `aria-activedescendant`
 * ListBox на `id` удалённого элемента оставалась ссылкой в пустоту
 * (`setup/__tests__/list-keyboard.spec.ts`, «ссылка на элемент под стрелками»).
 */

import { describe, it, expect } from 'vitest'
import { TListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import { TCollectionBundlesPlugin, TPluginBundle } from '../src'

/** Реестр над списком из трёх элементов, у каждого — свой набор. */
function setup() {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{ items: ['a', 'b', 'c'].map((value) => ({ value, text: value })) },
		{ owner },
	)
	const engine = facade.engine
	const items = [...engine.extensions.batch.items]
	const registry = new TPluginBundle(owner)
		.use(TCollectionBundlesPlugin)
		.get(TCollectionBundlesPlugin)

	if (!registry) throw new Error('реестра нет')

	registry.bindEngine(engine)

	const itemBundles = new Map<IListBoxItem, TPluginBundle>()

	for (const item of items) {
		const bundle = new TPluginBundle(item)

		itemBundles.set(item, bundle)
		registry.register(bundle, item)
	}

	/** Набор элемента, который тест зарегистрировал сам. */
	const bundleOf = (item: IListBoxItem): TPluginBundle => {
		const bundle = itemBundles.get(item)

		if (!bundle) throw new Error(`у «${item.text}» нет набора`)

		return bundle
	}

	/** Снятые записи — `uid` по порядку `bundle:unregistered`. */
	const unregistered: Array<string | number> = []

	registry.events.on('bundle:unregistered', ({ uid }) => unregistered.push(uid))

	return { engine, items, registry, bundleOf, unregistered }
}

describe('TCollectionBundlesPlugin — bundle:unregistered', () => {
	it('кончилось монтирование элемента из данных — запись снята, событие одно', () => {
		const { items, registry, bundleOf, unregistered } = setup()
		const [, second] = items

		registry.release(bundleOf(second), second)

		expect(registry.getByUid(second.uid)).toBeUndefined()
		expect(unregistered).toEqual([second.uid])
	})

	it('элемент ушёл из коллекции — запись снята с событием, позднее снятие монтирования молчит', () => {
		const { engine, items, registry, bundleOf, unregistered } = setup()
		const [, second] = items

		engine.extensions.plain.remove(second)

		expect(registry.getByUid(second.uid)).toBeUndefined()
		expect(unregistered).toEqual([second.uid])

		// Монтирование адаптер снимает уже после: записи нет — сообщать не о чем
		registry.release(bundleOf(second), second)

		expect(unregistered).toEqual([second.uid])
	})

	it('коллекцию очистили — событие на каждую запись', () => {
		const { engine, items, registry, unregistered } = setup()

		engine.extensions.batch.clear()

		expect(items.map((item) => registry.getByUid(item.uid))).toEqual([
			undefined,
			undefined,
			undefined,
		])
		expect(unregistered).toEqual(items.map((item) => item.uid))
	})

	it('ушёл элемент без набора — событий нет, чужие записи на месте', () => {
		const { engine, items, registry, unregistered } = setup()
		const extra = engine.extensions.plain.push({ value: 'd', text: 'd' })

		engine.extensions.plain.remove(extra)

		expect(unregistered).toEqual([])
		expect(items.every((item) => registry.getByUid(item.uid) !== undefined)).toBe(true)
	})
})
