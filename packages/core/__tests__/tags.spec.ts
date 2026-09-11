/**
 * Tags: набор тегов без обязательного выбора.
 *
 * В отличие от ListBox режим выбора по умолчанию `none` — Tags не требует
 * выделения, чтобы отобразить теги (владелец подтвердил это в задаче), а
 * `TSelectionExtension` по умолчанию даёт `single`. Дефолт переопределён в
 * `TagsFactory`, сам `TSelectionExtension` не тронут.
 *
 * Роль набора и тегов зависит от режима: `list`/`listitem`, пока
 * `mode === 'none'`, иначе `listbox`/`option` с `aria-selected` — знание
 * коллекции (`TTagsExtension`), не элемента.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TTags,
	TTagsItem,
	TTagsCollectionFacade,
	TTagsItemCollectionFacade,
	TItemContextRegistry,
	createEngineTags,
} from '../src'
import type { ITagsItem } from '@soldy/core'

function createTags(texts: string[], props: Record<string, unknown> = {}) {
	const owner = new TTags(props as any)
	const collection = new TTagsCollectionFacade({}, { owner })
	const items = texts.map((text) => new TTagsItem({ value: text, text }))

	collection.items = items as ITagsItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад элемента — через него разметка читает членство в коллекции. */
	const facadeFor = (index: number) => {
		const facade = new TTagsItemCollectionFacade()

		facade.setContext(registry.get(items[index]) as any)

		return facade
	}

	return { owner, collection, items, registry, facadeFor }
}

describe('добавление тегов', () => {
	it('через проп items элемент появляется в коллекции', () => {
		const { collection, items } = createTags(['a', 'b'])

		expect([...collection.items]).toEqual(items)
	})

	it('через движок, собранный снаружи (createEngineTags)', () => {
		const owner = new TTags()
		const engine = createEngineTags({ owner, items: [{ value: 'a', text: 'a' }] })
		const collection = new TTagsCollectionFacade({}, { owner, engine })

		expect(collection.items.map((item) => item.value)).toEqual(['a'])
		expect(collection.items[0]).toBeInstanceOf(TTagsItem)
	})
})

describe('режим выбора по умолчанию — none', () => {
	it('mode коллекции по умолчанию none', () => {
		const { collection } = createTags(['a'])

		expect(collection.mode).toBe('none')
	})

	it('в none выбор не выделяет тег', () => {
		const { collection, items } = createTags(['a', 'b'])

		collection.engine.extensions.selection.select(items[0])

		expect(collection.selected).toEqual([])
	})

	it('роль набора — list, тега — listitem, aria-selected не проставлен', () => {
		const { owner, items } = createTags(['a'])

		expect(owner.aria.get('role')).toBe('list')
		expect(items[0].aria.get('role')).toBe('listitem')
		expect(items[0].aria.get('aria-selected')).toBeUndefined()
	})
})

describe('value ↔ выбор', () => {
	it('single: значение выбирает тег, роли переключаются на listbox/option', () => {
		const { owner, collection, items } = createTags(['a', 'b', 'c'])

		collection.mode = 'single'
		owner.value = 'b'

		expect(collection.selected).toEqual([items[1]])
		expect(owner.aria.get('role')).toBe('listbox')
		expect(items[1].aria.get('role')).toBe('option')
		expect(items[1].aria.get('aria-selected')).toBe('true')
		expect(items[0].aria.get('aria-selected')).toBe('false')
	})

	it('multiple: значение — массив', () => {
		const { owner, collection, items } = createTags(['a', 'b', 'c'])

		collection.mode = 'multiple'
		collection.engine.extensions.selection.select(items[0])
		collection.engine.extensions.selection.select(items[2])

		expect(owner.value).toEqual(['a', 'c'])
	})

	it('выбор снова становится none — роли возвращаются к list/listitem', () => {
		const { owner, collection, items } = createTags(['a', 'b'])

		collection.mode = 'single'
		owner.value = 'a'
		collection.mode = 'none'

		expect(owner.aria.get('role')).toBe('list')
		expect(items[0].aria.get('role')).toBe('listitem')
		expect(items[0].aria.get('aria-selected')).toBeUndefined()
	})
})

describe('закрытие тега', () => {
	it('close() удаляет closable тег и эмитит item:close', () => {
		const { collection, items, registry } = createTags(['a', 'b'], { closable: true })
		const onClose = vi.fn()

		collection.engine.extensions.tags.events.on('item:close', onClose)

		registry.get(items[0]).adapters.tags.close()

		expect(onClose).toHaveBeenCalledWith(items[0])
		expect([...collection.items]).toEqual([items[1]])
	})

	it('не закрывает тег, если он не closable', () => {
		const { collection, items, registry } = createTags(['a'], { closable: false })
		const onClose = vi.fn()

		collection.engine.extensions.tags.events.on('item:close', onClose)

		registry.get(items[0]).adapters.tags.close()

		expect(onClose).not.toHaveBeenCalled()
		expect([...collection.items]).toEqual([items[0]])
	})

	it('closeTag резолвит closable: явное значение элемента приоритетнее владельца', () => {
		const { collection, items } = createTags(['a', 'b'], { closable: true })

		items[0].closable = false

		expect(collection.engine.extensions.tags.closeTag(items[0])).toBe(false)
		expect(collection.engine.extensions.tags.closeTag(items[1])).toBe(true)
		expect([...collection.items]).toEqual([items[0]])
	})
})

describe('disabled сбрасывает closable', () => {
	it('closable становится false при переходе в disabled', () => {
		const tag = new TTagsItem({ closable: true })

		expect(tag.closable).toBe(true)

		tag.disabled = true

		expect(tag.closable).toBe(false)
	})
})

describe('view пробрасывается с Tags на тег', () => {
	it('дефолт — filled, как у Button', () => {
		const { facadeFor } = createTags(['a'])

		expect(facadeFor(0).view).toBe('filled')
	})

	it('тег берёт вид владельца', () => {
		const { facadeFor } = createTags(['a'], { view: 'outlined' })

		expect(facadeFor(0).view).toBe('outlined')
	})

	/**
	 * Тот самый релей (см. ListBox: `change:view` — единственное событие,
	 * которое item-адаптер добавляет к карте родителя). Без него тег узнавал
	 * бы о смене вида только при пересоздании.
	 */
	it('смена вида доходит до тега событием', () => {
		const { owner, facadeFor } = createTags(['a', 'b'], { view: 'plain' })
		const facade = facadeFor(0)
		const seen: unknown[] = []

		facade.events.on('change:view', (value: unknown) => seen.push(value))

		owner.view = 'filled'

		expect(seen).toEqual(['filled'])
		expect(facade.view).toBe('filled')
	})

	it('вид доходит до всех тегов, а не только до первого', () => {
		const { owner, facadeFor } = createTags(['a', 'b', 'c'], { view: 'plain' })
		const facades = [facadeFor(0), facadeFor(1), facadeFor(2)]

		owner.view = 'filled'

		expect(facades.map((facade) => facade.view)).toEqual(['filled', 'filled', 'filled'])
	})
})

describe('closeAria', () => {
	it('содержит текст тега вместе с closeLabel', () => {
		const tag = new TTagsItem({ text: 'Настройки' })

		expect(tag.closeAria).toEqual({ 'aria-label': 'Close Настройки' })
	})

	it('closeLabel переопределяется пропом', () => {
		const tag = new TTagsItem({ text: 'Настройки', closeLabel: 'Удалить' })

		expect(tag.closeAria).toEqual({ 'aria-label': 'Удалить Настройки' })
	})
})
