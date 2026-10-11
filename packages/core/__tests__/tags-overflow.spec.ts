/**
 * Переполнение ряда тегов: что делать с теми, кому не хватило ширины.
 *
 * Свойство одно, перечислением (`wrap | scroll`), и оно у самого набора —
 * раскладку по нему делает тема. Ядру сверх значения знать нечего: ряд не
 * меряется и не делится, состав коллекции от режима не зависит.
 */

import { describe, it, expect, vi } from 'vitest'
import { TTags, TTagsItem, TTagsCollectionFacade, TSelect, TSelectCollectionFacade } from '../src'
import type { ITagsItem } from '@soldy-ui/core'

describe('свойство overflow', () => {
	it('по умолчанию wrap — поведение ряда не меняется', () => {
		expect(new TTags().overflow).toBe('wrap')
	})

	it('уезжает в тему через data-overflow', () => {
		const tags = new TTags({ overflow: 'scroll' })

		expect(tags.dataset.get('data-overflow')).toBe('scroll')

		tags.overflow = 'wrap'

		expect(tags.dataset.get('data-overflow')).toBe('wrap')
	})

	it('сеттер сообщает об изменении и молчит на том же значении', () => {
		const tags = new TTags()
		const changed = vi.fn()

		tags.events.on('change:overflow', changed)

		tags.overflow = 'scroll'
		tags.overflow = 'scroll'

		expect(changed).toHaveBeenCalledExactlyOnceWith('scroll')
	})

	/**
	 * Роль набора стоит на корне в любом режиме: ряд — это сам корень, и
	 * места для роли не выбирает никто.
	 */
	it('смена режима не трогает роль набора', () => {
		const owner = new TTags({ overflow: 'scroll' })
		const facade = new TTagsCollectionFacade({ mode: 'multiple' }, { owner })

		facade.items = ['Москва', 'Тверь'].map(
			(text) => new TTagsItem({ value: text, text }),
		) as ITagsItem[]

		owner.overflow = 'wrap'

		expect(owner.aria.get('role')).toBe('listbox')
		expect(owner.aria.get('aria-multiselectable')).toBe('true')
	})
})

describe('Select передаёт режим своим тегам', () => {
	const createSelect = () => {
		const owner = new TSelect()
		const facade = new TSelectCollectionFacade({ mode: 'multiple' }, { owner })

		return { owner, facade }
	}

	it('по умолчанию wrap — поле ведёт себя как прежде', () => {
		const { facade } = createSelect()

		expect(facade.tags_overflow).toBe('wrap')
		expect(facade.tags?.overflow).toBe('wrap')
	})

	it('заданный режим доезжает до инстанса тегов', () => {
		const { facade } = createSelect()

		facade.tags_overflow = 'scroll'

		expect(facade.tags?.overflow).toBe('scroll')
	})

	it('режим переживает пересоздание тегов при смене mode', () => {
		const { facade } = createSelect()

		facade.tags_overflow = 'scroll'
		facade.mode = 'single'
		facade.mode = 'multiple'

		expect(facade.tags?.overflow).toBe('scroll')
	})

	it('задан пропом — доезжает и до свежего инстанса', () => {
		const owner = new TSelect()
		const facade = new TSelectCollectionFacade(
			{ mode: 'multiple', tags_overflow: 'scroll' },
			{ owner },
		)

		expect(facade.tags?.overflow).toBe('scroll')
	})
})
