import { describe, it, expect, vi } from 'vitest'
import { TPopover } from '@soldy-ui/core'

/**
 * Модель Popover: состояние панели и то, что из него следует для разметки.
 *
 * Фокус, Escape, Tab и клик по триггеру — плагины, нажатие мимо — плагин
 * оверлея; здесь только ядро: умолчания, связка «триггер ↔ панель» с обеих
 * сторон и выходы, которые разметка раскладывает как есть.
 */

describe('умолчания', () => {
	it('закрыт, закрывается крестиком, содержимое смонтировано, панель снизу по началу', () => {
		const popover = new TPopover()

		expect(popover.open).toBe(false)
		expect(popover.closable).toBe(true)
		expect(popover.closeLabel).toBe('Close')
		expect(popover.lazyMount).toBe(false)
		expect(popover.placement).toBe('bottom-start')
		expect(popover.contentRendered).toBe(true)
	})

	it('корень строчный — span, базовый класс s-popover', () => {
		const popover = new TPopover()

		expect(popover.tag).toBe('span')
		expect(popover.classes.toArray()).toContain('s-popover')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const popover = new TPopover({
			open: true,
			closable: false,
			closeLabel: 'Закрыть',
			lazyMount: true,
			placement: 'top-end',
		})

		expect(popover.getProps()).toMatchObject({
			open: true,
			closable: false,
			closeLabel: 'Закрыть',
			lazyMount: true,
			placement: 'top-end',
		})
	})
})

describe('связка «триггер ↔ панель»', () => {
	it('панель — диалог с id', () => {
		const aria = new TPopover().aria.toObject()

		expect(aria.role).toBe('dialog')
		expect(aria.id).toMatch(/^s-popover-panel-\d+$/)
	})

	it('aria-controls триггера совпадает с id панели', () => {
		const popover = new TPopover()

		expect(popover.triggerAria['aria-controls']).toBe(popover.aria.get('id'))
	})

	it('у двух поповеров id разные', () => {
		expect(new TPopover().aria.get('id')).not.toBe(new TPopover().aria.get('id'))
	})

	it('триггер объявляет диалог и открытость', () => {
		const popover = new TPopover()

		expect(popover.triggerAria).toMatchObject({
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
		})

		popover.open = true

		expect(popover.triggerAria['aria-expanded']).toBe('true')
	})

	it('aria-controls стоит и у закрытой панели — она всегда в документе', () => {
		expect(new TPopover().triggerAria['aria-controls']).toBeTruthy()
	})
})

describe('data-* для темы', () => {
	it('data-open на корне следует за open', () => {
		const popover = new TPopover()

		expect(popover.dataset.get('open')).toBe('false')

		popover.open = true

		expect(popover.dataset.get('open')).toBe('true')
	})

	it('открытый триггер — data-selected, отдельным набором от ARIA', () => {
		const popover = new TPopover()

		expect(popover.triggerDataset).toEqual({ 'data-selected': 'false' })

		popover.open = true

		expect(popover.triggerDataset).toEqual({ 'data-selected': 'true' })
		expect(popover.triggerAria).not.toHaveProperty('data-selected')
	})

	it('в aria панели нет data-*, в dataset корня нет aria-*', () => {
		const popover = new TPopover({ open: true })

		expect(Object.keys(popover.aria.toObject()).some((name) => name.startsWith('data-'))).toBe(
			false,
		)
		expect(
			Object.keys(popover.dataset.toObject()).some((name) => name.startsWith('aria-')),
		).toBe(false)
	})
})

describe('кнопка закрытия', () => {
	it('имя — closeLabel', () => {
		const popover = new TPopover({ closeLabel: 'Закрыть' })

		expect(popover.closeAria).toEqual({ 'aria-label': 'Закрыть' })

		popover.closeLabel = 'Скрыть'

		expect(popover.closeAria).toEqual({ 'aria-label': 'Скрыть' })
	})
})

describe('lazyMount', () => {
	it('содержимое не смонтировано, пока панель не открывали', () => {
		const popover = new TPopover({ lazyMount: true })

		expect(popover.contentRendered).toBe(false)

		popover.open = true

		expect(popover.contentRendered).toBe(true)
	})

	it('после первого открытия закрытие содержимое не прячет', () => {
		const popover = new TPopover({ lazyMount: true })

		popover.open = true
		popover.open = false

		expect(popover.contentRendered).toBe(true)
	})

	it('открытый со старта — содержимое уже смонтировано', () => {
		expect(new TPopover({ lazyMount: true, open: true }).contentRendered).toBe(true)
	})

	it('снятый lazyMount монтирует содержимое сразу', () => {
		const popover = new TPopover({ lazyMount: true })

		popover.lazyMount = false

		expect(popover.contentRendered).toBe(true)
	})
})

describe('события', () => {
	it('change:open — один раз на изменение, с новым значением', () => {
		const popover = new TPopover()
		const handler = vi.fn()

		popover.events.on('change:open', handler)

		popover.open = true
		popover.open = true
		popover.open = false
		popover.open = false

		expect(handler.mock.calls).toEqual([[true], [false]])
	})

	it.each([
		['closable', 'change:closable', false],
		['closeLabel', 'change:closeLabel', 'Закрыть'],
		['lazyMount', 'change:lazyMount', true],
		['placement', 'change:placement', 'top-start'],
	] as const)('%s шлёт %s только на реальное изменение', (prop, event, value) => {
		const popover = new TPopover()
		const handler = vi.fn()

		popover.events.on(event, handler)

		Reflect.set(popover, prop, value)
		Reflect.set(popover, prop, value)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(value)
	})

	it('выходы — новые значения на каждое чтение, а не ручка на состояние', () => {
		const popover = new TPopover()

		expect(popover.triggerAria).not.toBe(popover.triggerAria)
		expect(popover.triggerDataset).not.toBe(popover.triggerDataset)
		expect(popover.closeAria).not.toBe(popover.closeAria)
	})
})
