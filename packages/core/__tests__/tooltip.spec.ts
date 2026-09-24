import { describe, it, expect, vi } from 'vitest'
import { TTooltip } from '@soldy-ui/core'

/**
 * Модель Tooltip: состояние подсказки и то, что из него следует для разметки.
 *
 * Когда показывать и прятать — наведение, фокус, нажатие, Escape — плагин,
 * нажатие мимо — плагин оверлея; здесь только ядро: умолчания, связка
 * «триггер ↔ панель» с обеих сторон и события на смену значений.
 */

describe('умолчания', () => {
	it('закрыта, над триггером по началу, 400 мс до показа и 150 до скрытия', () => {
		const tooltip = new TTooltip()

		expect(tooltip.open).toBe(false)
		expect(tooltip.placement).toBe('top-start')
		expect(tooltip.openDelay).toBe(400)
		expect(tooltip.closeDelay).toBe(150)
	})

	it('корень строчный — span, базовый класс s-tooltip', () => {
		const tooltip = new TTooltip()

		expect(tooltip.tag).toBe('span')
		expect(tooltip.classes.toArray()).toContain('s-tooltip')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const tooltip = new TTooltip({
			open: true,
			placement: 'bottom-end',
			openDelay: 0,
			closeDelay: 1000,
		})

		expect(tooltip.getProps()).toMatchObject({
			open: true,
			placement: 'bottom-end',
			openDelay: 0,
			closeDelay: 1000,
		})
	})
})

describe('связка «триггер ↔ панель»', () => {
	it('панель — подсказка с id и без имени: её текст и есть описание', () => {
		const aria = new TTooltip().aria.toObject()

		expect(aria.role).toBe('tooltip')
		expect(aria.id).toMatch(/^s-tooltip-panel-\d+$/)
		expect(aria).not.toHaveProperty('aria-label')
	})

	it('триггер ссылается на панель aria-describedby — тем же id', () => {
		const tooltip = new TTooltip()

		expect(tooltip.triggerAria).toEqual({ 'aria-describedby': tooltip.aria.get('id') })
	})

	it('ссылка стоит и у закрытой подсказки, и у открытой: панель всегда в документе', () => {
		const tooltip = new TTooltip()
		const closed = tooltip.triggerAria

		tooltip.open = true

		expect(closed['aria-describedby']).toBeTruthy()
		expect(tooltip.triggerAria).toEqual(closed)
	})

	it('у двух подсказок id разные', () => {
		expect(new TTooltip().aria.get('id')).not.toBe(new TTooltip().aria.get('id'))
	})

	it('теме состояние не отдаётся: ни data-* на корне, ни ARIA', () => {
		const tooltip = new TTooltip({ open: true })

		expect(tooltip.dataset.toObject()).toEqual({})
		expect(Object.keys(tooltip.aria.toObject()).sort()).toEqual(['id', 'role'])
	})
})

describe('события', () => {
	it('change:open — один раз на изменение, с новым значением', () => {
		const tooltip = new TTooltip()
		const handler = vi.fn()

		tooltip.events.on('change:open', handler)

		tooltip.open = true
		tooltip.open = true
		tooltip.open = false
		tooltip.open = false

		expect(handler.mock.calls).toEqual([[true], [false]])
	})

	it.each([
		['placement', 'change:placement', 'bottom-start'],
		['openDelay', 'change:openDelay', 700],
		['closeDelay', 'change:closeDelay', 0],
	] as const)('%s шлёт %s только на реальное изменение', (prop, event, value) => {
		const tooltip = new TTooltip()
		const handler = vi.fn()

		tooltip.events.on(event, handler)

		Reflect.set(tooltip, prop, value)
		Reflect.set(tooltip, prop, value)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(value)
	})

	it('триггер получает новое значение на каждое чтение, а не ручку на состояние', () => {
		const tooltip = new TTooltip()

		expect(tooltip.triggerAria).not.toBe(tooltip.triggerAria)
	})
})
