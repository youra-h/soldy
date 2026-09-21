import { describe, it, expect, vi } from 'vitest'
import { TScroller } from '@soldy/core'
import type { TScrollerDirection, TScrollerViewport } from '@soldy/core'

/**
 * Модель ленты: значение и то, что из него следует для разметки.
 *
 * Замер и прокрутка — плагин вьюпорта, здесь только ядро: умолчания, приём
 * замера, выключенность кнопок, `tabindex` вьюпорта и команды, которые на
 * краю молчат.
 */

/** Замер от плагина: по умолчанию «листать некуда, своих остановок нет». */
const viewport = (patch: Partial<TScrollerViewport> = {}): TScrollerViewport => ({
	canPrev: false,
	canNext: false,
	hasTabStops: false,
	...patch,
})

describe('умолчания', () => {
	it('листать некуда, имена кнопок английские, роли ряда нет', () => {
		const scroller = new TScroller()

		expect(scroller.canPrev).toBe(false)
		expect(scroller.canNext).toBe(false)
		expect(scroller.hasTabStops).toBe(false)
		expect(scroller.prevLabel).toBe('Scroll back')
		expect(scroller.nextLabel).toBe('Scroll forward')
		expect(scroller.viewportAria).toBeUndefined()
	})

	it('корень — div, базовый класс s-scroller', () => {
		const scroller = new TScroller()

		expect(scroller.tag).toBe('div')
		expect(scroller.classes.toArray()).toContain('s-scroller')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const role = { role: 'listbox' }
		const scroller = new TScroller({
			prevLabel: 'Назад',
			nextLabel: 'Вперёд',
			viewportAria: role,
		})

		expect(scroller.getProps()).toMatchObject({
			prevLabel: 'Назад',
			nextLabel: 'Вперёд',
			viewportAria: role,
		})
	})
})

describe('data-* для темы', () => {
	/**
	 * Тема отличает «нельзя» от «неприменимо»: правило «листать нечего» ловит
	 * оба признака разом, и снятый атрибут его бы не включил.
	 */
	it('оба признака стоят с первой отрисовки и значением false', () => {
		const dataset = new TScroller().dataset.toObject()

		expect(dataset['data-can-prev']).toBe('false')
		expect(dataset['data-can-next']).toBe('false')
	})

	it('замер переводит признаки в true', () => {
		const scroller = new TScroller()

		scroller.notifyViewport(viewport({ canPrev: true, canNext: true }))

		expect(scroller.dataset.get('data-can-prev')).toBe('true')
		expect(scroller.dataset.get('data-can-next')).toBe('true')
	})
})

describe('приём замера', () => {
	it('меняет значения и сообщает о каждом изменившемся факте', () => {
		const scroller = new TScroller()
		const prev = vi.fn()
		const next = vi.fn()
		const stops = vi.fn()

		scroller.events.on('change:canPrev', prev)
		scroller.events.on('change:canNext', next)
		scroller.events.on('change:hasTabStops', stops)

		scroller.notifyViewport(viewport({ canNext: true, hasTabStops: true }))

		expect(scroller.canPrev).toBe(false)
		expect(scroller.canNext).toBe(true)
		expect(scroller.hasTabStops).toBe(true)

		expect(prev).not.toHaveBeenCalled()
		expect(next).toHaveBeenCalledWith(true)
		expect(stops).toHaveBeenCalledWith(true)
	})

	/** Замер идёт каждый кадр прокрутки — повтор не обязан будить разметку. */
	it('повторный замер с теми же фактами молчит', () => {
		const scroller = new TScroller()
		const changed = vi.fn()

		scroller.notifyViewport(viewport({ canNext: true }))

		scroller.events.on('change:canPrev', changed)
		scroller.events.on('change:canNext', changed)
		scroller.events.on('change:hasTabStops', changed)

		scroller.notifyViewport(viewport({ canNext: true }))

		expect(changed).not.toHaveBeenCalled()
	})
})

describe('выключенность кнопок', () => {
	it('на своём краю гаснет только своя кнопка', () => {
		const scroller = new TScroller()

		scroller.notifyViewport(viewport({ canNext: true }))

		expect(scroller.prevDisabled).toBe(true)
		expect(scroller.nextDisabled).toBe(false)
	})

	/** Тема корень не гасит — выключенная лента обязана доехать до обеих кнопок. */
	it('выключенная лента гасит обе кнопки', () => {
		const scroller = new TScroller({ disabled: true })

		scroller.notifyViewport(viewport({ canPrev: true, canNext: true }))

		expect(scroller.prevDisabled).toBe(true)
		expect(scroller.nextDisabled).toBe(true)
	})
})

describe('tabindex вьюпорта', () => {
	it.each([
		[false, false, undefined],
		[false, true, undefined],
		[true, false, 0],
		[true, true, undefined],
	])(
		'листать есть куда — %s, свои остановки — %s',
		(scrollable: boolean, hasTabStops: boolean, expected: number | undefined) => {
			const scroller = new TScroller()

			scroller.notifyViewport(viewport({ canNext: scrollable, hasTabStops }))

			expect(scroller.viewportTabIndex).toBe(expected)
		},
	)
})

describe('команды', () => {
	/** Направление приходит запросом: где лента и на сколько её двигать, знает DOM. */
	it('просят листнуть в свою сторону', () => {
		const scroller = new TScroller()
		const requested: TScrollerDirection[] = []

		scroller.events.on('scroll:request', (direction) => requested.push(direction))
		scroller.notifyViewport(viewport({ canPrev: true, canNext: true }))

		scroller.scrollPrev()
		scroller.scrollNext()

		expect(requested).toEqual(['prev', 'next'])
	})

	it('на своём краю команда молчит', () => {
		const scroller = new TScroller()
		const requested = vi.fn()

		scroller.events.on('scroll:request', requested)
		scroller.notifyViewport(viewport({ canNext: true }))

		scroller.scrollPrev()

		expect(requested).not.toHaveBeenCalled()

		scroller.scrollNext()

		expect(requested).toHaveBeenCalledTimes(1)
	})

	it('выключенная лента не листается вовсе', () => {
		const scroller = new TScroller({ disabled: true })
		const requested = vi.fn()

		scroller.events.on('scroll:request', requested)
		scroller.notifyViewport(viewport({ canPrev: true, canNext: true }))

		scroller.scrollPrev()
		scroller.scrollNext()

		expect(requested).not.toHaveBeenCalled()
	})
})

describe('имена кнопок', () => {
	it('следуют за своим пропом', () => {
		const scroller = new TScroller()

		expect(scroller.prevAria).toEqual({ 'aria-label': 'Scroll back' })
		expect(scroller.nextAria).toEqual({ 'aria-label': 'Scroll forward' })

		scroller.prevLabel = 'Назад'
		scroller.nextLabel = 'Вперёд'

		expect(scroller.prevAria).toEqual({ 'aria-label': 'Назад' })
		expect(scroller.nextAria).toEqual({ 'aria-label': 'Вперёд' })
	})

	it('смена имени сообщается один раз', () => {
		const scroller = new TScroller()
		const changed = vi.fn()

		scroller.events.on('change:prevLabel', changed)

		scroller.prevLabel = 'Назад'
		scroller.prevLabel = 'Назад'

		expect(changed).toHaveBeenCalledTimes(1)
	})
})

describe('атрибуты вьюпорта от потребителя', () => {
	it('уходят наружу как есть и сообщают о смене', () => {
		const scroller = new TScroller()
		const changed = vi.fn()
		const role = { role: 'listbox' }

		scroller.events.on('change:viewportAria', changed)

		scroller.viewportAria = role

		expect(scroller.viewportAria).toBe(role)
		expect(changed).toHaveBeenCalledWith(role)

		scroller.viewportAria = role

		expect(changed).toHaveBeenCalledTimes(1)
	})
})
