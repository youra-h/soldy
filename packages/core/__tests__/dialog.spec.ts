import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TDialog, TFrame, TLayer, TCloseEvent, FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'
import type { TCloseReason } from '@soldy-ui/core'

/**
 * Модель модального окна: состояние и то, что из него следует для разметки.
 *
 * Фокус, Escape и Tab — модель фокуса, нажатие мимо — плагин оверлея, фон и
 * прокрутка — свои плагины; место, размер и разворот раскладывает тема, она же
 * гасит закрытое окно. Здесь только ядро: умолчания, ARIA окна и его частей,
 * модификатор места, `data-maximized`, `data-open`, слой в общем стеке и
 * запрос закрытия.
 */

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Показанное окно — закрывать нечего, пока оно скрыто. */
const shown = (props: ConstructorParameters<typeof TDialog>[0] = {}) =>
	new TDialog({ visible: true, ...props })

describe('умолчания', () => {
	it('скрыто, по центру, не развёрнуто, крестик есть, кнопки разворота нет', () => {
		const dialog = new TDialog()

		expect(dialog.visible).toBe(false)
		expect(dialog.target).toBe('body')
		expect(dialog.placement).toBe('center')
		expect(dialog.maximized).toBe(false)
		expect(dialog.maximizable).toBe(false)
		expect(dialog.closable).toBe(true)
		expect(dialog.closeLabel).toBe('Close')
		expect(dialog.maximizeLabel).toBe('Maximize')
		expect(dialog.dismissible).toBe(true)
		expect(dialog.alert).toBe(false)
	})

	it('размер не задан: ширину и высоту выбирает тема, а не `auto`', () => {
		const dialog = new TDialog()

		expect(dialog.width).toBeUndefined()
		expect(dialog.height).toBeUndefined()
		expect('width' in TDialog.defaultValues).toBe(true)
		expect('height' in TDialog.defaultValues).toBe(true)
	})

	it('отступ не задан: отступ темы, а не `0` — ноль значит «вплотную»', () => {
		const dialog = new TDialog()

		expect(dialog.offset).toBeUndefined()
		expect('offset' in TDialog.defaultValues).toBe(true)
		expect(dialog.getProps()).toHaveProperty('offset', undefined)
	})

	it('базовый класс s-dialog, корень — div', () => {
		const dialog = new TDialog()

		expect(dialog.tag).toBe('div')
		expect(dialog.classes.toArray()).toContain('s-dialog')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const props = {
			width: 480,
			height: '50vh',
			placement: 'end',
			offset: '5%',
			maximized: true,
			maximizable: true,
			closable: false,
			closeLabel: 'Закрыть',
			maximizeLabel: 'Развернуть',
			dismissible: false,
			alert: true,
			target: '#modals',
		} as const

		expect(new TDialog(props).getProps()).toMatchObject(props)
	})
})

describe('ARIA окна', () => {
	it('модальный диалог с именем от заголовка', () => {
		const dialog = new TDialog()
		const aria = dialog.aria.toObject()

		expect(aria.role).toBe('dialog')
		expect(aria['aria-modal']).toBe('true')
		expect(aria['aria-labelledby']).toBe(dialog.titleAria.id)
		expect(aria['aria-describedby']).toBeUndefined()
	})

	it('предупреждение — alertdialog, описание — тело окна', () => {
		const dialog = new TDialog({ alert: true })
		const aria = dialog.aria.toObject()

		expect(aria.role).toBe('alertdialog')
		expect(aria['aria-describedby']).toBe(dialog.bodyAria.id)
		expect(aria['aria-labelledby']).toBe(dialog.titleAria.id)
	})

	it('alert на лету меняет роль и описание, change:alert — только на смену', () => {
		const dialog = new TDialog()
		const changes: boolean[] = []

		dialog.events.on('change:alert', (value) => changes.push(value))

		dialog.alert = true
		dialog.alert = true

		expect(dialog.aria.get('role')).toBe('alertdialog')
		expect(dialog.aria.get('aria-describedby')).toBe(dialog.bodyAria.id)

		dialog.alert = false

		expect(dialog.aria.get('role')).toBe('dialog')
		expect(dialog.aria.has('aria-describedby')).toBe(false)
		expect(changes).toEqual([true, false])
	})

	it('id заголовка и тела разные, у двух окон — тоже', () => {
		const first = new TDialog()
		const second = new TDialog()

		expect(first.titleAria.id).toMatch(/^s-dialog-title-\d+$/)
		expect(first.bodyAria.id).toMatch(/^s-dialog-body-\d+$/)
		expect(first.titleAria.id).not.toBe(first.bodyAria.id)
		expect(first.titleAria.id).not.toBe(second.titleAria.id)
	})
})

describe('кнопки', () => {
	it('крестик назван closeLabel', () => {
		const dialog = new TDialog()

		expect(dialog.closeAria).toEqual({ 'aria-label': 'Close' })

		dialog.closeLabel = 'Закрыть'

		expect(dialog.closeAria).toEqual({ 'aria-label': 'Закрыть' })
	})

	it('кнопка разворота — переключатель: имя одно, состояние в aria-pressed', () => {
		const dialog = new TDialog({ maximizeLabel: 'Развернуть' })

		expect(dialog.maximizeAria).toEqual({
			'aria-label': 'Развернуть',
			'aria-pressed': 'false',
		})

		dialog.toggleMaximized()

		expect(dialog.maximizeAria).toEqual({
			'aria-label': 'Развернуть',
			'aria-pressed': 'true',
		})
	})

	it('выходы — новые объекты на каждое чтение, а не ручка на состояние', () => {
		const dialog = new TDialog()

		expect(dialog.maximizeAria).not.toBe(dialog.maximizeAria)
		expect(dialog.backdropDataset).not.toBe(dialog.backdropDataset)
	})
})

describe('место', () => {
	it('модификатор стоит всегда, и у центра', () => {
		expect(new TDialog().classes.toArray()).toContain('s-dialog--placement-center')
		expect(new TDialog({ placement: 'top' }).classes.toArray()).toContain(
			's-dialog--placement-top',
		)
	})

	it('смена места меняет модификатор, а не добавляет второй', () => {
		const dialog = new TDialog()
		const changes: string[] = []

		dialog.events.on('change:placement', (value) => changes.push(value))

		dialog.placement = 'start'
		dialog.placement = 'start'

		const placements = dialog.classes.toArray().filter((cls) => cls.includes('--placement-'))

		expect(placements).toEqual(['s-dialog--placement-start'])
		expect(changes).toEqual(['start'])
	})
})

describe('отступ', () => {
	it('число, строка и 0 — значения, undefined снимает; change:offset только на смену', () => {
		const dialog = new TDialog()
		const offsets: (number | string | undefined)[] = []

		dialog.events.on('change:offset', (value) => offsets.push(value))

		dialog.offset = 24
		dialog.offset = 24
		dialog.offset = '5%'
		dialog.offset = 0
		dialog.offset = undefined
		dialog.offset = undefined

		expect(offsets).toEqual([24, '5%', 0, undefined])
		expect(dialog.offset).toBeUndefined()
	})

	it('getProps отдаёт отступ', () => {
		const dialog = new TDialog({ offset: 0 })

		expect(dialog.getProps().offset).toBe(0)

		dialog.offset = '2rem'

		expect(dialog.getProps().offset).toBe('2rem')
	})

	it('отрицательное число — значение, а не «отступ темы»: не задан — это undefined', () => {
		expect(new TDialog({ offset: -1 }).offset).toBe(-1)
	})
})

describe('разворот', () => {
	it('data-maximized — false и true, а не отсутствие атрибута', () => {
		const dialog = new TDialog()

		expect(dialog.dataset.get('maximized')).toBe('false')

		dialog.maximized = true

		expect(dialog.dataset.get('maximized')).toBe('true')
	})

	it('toggleMaximized переключает туда и обратно, change:maximized на каждый шаг', () => {
		const dialog = new TDialog()
		const changes: boolean[] = []

		dialog.events.on('change:maximized', (value) => changes.push(value))

		dialog.toggleMaximized()
		dialog.toggleMaximized()

		expect(dialog.maximized).toBe(false)
		expect(changes).toEqual([true, false])
	})

	it('запись того же значения событий не шлёт', () => {
		const dialog = new TDialog()
		const handler = vi.fn()

		dialog.events.on('change:maximized', handler)
		dialog.events.on('change:maximizable', handler)
		dialog.events.on('change:width', handler)

		dialog.maximized = false
		dialog.maximizable = false
		dialog.width = undefined

		expect(handler).not.toHaveBeenCalled()
	})
})

describe('размер', () => {
	it('ширина и высота — число или CSS-значение, снимаются undefined', () => {
		const dialog = new TDialog()
		const widths: (number | string | undefined)[] = []

		dialog.events.on('change:width', (value) => widths.push(value))

		dialog.width = 640
		dialog.width = '40rem'
		dialog.width = undefined

		expect(widths).toEqual([640, '40rem', undefined])
	})
})

describe('открытость для темы', () => {
	/**
	 * Появление и исчезание — CSS темы: закрытое окно и подложку она гасит по
	 * `data-open`, и переходу до скрытия есть к чему идти. У подложки
	 * экземпляра нет — ту же открытость ей отдаёт выход `backdropDataset`.
	 */
	it('data-open у окна и подложки — false и true вслед за visible', () => {
		const dialog = new TDialog()

		expect(dialog.dataset.get('open')).toBe('false')
		expect(dialog.backdropDataset['data-open']).toBe('false')

		dialog.show()

		expect(dialog.dataset.get('open')).toBe('true')
		expect(dialog.backdropDataset['data-open']).toBe('true')

		dialog.visible = false

		expect(dialog.dataset.get('open')).toBe('false')
		expect(dialog.backdropDataset['data-open']).toBe('false')
	})

	it('созданное видимым — data-open сразу true, у подложки тоже', () => {
		const dialog = shown()

		expect(dialog.dataset.get('open')).toBe('true')
		expect(dialog.backdropDataset['data-open']).toBe('true')
	})

	/** Иначе тема погасила бы окно, которое осталось открытым. */
	it('отменённое скрытие data-open не трогает', () => {
		const dialog = shown()

		dialog.events.on('hide:before', (event) => event.preventDefault())
		dialog.hide()

		expect(dialog.visible).toBe(true)
		expect(dialog.dataset.get('open')).toBe('true')
		expect(dialog.backdropDataset['data-open']).toBe('true')
	})
})

describe('слой', () => {
	it('скрытое окно слоя не получает', () => {
		const dialog = new TDialog()

		expect(dialog.zIndex).toBe(0)
		expect(dialog.dataset.has(FRAME_LAYER_ATTRIBUTE)).toBe(false)
		expect(dialog.backdropDataset).toEqual({ 'data-open': 'false' })
	})

	it('показанное — номер слоя в zIndex и data-layer, у подложки тот же', () => {
		const dialog = new TDialog()

		dialog.show()

		expect(dialog.zIndex).toBeGreaterThan(0)
		expect(dialog.dataset.get(FRAME_LAYER_ATTRIBUTE)).toBe(String(dialog.zIndex))
		expect(dialog.backdropDataset).toEqual({
			[FRAME_LAYER_ATTRIBUTE]: String(dialog.zIndex),
			'data-open': 'true',
		})
	})

	it('созданное видимым получает слой сразу', () => {
		const dialog = shown()

		expect(dialog.zIndex).toBeGreaterThan(0)
		expect(dialog.backdropDataset[FRAME_LAYER_ATTRIBUTE]).toBe(String(dialog.zIndex))
	})

	it('повторный показ поднимает окно и его подложку', () => {
		const dialog = new TDialog()

		dialog.show()

		const first = dialog.zIndex

		dialog.hide()
		dialog.show()

		expect(dialog.zIndex).toBeGreaterThan(first)
		expect(dialog.backdropDataset[FRAME_LAYER_ATTRIBUTE]).toBe(String(dialog.zIndex))
	})

	/**
	 * Стек один: список Select, открытый из окна, — Frame, и его номер обязан
	 * быть выше номера окна. Два счётчика выдали бы им один номер.
	 */
	it('стек общий с Frame: показанный позже — выше, кто бы он ни был', () => {
		const dialog = new TDialog()
		const list = new TFrame()
		const nested = new TDialog()

		dialog.show()
		list.show()
		nested.show()

		expect(list.zIndex).toBeGreaterThan(dialog.zIndex)
		expect(nested.zIndex).toBeGreaterThan(list.zIndex)
	})
})

describe('запрос закрытия', () => {
	it('закрывает и шлёт close:before с причиной до закрытия', () => {
		const dialog = shown()
		const seen: [TCloseReason, boolean][] = []

		dialog.events.on('close:before', (event) => seen.push([event.reason, dialog.visible]))

		dialog.requestClose('escape')

		expect(seen).toEqual([['escape', true]])
		expect(dialog.visible).toBe(false)
	})

	it.each<TCloseReason>(['button', 'outside', 'escape'])(
		'причина %s доходит как есть',
		(reason) => {
			const dialog = shown()
			const reasons: TCloseReason[] = []

			dialog.events.on('close:before', (event) => reasons.push(event.reason))
			dialog.requestClose(reason)

			expect(reasons).toEqual([reason])
		},
	)

	it('аргумент — TCloseEvent: отменяемое событие действия', () => {
		const dialog = shown()
		const handler = vi.fn()

		dialog.events.on('close:before', handler)
		dialog.requestClose('button')

		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(TCloseEvent)
	})

	it('preventDefault оставляет окно открытым', () => {
		const dialog = shown()
		const hide = vi.fn()

		dialog.events.on('close:before', (event) => event.preventDefault())
		dialog.events.on('hide:before', hide)

		dialog.requestClose('button')

		expect(dialog.visible).toBe(true)
		expect(hide).not.toHaveBeenCalled()
	})

	it('«закрыть только Escape» — отмена по причине', () => {
		const dialog = shown()

		dialog.events.on('close:before', (event) => {
			if (event.reason === 'outside') event.preventDefault()
		})

		dialog.requestClose('outside')

		expect(dialog.visible).toBe(true)

		dialog.requestClose('escape')

		expect(dialog.visible).toBe(false)
	})

	describe('dismissible: false', () => {
		it('нажатие мимо и Escape отклоняются без события', () => {
			const dialog = shown({ dismissible: false })
			const handler = vi.fn()

			dialog.events.on('close:before', handler)

			dialog.requestClose('outside')
			dialog.requestClose('escape')

			expect(dialog.visible).toBe(true)
			expect(handler).not.toHaveBeenCalled()
		})

		it('кнопка закрывает — через close:before', () => {
			const dialog = shown({ dismissible: false })
			const reasons: TCloseReason[] = []

			dialog.events.on('close:before', (event) => reasons.push(event.reason))
			dialog.requestClose('button')

			expect(dialog.visible).toBe(false)
			expect(reasons).toEqual(['button'])
		})
	})

	it('запись visible = false — не запрос: close:before не приходит', () => {
		const dialog = shown()
		const handler = vi.fn()

		dialog.events.on('close:before', handler)
		dialog.visible = false

		expect(dialog.visible).toBe(false)
		expect(handler).not.toHaveBeenCalled()
	})

	it('скрытое окно закрывать нечего: события нет', () => {
		const dialog = new TDialog()
		const handler = vi.fn()

		dialog.events.on('close:before', handler)
		dialog.requestClose('button')

		expect(handler).not.toHaveBeenCalled()
	})

	it('hide:before по-прежнему может отменить скрытие и после запроса', () => {
		const dialog = shown()

		dialog.events.on('hide:before', (event) => event.preventDefault())
		dialog.requestClose('button')

		expect(dialog.visible).toBe(true)
	})
})
