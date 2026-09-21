/**
 * Переполнение ряда тегов: что делать с теми, кому не хватило ширины.
 *
 * Свойство одно, перечислением (`wrap | scroll | popover`), и оно у самого
 * набора — раскладку по нему делает тема. Знание «какие теги остались в ряду,
 * а какие уехали в панель» — о составе, поэтому оно в расширении коллекции:
 * ряд рисует `fitted`, панель — `overflowed`, и каждый тег отрисован ровно
 * один раз.
 *
 * Сколько тегов помещается, знает только DOM, поэтому здесь замер
 * подставляется руками (`notifyFit`) — ровно так же, как это делает плагин.
 */

import { describe, it, expect, vi } from 'vitest'
import { TTags, TTagsItem, TTagsCollectionFacade, TSelect, TSelectCollectionFacade } from '../src'
import type { IPopover, ITagsItem, ITagsProps } from '@soldy/core'

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
	it('в wrap и scroll делить нечего: панели нет, всё в ряду', () => {
		for (const overflow of ['wrap', 'scroll'] as const) {
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
