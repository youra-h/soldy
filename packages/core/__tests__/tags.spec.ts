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
import type { ITagsItem, ITagsItemProps, ITagsProps } from '@soldy/core'

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

/**
 * Правило одно и не зависит от пути к «выключен»: со старта, позже или вместе
 * с набором. Выводит его item-адаптер — его `closable` читают разметка
 * (`tag_closable` фасада) и `closeTag`. Раньше правило было подпиской в
 * `TTagsItem` на `change:disabled`, и тег, выключенный со старта, оставался
 * закрываемым: события у него не было.
 *
 * Коллекция собрана как у компонента (`createEngineTags`).
 */
describe('выключенный тег не закрывается', () => {
	function setup(owner = new TTags({ closable: true })) {
		const engine = createEngineTags({ owner })
		const registry = new TItemContextRegistry(engine.getCore())

		/** Можно ли закрыть тег — то, что видит разметка. */
		const closable = (tag: ITagsItem) => registry.get(tag).adapters.tags.closable

		/** Сообщения адаптера тега о смене `closable`. */
		const changes = (tag: ITagsItem) => {
			const handler = vi.fn()

			registry.get(tag).adapters.tags.events.on('change:closable', handler)

			return handler
		}

		return { owner, engine, tags: engine.extensions.tags, registry, closable, changes }
	}

	const createTag = (text: string, props: Partial<ITagsItemProps> = {}) =>
		new TTagsItem({ text, value: text.toLowerCase(), ...props })

	it('выключенный со старта: не закрывается, closeTag его не удаляет', () => {
		const { engine, tags, registry, closable } = setup()
		const tag = engine.extensions.plain.push(createTag('Архив', { disabled: true }))
		const onClose = vi.fn()

		tags.events.on('item:close', onClose)

		expect(closable(tag)).toBe(false)
		expect(tags.closeTag(tag)).toBe(false)

		registry.get(tag).adapters.tags.close()

		expect(onClose).not.toHaveBeenCalled()
		expect(engine.extensions.batch.items).toContain(tag)
	})

	it('выключенный со старта данными (items) — так же', () => {
		const engine = createEngineTags({
			owner: new TTags({ closable: true }),
			items: [{ value: 'archive', text: 'Архив', disabled: true }],
		})
		const [tag] = engine.extensions.batch.items
		const registry = new TItemContextRegistry(engine.getCore())

		expect(registry.get(tag).adapters.tags.closable).toBe(false)
		expect(engine.extensions.tags.closeTag(tag)).toBe(false)
		expect(engine.extensions.batch.items).toContain(tag)
	})

	it('выключили позже — не закрывается, включили — закрывается снова', () => {
		const { engine, tags, closable, changes } = setup()
		const tag = engine.extensions.plain.push(createTag('Почта'))
		const changed = changes(tag)

		expect(closable(tag)).toBe(true)

		tag.disabled = true

		expect(closable(tag)).toBe(false)
		expect(changed).toHaveBeenCalledOnce()
		expect(tags.closeTag(tag)).toBe(false)

		tag.disabled = false

		expect(closable(tag)).toBe(true)
		expect(changed).toHaveBeenCalledTimes(2)
		expect(tags.closeTag(tag)).toBe(true)
	})

	it('выключили набор — не закрывается ни один тег, включили — снова закрываются', () => {
		const { owner, engine, tags, closable, changes } = setup()
		const a = engine.extensions.plain.push(createTag('Настройки'))
		const b = engine.extensions.plain.push(createTag('Почта'))
		const changed = changes(a)

		owner.disabled = true

		expect([a, b].map(closable)).toEqual([false, false])
		expect(changed).toHaveBeenCalledOnce()
		expect(tags.closeTag(a)).toBe(false)

		owner.disabled = false

		expect([a, b].map(closable)).toEqual([true, true])
		expect(changed).toHaveBeenCalledTimes(2)
	})

	it('включили набор — тег, выключенный сам, по-прежнему не закрывается', () => {
		const { owner, engine, closable } = setup()
		const tag = engine.extensions.plain.push(createTag('Архив', { disabled: true }))

		owner.disabled = true
		owner.disabled = false

		expect(closable(tag)).toBe(false)
	})

	it('включение возвращает своё значение тега, заданное после создания', () => {
		const { engine, closable } = setup(new TTags())
		const tag = engine.extensions.plain.push(createTag('Почта'))

		tag.closable = true
		tag.disabled = true

		expect(closable(tag)).toBe(false)

		tag.disabled = false

		expect(closable(tag)).toBe(true)
	})

	it('своё closable, заданное выключенному тегу, действует после включения', () => {
		const { engine, closable } = setup(new TTags())
		const tag = engine.extensions.plain.push(createTag('Архив', { disabled: true }))

		tag.closable = true

		expect(closable(tag)).toBe(false)

		tag.disabled = false

		expect(closable(tag)).toBe(true)
	})

	/** Иначе после включения своё значение тега неоткуда вернуть. */
	it('disabled не трогает своё closable тега, сеттер пишет и у выключенного', () => {
		const tag = new TTagsItem({ closable: true })

		tag.disabled = true

		expect(tag.closable).toBe(true)

		tag.closable = false

		expect(tag.closable).toBe(false)
	})

	it('фасад элемента узнаёт о смене событием — по нему разметка прячет кнопку', () => {
		const { engine, registry } = setup()
		const tag = engine.extensions.plain.push(createTag('Почта'))
		const facade = new TTagsItemCollectionFacade()
		const changed = vi.fn()

		facade.setContext(registry.get(tag))
		facade.events.on('change:closable', changed)

		tag.disabled = true

		expect(facade.closable).toBe(false)
		expect(changed).toHaveBeenCalledOnce()
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
