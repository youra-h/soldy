import { describe, it, expect, vi } from 'vitest'
import { TPopover, isSwipeable } from '@soldy-ui/core'

/**
 * Модель Popover: состояние панели и то, что из него следует для разметки.
 *
 * Фокус, Escape, Tab и клик по триггеру — плагины, нажатие мимо и жест —
 * плагины оверлея; здесь только ядро: умолчания, связка «триггер ↔ панель» с
 * обеих сторон, значения жеста и выходы, которые разметка раскладывает как
 * есть.
 */

describe('умолчания', () => {
	it('закрыт, закрывается крестиком, содержимое смонтировано, панель снизу по началу', () => {
		const popover = new TPopover()

		expect(popover.open).toBe(false)
		expect(popover.closable).toBe(true)
		expect(popover.lazyMount).toBe(false)
		expect(popover.placement).toBe('bottom-start')
		expect(popover.contained).toBe(false)
		expect(popover.edge).toBe('bottom')
		expect(popover.swipe).toBe('none')
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
			lazyMount: true,
			placement: 'top-end',
			contained: true,
			edge: 'top',
			swipe: 'handle',
		})

		expect(popover.getProps()).toMatchObject({
			open: true,
			closable: false,
			lazyMount: true,
			placement: 'top-end',
			contained: true,
			edge: 'top',
			swipe: 'handle',
		})
	})
})

describe('связка «триггер ↔ панель»', () => {
	// `id` панели и `aria-controls` триггера ядро не пишет: `id` нужны
	// документу, их пишет `TPopoverIdsPlugin` (plugins, ids.plugin.spec)
	it('панель — диалог, без id', () => {
		const aria = new TPopover().aria.toObject()

		expect(aria.role).toBe('dialog')
		expect(aria).not.toHaveProperty('id')
	})

	it('триггер объявляет диалог и открытость', () => {
		const popover = new TPopover()

		expect(popover.triggerAria.toObject()).toEqual({
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
		})

		popover.open = true

		expect(popover.triggerAria.get('aria-expanded')).toBe('true')
	})

	it('change:triggerAria — на смену набора триггера', () => {
		const popover = new TPopover()
		const changes: unknown[] = []

		popover.events.on('change:triggerAria', (value) => changes.push(value))
		popover.open = true

		expect(changes).toEqual([{ 'aria-haspopup': 'dialog', 'aria-expanded': 'true' }])
	})
})

describe('data-* для темы', () => {
	it('data-open на корне следует за open', () => {
		const popover = new TPopover()

		expect(popover.dataset.get('open')).toBe('false')

		popover.open = true

		expect(popover.dataset.get('open')).toBe('true')
	})

	// Панель телепортирована, и `data-open` корня до неё не доходит. Свой у неё
	// — от слоя: открытость панели — это видимость её Frame. Второй писатель
	// атрибута разошёлся бы с ним, поэтому в наборе панели его нет
	it('data-open в наборе панели нет — его пишет её слой', () => {
		const popover = new TPopover()

		expect(popover.panelDataset).toEqual({ 'data-swiping': 'false' })

		popover.open = true

		expect(popover.panelDataset).toEqual({ 'data-swiping': 'false' })
	})

	it('открытый триггер — data-selected, отдельным набором от ARIA', () => {
		const popover = new TPopover()

		expect(popover.triggerDataset).toEqual({ 'data-selected': 'false' })

		popover.open = true

		expect(popover.triggerDataset).toEqual({ 'data-selected': 'true' })
		expect(popover.triggerAria.toObject()).not.toHaveProperty('data-selected')
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
	it('имени ядро не строит: набор пуст, имя пишет плагин имён', () => {
		expect(new TPopover().closeAria.valueOf()).toEqual({})
	})

	it('набор живой: запись — change:closeAria со снимком', () => {
		const popover = new TPopover()
		const changes = vi.fn()

		popover.events.on('change:closeAria', changes)
		popover.closeAria.add('aria-label', 'Закрыть')

		expect(changes).toHaveBeenCalledWith({ 'aria-label': 'Закрыть' })
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
		['lazyMount', 'change:lazyMount', true],
		['placement', 'change:placement', 'top-start'],
		['contained', 'change:contained', true],
		['edge', 'change:edge', 'start'],
		['swipe', 'change:swipe', 'panel'],
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

		expect(popover.triggerAria.valueOf()).not.toBe(popover.triggerAria.valueOf())
		expect(popover.triggerDataset).not.toBe(popover.triggerDataset)
		expect(popover.closeAria.valueOf()).not.toBe(popover.closeAria.valueOf())
		expect(popover.panelDataset).not.toBe(popover.panelDataset)
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Тянет плагин жеста, ядро держит
 * значения: за что тянуть, куда панель уходит и признак «тянут».
 */
describe('жест', () => {
	/** Открытый поповер: закрытый не тянут. */
	const shown = (props: ConstructorParameters<typeof TPopover>[0] = {}) =>
		new TPopover({ open: true, ...props })

	it('смахиваемый слой: контракт жеста узнаётся тип-гардом', () => {
		expect(isSwipeable(new TPopover())).toBe(true)
	})

	it('куда уходит: у триггера сторону решает якорь (null), внутри контейнера — к краю', () => {
		const popover = new TPopover()
		const sides: unknown[] = []

		popover.events.on('change:swipeSide', (side) => sides.push(side))

		expect(popover.swipeSide).toBeNull()

		popover.contained = true

		expect(popover.swipeSide).toBe('bottom')

		popover.edge = 'top'

		expect(popover.swipeSide).toBe('top')

		popover.contained = false

		expect(sides).toEqual(['bottom', 'top', null])
	})

	it('край у панели у триггера стороны ухода не меняет', () => {
		const popover = new TPopover()
		const sides = vi.fn()

		popover.events.on('change:swipeSide', sides)
		popover.edge = 'start'

		expect(popover.swipeSide).toBeNull()
		expect(sides).not.toHaveBeenCalled()
	})

	it('край — в data-edge панели, только внутри контейнера', () => {
		const popover = new TPopover({ edge: 'end' })

		expect(popover.panelDataset).not.toHaveProperty('data-edge')

		popover.contained = true

		expect(popover.panelDataset).toEqual({
			'data-swiping': 'false',
			'data-edge': 'end',
		})

		popover.edge = 'top'

		expect(popover.panelDataset['data-edge']).toBe('top')
	})

	it('полосу рисуют, пока жест включён', () => {
		const popover = new TPopover()

		expect(popover.handleRendered).toBe(false)

		popover.swipe = 'handle'

		expect(popover.handleRendered).toBe(true)

		popover.swipe = 'panel'

		expect(popover.handleRendered).toBe(true)
	})

	it('beginSwipe: data-swiping панели и change:swiping, endSwipe — назад', () => {
		const popover = shown({ swipe: 'handle' })
		const changes: boolean[] = []

		popover.events.on('change:swiping', (value) => changes.push(value))

		expect(popover.panelDataset['data-swiping']).toBe('false')
		expect(popover.beginSwipe()).toBe(true)
		expect(popover.swiping).toBe(true)
		expect(popover.panelDataset['data-swiping']).toBe('true')

		popover.endSwipe()

		expect(popover.swiping).toBe(false)
		expect(changes).toEqual([true, false])
	})

	it('признак «тянут» — у панели, а не у корня: dataset корня его не несёт', () => {
		const popover = shown({ swipe: 'handle' })

		popover.beginSwipe()

		expect(popover.dataset.has('swiping')).toBe(false)
	})

	it('без жеста и у закрытой панели жест не начинается', () => {
		expect(shown().beginSwipe()).toBe(false)
		expect(new TPopover({ swipe: 'panel' }).beginSwipe()).toBe(false)
	})

	it('закрытие и выключенный жест кончают начатый жест', () => {
		const closed = shown({ swipe: 'panel' })

		closed.beginSwipe()
		closed.open = false

		expect(closed.swiping).toBe(false)

		const switched = shown({ swipe: 'panel' })

		switched.beginSwipe()
		switched.swipe = 'none'

		expect(switched.swiping).toBe(false)
		expect(switched.panelDataset['data-swiping']).toBe('false')
	})
})
