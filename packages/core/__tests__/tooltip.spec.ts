import { describe, it, expect, vi } from 'vitest'
import { TTooltip } from '@soldy-ui/core'

/**
 * Модель Tooltip: состояние подсказки и то, что из него следует для разметки.
 *
 * Когда показывать и прятать — наведение, фокус, нажатие, Escape — плагин,
 * нажатие мимо — плагин оверлея, `id` связки — плагин связок; здесь только
 * ядро: умолчания, роль панели, набор триггера и события на смену значений.
 */

describe('умолчания', () => {
	it('закрыта, над триггером по центру, 400 мс до показа и 150 до скрытия', () => {
		const tooltip = new TTooltip()

		expect(tooltip.open).toBe(false)
		expect(tooltip.placement).toBe('top')
		expect(tooltip.openDelay).toBe(400)
		expect(tooltip.closeDelay).toBe(150)
	})

	it('подсказка — описание триггера, как в паттерне APG', () => {
		expect(new TTooltip().type).toBe('description')
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
			type: 'label',
		})

		expect(tooltip.getProps()).toMatchObject({
			open: true,
			placement: 'bottom-end',
			openDelay: 0,
			closeDelay: 1000,
			type: 'label',
		})
	})
})

/**
 * `id` панели и ссылку триггера на него ядро не пишет: `id` нужны документу,
 * их пишет `TTooltipIdsPlugin` по режиму (plugins, ids.plugin.spec). У ядра —
 * роль панели и набор триггера, в который плагин пишет.
 */
describe('связка «триггер ↔ панель»', () => {
	it('панель — подсказка без имени и без id: её текст и есть описание', () => {
		expect(new TTooltip().aria.toObject()).toEqual({ role: 'tooltip' })
	})

	it('набор триггера у ядра пуст: ссылку пишет плагин', () => {
		expect(new TTooltip().triggerAria.toObject()).toEqual({})
	})

	it.each(['description', 'label'] as const)(
		'теме состояние не отдаётся: ни data-* на корне, ни ARIA (%s)',
		(type) => {
			const tooltip = new TTooltip({ open: true, type })

			expect(tooltip.dataset.toObject()).toEqual({})
			expect(Object.keys(tooltip.aria.toObject())).toEqual(['role'])
		},
	)

	it('панель от режима не зависит', () => {
		const tooltip = new TTooltip()
		const described = tooltip.aria.toObject()

		tooltip.type = 'label'

		expect(tooltip.aria.toObject()).toEqual(described)
	})

	it('change:triggerAria — на смену набора триггера', () => {
		const tooltip = new TTooltip()
		const handler = vi.fn()

		tooltip.events.on('change:triggerAria', handler)
		tooltip.triggerAria.add('aria-describedby', 'panel')

		expect(handler).toHaveBeenCalledWith({ 'aria-describedby': 'panel' })
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
		['type', 'change:type', 'label'],
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

		expect(tooltip.triggerAria.valueOf()).not.toBe(tooltip.triggerAria.valueOf())
	})
})
