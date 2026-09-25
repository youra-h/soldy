import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	TDialog,
	TDrawer,
	TLayer,
	TModalLayer,
	TCloseEvent,
	FRAME_LAYER_ATTRIBUTE,
} from '@soldy-ui/core'
import type { TCloseReason } from '@soldy-ui/core'

/**
 * Модель выезжающей панели: состояние и то, что из него следует для разметки.
 *
 * Модальность — роль, имя от заголовка, кнопку и запрос закрытия — панель
 * делит с окном (`TModalLayer`, см. `dialog.spec.ts`); здесь её край, жест,
 * место в документе и то, что они меняют в общем: жест закрывает запросом, а
 * замок прокрутки зависит от места. Тянет панель плагин жеста, раскладывает
 * и анимирует — тема.
 */

beforeEach(() => {
	TLayer.resetZIndexCounter()
})

/** Показанная панель — закрывать и тянуть нечего, пока она скрыта. */
const shown = (props: ConstructorParameters<typeof TDrawer>[0] = {}) =>
	new TDrawer({ visible: true, ...props })

describe('умолчания', () => {
	it('скрыта, у конца строки, без жеста, поверх страницы, крестик есть', () => {
		const drawer = new TDrawer()

		expect(drawer.visible).toBe(false)
		expect(drawer.target).toBe('body')
		expect(drawer.placement).toBe('end')
		expect(drawer.swipe).toBe('none')
		expect(drawer.contained).toBe(false)
		expect(drawer.closable).toBe(true)
		expect(drawer.closeLabel).toBe('Close')
		expect(drawer.dismissible).toBe(true)
		expect(drawer.width).toBeUndefined()
		expect(drawer.height).toBeUndefined()
	})

	it('базовый класс s-drawer, корень — div', () => {
		const drawer = new TDrawer()

		expect(drawer.tag).toBe('div')
		expect(drawer.classes.toArray()).toContain('s-drawer')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const props = {
			width: 360,
			height: '40vh',
			placement: 'bottom',
			swipe: 'panel',
			contained: true,
			closable: false,
			closeLabel: 'Закрыть',
			dismissible: false,
			target: '#drawers',
		} as const

		expect(new TDrawer(props).getProps()).toMatchObject(props)
	})

	it('модальный слой, как окно: общая база и общий стек', () => {
		const dialog = new TDialog()
		const drawer = new TDrawer()

		expect(drawer).toBeInstanceOf(TModalLayer)
		expect(dialog).toBeInstanceOf(TModalLayer)

		dialog.show()
		drawer.show()

		expect(drawer.zIndex).toBeGreaterThan(dialog.zIndex)
	})
})

describe('ARIA', () => {
	it('модальный диалог с именем от заголовка', () => {
		const drawer = new TDrawer()
		const aria = drawer.aria.toObject()

		expect(aria.role).toBe('dialog')
		expect(aria['aria-modal']).toBe('true')
		expect(aria['aria-labelledby']).toBe(drawer.titleAria.id)
	})

	it('модальна и внутри контейнера', () => {
		const drawer = new TDrawer({ contained: true })

		expect(drawer.aria.get('aria-modal')).toBe('true')
	})

	it('id заголовка — по блоку панели и её uid', () => {
		const first = new TDrawer()
		const second = new TDrawer()

		expect(first.titleAria.id).toMatch(/^s-drawer-title-\d+$/)
		expect(first.titleAria.id).not.toBe(second.titleAria.id)
	})

	it('крестик назван closeLabel', () => {
		const drawer = new TDrawer({ closeLabel: 'Закрыть' })

		expect(drawer.closeAria).toEqual({ 'aria-label': 'Закрыть' })
	})
})

describe('край', () => {
	it('модификатор стоит всегда, смена меняет его, а не добавляет второй', () => {
		const drawer = new TDrawer()
		const changes: string[] = []

		drawer.events.on('change:placement', (value) => changes.push(value))

		expect(drawer.classes.toArray()).toContain('s-drawer--placement-end')

		drawer.placement = 'bottom'
		drawer.placement = 'bottom'

		const placements = drawer.classes.toArray().filter((cls) => cls.includes('--placement-'))

		expect(placements).toEqual(['s-drawer--placement-bottom'])
		expect(changes).toEqual(['bottom'])
	})
})

describe('открытость для темы', () => {
	/**
	 * Выезд и въезд — CSS темы: закрытую панель она уводит за край по
	 * `data-open`, и переходу до скрытия есть к чему идти.
	 */
	it('data-open — false и true вслед за visible', () => {
		const drawer = new TDrawer()

		expect(drawer.dataset.get('open')).toBe('false')

		drawer.show()

		expect(drawer.dataset.get('open')).toBe('true')

		drawer.hide()

		expect(drawer.dataset.get('open')).toBe('false')
	})

	it('созданная видимой — data-open сразу true', () => {
		expect(shown().dataset.get('open')).toBe('true')
	})
})

describe('подложка', () => {
	it('скрытая: слоя нет, открытость и место — есть', () => {
		expect(new TDrawer().backdropDataset).toEqual({
			'data-open': 'false',
			'data-contained': 'false',
		})
	})

	it('показанная — тот же номер слоя, что у панели, и её открытость', () => {
		const drawer = new TDrawer({ contained: true })

		drawer.show()

		expect(drawer.backdropDataset).toEqual({
			[FRAME_LAYER_ATTRIBUTE]: String(drawer.zIndex),
			'data-open': 'true',
			'data-contained': 'true',
		})
	})

	it('новый объект на каждое чтение, а не ручка на состояние', () => {
		const drawer = new TDrawer()

		expect(drawer.backdropDataset).not.toBe(drawer.backdropDataset)
	})
})

describe('внутри контейнера', () => {
	it('data-contained — false и true, change:contained только на смену', () => {
		const drawer = new TDrawer()
		const changes: boolean[] = []

		drawer.events.on('change:contained', (value) => changes.push(value))

		expect(drawer.dataset.get('contained')).toBe('false')

		drawer.contained = true
		drawer.contained = true

		expect(drawer.dataset.get('contained')).toBe('true')
		expect(changes).toEqual([true])
	})

	/**
	 * По `locksScroll` `TScrollLockPlugin` держит замок документа: внутри
	 * контейнера страница за панелью остаётся той, что была.
	 */
	it('locksScroll — открыта и не contained', () => {
		const drawer = new TDrawer()

		expect(drawer.locksScroll).toBe(false)

		drawer.show()

		expect(drawer.locksScroll).toBe(true)

		drawer.contained = true

		expect(drawer.locksScroll).toBe(false)
	})

	it('change:locksScroll — только когда значение правда сменилось', () => {
		const drawer = new TDrawer({ contained: true })
		const changes: boolean[] = []

		drawer.events.on('change:locksScroll', (value) => changes.push(value))

		// Внутри контейнера открытие замка не меняет
		drawer.show()
		drawer.hide()

		expect(changes).toEqual([])

		drawer.contained = false
		drawer.show()
		drawer.contained = true
		drawer.contained = false
		drawer.hide()

		expect(changes).toEqual([true, false, true, false])
	})
})

describe('жест', () => {
	it('полосу рисуют, пока жест включён', () => {
		const drawer = new TDrawer()

		expect(drawer.handleRendered).toBe(false)

		drawer.swipe = 'handle'

		expect(drawer.handleRendered).toBe(true)

		drawer.swipe = 'panel'

		expect(drawer.handleRendered).toBe(true)
	})

	it('change:swipe — только на смену', () => {
		const drawer = new TDrawer()
		const changes: string[] = []

		drawer.events.on('change:swipe', (value) => changes.push(value))

		drawer.swipe = 'panel'
		drawer.swipe = 'panel'

		expect(changes).toEqual(['panel'])
	})

	it('beginSwipe: data-swiping и change:swiping, endSwipe — назад', () => {
		const drawer = shown({ swipe: 'handle' })
		const changes: boolean[] = []

		drawer.events.on('change:swiping', (value) => changes.push(value))

		expect(drawer.dataset.get('swiping')).toBe('false')
		expect(drawer.beginSwipe()).toBe(true)
		expect(drawer.swiping).toBe(true)
		expect(drawer.dataset.get('swiping')).toBe('true')

		drawer.endSwipe()

		expect(drawer.swiping).toBe(false)
		expect(drawer.dataset.get('swiping')).toBe('false')
		expect(changes).toEqual([true, false])
	})

	it('без жеста и у скрытой панели жест не начинается', () => {
		expect(shown().beginSwipe()).toBe(false)
		expect(new TDrawer({ swipe: 'panel' }).beginSwipe()).toBe(false)
	})

	it('скрытие и выключенный жест кончают начатый жест', () => {
		const hidden = shown({ swipe: 'panel' })

		hidden.beginSwipe()
		hidden.hide()

		expect(hidden.swiping).toBe(false)

		const switched = shown({ swipe: 'panel' })

		switched.beginSwipe()
		switched.swipe = 'none'

		expect(switched.swiping).toBe(false)
		expect(switched.dataset.get('swiping')).toBe('false')
	})
})

describe('запрос закрытия', () => {
	it('жест — причина swipe, через close:before', () => {
		const drawer = shown({ swipe: 'handle' })
		const reasons: TCloseReason[] = []

		drawer.events.on('close:before', (event) => reasons.push(event.reason))
		drawer.requestClose('swipe')

		expect(reasons).toEqual(['swipe'])
		expect(drawer.visible).toBe(false)
	})

	it('отмена close:before оставляет панель открытой', () => {
		const drawer = shown({ swipe: 'handle' })

		drawer.events.on('close:before', (event) => event.preventDefault())
		drawer.requestClose('swipe')

		expect(drawer.visible).toBe(true)
	})

	/**
	 * `dismissible: false` отклоняет то, что пользователь мог сделать
	 * случайно, — нажатие мимо и Escape. Жест он включает сам.
	 */
	it('dismissible: false — нажатие мимо и Escape отклонены без события, жест и кнопка — нет', () => {
		const drawer = shown({ dismissible: false, swipe: 'panel' })
		const handler = vi.fn()

		drawer.events.on('close:before', handler)

		drawer.requestClose('outside')
		drawer.requestClose('escape')

		expect(handler).not.toHaveBeenCalled()
		expect(drawer.visible).toBe(true)

		drawer.requestClose('swipe')

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(TCloseEvent)
		expect(drawer.visible).toBe(false)
	})

	it('запись visible = false — не запрос: close:before не приходит', () => {
		const drawer = shown()
		const handler = vi.fn()

		drawer.events.on('close:before', handler)
		drawer.visible = false

		expect(handler).not.toHaveBeenCalled()
	})
})
