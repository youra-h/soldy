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
	TItemContextRegistry,
	createEngineTags,
} from '../src'
import type { ITagsItem, ITagsProps } from '@soldy/core'

function createTags(texts: string[], props: Partial<ITagsProps> = {}) {
	const owner = new TTags(props)
	const collection = new TTagsCollectionFacade({}, { owner })
	const items = texts.map((text) => new TTagsItem({ value: text, text }))

	collection.items = items as ITagsItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	return { owner, collection, items, registry }
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

/**
 * Вид набора — модификатор самого `TTags`, и только он: пилюлю каждого тега
 * тема рисует по классу набора, тегу значение не доставляется. Другого пути
 * вида к теме нет, поэтому модификатор стережётся здесь.
 */
describe('view — модификатор набора', () => {
	const viewClasses = (classes: string[]) => classes.filter((cls) => cls.includes('--view-'))

	it('без вида модификатора нет — как у Button', () => {
		const { owner } = createTags(['a'])

		expect(viewClasses(owner.classes.toArray())).toEqual([])
	})

	it('вид ставит модификатор s-tags--view-<v> на набор, а не на теги', () => {
		const { owner, items } = createTags(['a', 'b'], { view: 'ghost' })

		expect(viewClasses(owner.classes.toArray())).toEqual(['s-tags--view-ghost'])
		expect(items.flatMap((item) => viewClasses(item.classes.toArray()))).toEqual([])
	})

	it('смена вида меняет модификатор и шлёт change:view', () => {
		const { owner } = createTags(['a'], { view: 'ghost' })
		const seen: unknown[] = []

		owner.events.on('change:view', (value) => seen.push(value))

		owner.view = 'solid'

		expect(viewClasses(owner.classes.toArray())).toEqual(['s-tags--view-solid'])
		expect(seen).toEqual(['solid'])
	})

	it('undefined снимает модификатор', () => {
		const { owner } = createTags(['a'], { view: 'ghost' })
		const seen: unknown[] = []

		owner.events.on('change:view', (value) => seen.push(value))

		owner.view = undefined

		expect(owner.view).toBeUndefined()
		expect(viewClasses(owner.classes.toArray())).toEqual([])
		expect(seen).toEqual([undefined])
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
