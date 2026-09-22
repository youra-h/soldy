/**
 * Переполнение ряда тегов: что делать с теми, кому не хватило ширины.
 *
 * Свойство одно, перечислением (`wrap | scroll | arrows | popover`), и оно у
 * самого набора — раскладку по нему делает тема. Знание «какие теги остались в
 * ряду, а какие уехали в панель» — о составе, поэтому оно в расширении
 * коллекции: ряд рисует `fitted`, панель — `overflowed`, и каждый тег
 * отрисован ровно один раз.
 *
 * `arrows` делит состав не больше, чем `wrap`: ряд там заворачивается в ленту
 * целиком. Своё у режима одно — ряд перестаёт быть корнем, и атрибуты ряда
 * уезжают в отдельный набор (`rowAria`), который разметка отдаёт вьюпорту.
 *
 * Сколько тегов помещается, знает только DOM, поэтому здесь замер
 * подставляется руками (`notifyFit`) — ровно так же, как это делает плагин.
 */

import { describe, it, expect, vi } from 'vitest'
import { TTags, TTagsItem, TTagsCollectionFacade, TSelect, TSelectCollectionFacade } from '../src'
import type { IPopover, ITagsItem, ITagsProps } from '@soldy-ui/core'

function createTags(texts: string[], props: Partial<ITagsProps> = {}) {
	const owner = new TTags(props)
	const collection = new TTagsCollectionFacade({}, { owner })

	collection.items = texts.map((text) => new TTagsItem({ value: text, text })) as ITagsItem[]

	return { owner, collection }
}

/** Панель, открытая как её открывает пользователь; нет её — падаем здесь. */
function openPanel(collection: TTagsCollectionFacade): IPopover {
	const panel = collection.panel

	if (!panel) throw new Error('панели нет: режим не popover')

	panel.open = true

	return panel
}

describe('свойство overflow', () => {
	it('по умолчанию wrap — поведение ряда не меняется', () => {
		expect(new TTags().overflow).toBe('wrap')
	})

	it('уезжает в тему через data-overflow', () => {
		const tags = new TTags({ overflow: 'popover' })

		expect(tags.dataset.get('data-overflow')).toBe('popover')

		tags.overflow = 'scroll'

		expect(tags.dataset.get('data-overflow')).toBe('scroll')
	})

	it('сеттер сообщает об изменении и молчит на том же значении', () => {
		const tags = new TTags()
		const changed = vi.fn()

		tags.events.on('change:overflow', changed)

		tags.overflow = 'popover'
		tags.overflow = 'popover'

		expect(changed).toHaveBeenCalledExactlyOnceWith('popover')
	})

	it('имя кнопки «…» — проп с английским дефолтом', () => {
		expect(new TTags().moreAria).toEqual({ 'aria-label': 'More' })
		expect(new TTags({ moreLabel: 'Ещё' }).moreAria).toEqual({ 'aria-label': 'Ещё' })
	})

	it('arrows — признак режима, а не сравнение строки в шести разметках', () => {
		const tags = new TTags()

		expect(tags.arrows).toBe(false)

		tags.overflow = 'arrows'

		expect(tags.arrows).toBe(true)
		expect(tags.dataset.get('data-overflow')).toBe('arrows')
	})
})

/**
 * Кнопки листания принадлежат ленте, и английские умолчания держит она. У
 * Tags своих строк нет: второй экземпляр тех же слов однажды разошёлся бы с
 * первым, а `undefined` доезжает до ленты и оставляет её при своём.
 */
describe('имена кнопок листания', () => {
	it('не заданы — их нет вовсе, дефолт держит лента', () => {
		const tags = new TTags()

		expect(tags.prevLabel).toBeUndefined()
		expect(tags.nextLabel).toBeUndefined()
	})

	it('заданные доезжают и сообщают об изменении', () => {
		const tags = new TTags({ prevLabel: 'Назад', nextLabel: 'Вперёд' })
		const changed = vi.fn()

		expect(tags.prevLabel).toBe('Назад')
		expect(tags.nextLabel).toBe('Вперёд')

		tags.events.on('change:prevLabel', changed)

		tags.prevLabel = 'К началу'
		tags.prevLabel = 'К началу'

		expect(changed).toHaveBeenCalledExactlyOnceWith('К началу')
	})
})

describe('ряд в arrows — вьюпорт ленты, а не корень', () => {
	/** Атрибуты, которые описывают ряд: их пишет коллекция через `setRowAria`. */
	const ROW = ['role', 'aria-orientation', 'aria-multiselectable'] as const

	/** Атрибуты ряда из корня: `aria` — живой набор, `rowAria` — снимок. */
	const onRoot = (tags: TTags) => ROW.map((name) => tags.aria.get(name) ?? null)
	const onRow = (tags: TTags) => ROW.map((name) => tags.rowAria[name] ?? null)

	it('в arrows все три атрибута ряда стоят в rowAria, а корень их не несёт', () => {
		const { owner, collection } = createTags(['a', 'b'], { overflow: 'arrows' })

		collection.mode = 'multiple'

		expect(onRow(owner)).toEqual(['listbox', 'horizontal', 'true'])
		expect(onRoot(owner)).toEqual([null, null, null])
	})

	it('вне arrows они на корне, а rowAria пуст', () => {
		const { owner, collection } = createTags(['a', 'b'])

		collection.mode = 'multiple'

		expect(onRoot(owner)).toEqual(['listbox', 'horizontal', 'true'])
		expect(owner.rowAria).toEqual({})
	})

	it('смена режима перевозит атрибуты туда и обратно', () => {
		const { owner, collection } = createTags(['a', 'b'])

		collection.mode = 'single'
		owner.overflow = 'arrows'

		expect(onRow(owner)).toEqual(['listbox', 'horizontal', null])
		expect(owner.aria.get('role')).toBeUndefined()

		owner.overflow = 'wrap'

		expect(onRoot(owner)).toEqual(['listbox', 'horizontal', null])
		expect(owner.rowAria).toEqual({})
	})

	/** Переезд — дело самого Tags: без коллекции роль он всё равно унесёт. */
	it('набор без коллекции переезжает так же', () => {
		const tags = new TTags()

		expect(tags.aria.get('role')).toBe('list')

		tags.overflow = 'arrows'

		expect(tags.rowAria).toEqual({ role: 'list' })
		expect(tags.aria.get('role')).toBeUndefined()
	})

	it('смена mode в arrows пишет роль туда же, а не на корень', () => {
		const { owner, collection } = createTags(['a'], { overflow: 'arrows' })

		expect(owner.rowAria.role).toBe('list')

		collection.mode = 'single'

		expect(owner.rowAria.role).toBe('listbox')

		collection.mode = 'none'

		expect(owner.rowAria.role).toBe('list')
		expect(owner.aria.get('role')).toBeUndefined()
	})

	it('набор сообщает об изменении своим событием', () => {
		const { owner, collection } = createTags(['a'], { overflow: 'arrows' })
		const changed = vi.fn()

		owner.events.on('change:rowAria', changed)
		collection.mode = 'multiple'

		expect(changed).toHaveBeenCalled()
		expect(changed.mock.lastCall?.[0]).toMatchObject({ role: 'listbox' })
	})

	/**
	 * Переезжает только то, что объявили атрибутом ряда. Имя набора — знание
	 * потребителя о корне, и переезд роли его не касается.
	 */
	it('aria-label потребителя остаётся на корне', () => {
		const { owner, collection } = createTags(['a'], { overflow: 'arrows' })

		owner.aria.add('aria-label', 'Города')
		collection.mode = 'multiple'

		expect(owner.aria.get('aria-label')).toBe('Города')
		expect(owner.rowAria['aria-label']).toBeUndefined()
	})
})

describe('наборы панели', () => {
	it('классы панели — классы ряда плюс свой класс места', () => {
		const { owner } = createTags(['a'], { view: 'ghost', overflow: 'popover' })

		expect(owner.panelClasses).toEqual([...owner.classes.valueOf(), 's-tags__panel'])
		expect(owner.panelClasses).toContain('s-tags--view-ghost')
	})

	it('роль панели повторяет роль ряда и следует за режимом выбора', () => {
		const { owner, collection } = createTags(['a'])

		expect(owner.panelAria).toEqual({ role: 'list' })

		collection.mode = 'multiple'

		expect(owner.panelAria).toEqual({ role: 'listbox' })
	})
})

describe('деление на ряд и панель', () => {
	it('в wrap, scroll и arrows делить нечего: панели нет, всё в ряду', () => {
		for (const overflow of ['wrap', 'scroll', 'arrows'] as const) {
			const { collection } = createTags(['a', 'b'], { overflow })

			expect(collection.panel).toBeNull()
			expect(collection.fitted).toHaveLength(2)
			expect(collection.overflowed).toEqual([])
		}
	})

	it('в popover панель появляется, а до замера теги остаются в ряду', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		expect(collection.panel).not.toBeNull()
		expect(collection.fitted).toHaveLength(2)
		expect(collection.overflowed).toEqual([])
	})

	it('замер делит показанное: первые в ряду, хвост в панели', () => {
		const { collection } = createTags(['a', 'b', 'c'], { overflow: 'popover' })
		const changed = vi.fn()

		collection.events.on('change:fit', changed)
		collection.engine.extensions.overflow.notifyFit(1)

		expect(collection.fitted.map((item) => item.value)).toEqual(['a'])
		expect(collection.overflowed.map((item) => item.value)).toEqual(['b', 'c'])
		expect(changed).toHaveBeenCalledOnce()
	})

	it('повторный замер с тем же числом ничего не сообщает', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		collection.engine.extensions.overflow.notifyFit(1)

		const changed = vi.fn()

		collection.events.on('change:fit', changed)
		collection.engine.extensions.overflow.notifyFit(1)

		expect(changed).not.toHaveBeenCalled()
	})

	it('смена режима возвращает теги в ряд и убирает панель', () => {
		const { owner, collection } = createTags(['a', 'b'], { overflow: 'popover' })

		collection.engine.extensions.overflow.notifyFit(1)
		owner.overflow = 'wrap'

		expect(collection.panel).toBeNull()
		expect(collection.fitted).toHaveLength(2)
		expect(collection.overflowed).toEqual([])
	})

	/**
	 * Порядок в ряду задаёт коллекция: тег несёт свой номер стилем, потому что
	 * перестановка не должна переписывать разметку. Кнопка «…» элементом
	 * коллекции не является, и без номера она встала бы нулевой — сразу за
	 * первым тегом. Её номер — номер первого тега, который не поместился.
	 */
	it('кнопка «…» встаёт на место первого не поместившегося тега', () => {
		const { collection } = createTags(['a', 'b', 'c'], { overflow: 'popover' })

		collection.engine.extensions.overflow.notifyFit(2)

		expect(collection.moreOrder).toBe(2)

		collection.engine.extensions.overflow.notifyFit(1)

		expect(collection.moreOrder).toBe(1)
	})

	it('без хвоста кнопки в ряду нет — и места ей не нужно', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		expect(collection.overflowed).toEqual([])
		expect(collection.moreOrder).toBe(0)
	})

	it('новый тег встаёт в ряд, а не в закрытую панель: там его не измерить', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		collection.engine.extensions.overflow.notifyFit(1)
		collection.engine.extensions.plain.push(new TTagsItem({ value: 'c', text: 'c' }))

		expect(collection.overflowed.map((item) => item.value)).toEqual(['b', 'c'])
	})
})

describe('панель закрывается, когда из неё закрыли последний тег', () => {
	it('пока в панели остаются теги, она открыта', () => {
		const { collection } = createTags(['a', 'b', 'c'], { overflow: 'popover' })

		collection.engine.extensions.overflow.notifyFit(1)

		const panel = openPanel(collection)

		collection.engine.extensions.tags.closeTag(collection.items[2])

		expect(panel.open).toBe(true)
	})

	it('закрыли последний — панель закрылась', () => {
		const { owner, collection } = createTags(['a', 'b'], { overflow: 'popover' })

		owner.closable = true
		collection.engine.extensions.overflow.notifyFit(1)

		const panel = openPanel(collection)

		collection.engine.extensions.tags.closeTag(collection.items[1])

		expect(collection.overflowed).toEqual([])
		expect(panel.open).toBe(false)
	})
})

describe('тег из панели не держит остановку Tab', () => {
	it('остановка остаётся в ряду, а не уезжает на первый выбранный в панели', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		collection.mode = 'multiple'
		collection.engine.extensions.overflow.notifyFit(1)
		collection.engine.extensions.selection.select(collection.items[1])

		expect(collection.engine.extensions.tags.tabStop).toBe(collection.items[0])
		expect(collection.items[0].aria.get('tabindex')).toBe('0')
		expect(collection.items[1].aria.get('tabindex')).toBe('-1')
	})

	it('перейти на тег в панели нельзя — одно правило на остановку и стрелки', () => {
		const { collection } = createTags(['a', 'b'], { overflow: 'popover' })

		collection.mode = 'multiple'
		collection.engine.extensions.overflow.notifyFit(1)

		const tags = collection.engine.extensions.tags

		expect(tags.isEnabledTag(collection.items[0])).toBe(true)
		expect(tags.isEnabledTag(collection.items[1])).toBe(false)
	})
})

describe('Select передаёт режим своим тегам', () => {
	const createSelect = () => {
		const owner = new TSelect()
		const collection = new TSelectCollectionFacade({ mode: 'multiple' }, { owner })

		return { owner, collection }
	}

	it('по умолчанию wrap — поле ведёт себя как прежде', () => {
		const { collection } = createSelect()

		expect(collection.tags_overflow).toBe('wrap')
		expect(collection.tags?.overflow).toBe('wrap')
	})

	it('заданный режим доезжает до инстанса тегов', () => {
		const { collection } = createSelect()

		collection.tags_overflow = 'popover'

		expect(collection.tags?.overflow).toBe('popover')
	})

	it('режим переживает пересоздание тегов при смене mode', () => {
		const { collection } = createSelect()

		collection.tags_overflow = 'popover'
		collection.mode = 'single'
		collection.mode = 'multiple'

		expect(collection.tags?.overflow).toBe('popover')
	})

	it('задан пропом — доезжает и до свежего инстанса', () => {
		const owner = new TSelect()
		const collection = new TSelectCollectionFacade(
			{ mode: 'multiple', tags_overflow: 'scroll' },
			{ owner },
		)

		expect(collection.tags?.overflow).toBe('scroll')
	})
})
